<?php

namespace App\Http\Controllers;

use App\Models\EnvAsset;
use App\Models\EnvPmRecord;
use App\Models\EnvPmSchedule;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;

class EnvPmController extends Controller
{
    public function index()
    {
        // Get assets with schedules due soon (e.g., within next 30 days or overdue)
        $dueSchedules = EnvPmSchedule::with('asset')
            ->where('next_pm_date', '<=', Carbon::now()->addDays(30))
            ->orderBy('next_pm_date')
            ->get();

        $history = EnvPmRecord::with('asset')
            ->orderBy('performed_at', 'desc')
            ->limit(50)
            ->get();

        return Inertia::render('Env/PM/Index', [
            'dueSchedules' => $dueSchedules,
            'history' => $history,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'asset_id' => 'required|exists:env_assets,id',
            'schedule_id' => 'required|exists:env_pm_schedules,id',
            'performed_by' => 'required|string',
            'result' => 'required|in:Pass,Fail',
            'findings' => 'nullable|string',
            'performed_at' => 'required|date',
        ]);

        // 1. Create Record
        EnvPmRecord::create($validated);

        // 2. Update Schedule (Calculate next due date)
        $schedule = EnvPmSchedule::find($request->schedule_id);
        $schedule->last_pm_date = $request->performed_at;
        
        if ($request->result === 'Pass') {
            // Calculate next date based on frequency
            $nextDate = Carbon::parse($request->performed_at);
            if ($schedule->frequency_type === 'month') {
                $nextDate->addMonths($schedule->frequency_value);
            } else {
                $nextDate->addYears($schedule->frequency_value);
            }
            $schedule->next_pm_date = $nextDate;
            
            // Update Asset Status
            $asset = EnvAsset::find($request->asset_id);
            $asset->update(['status' => 'Active']);
        } else {
            // If failed, maybe set status to Maintenance?
            $asset = EnvAsset::find($request->asset_id);
            $asset->update(['status' => 'Maintenance']);
        }
        
        $schedule->save();

        return redirect()->back()->with('success', 'PM Record saved successfully.');
    }
}
