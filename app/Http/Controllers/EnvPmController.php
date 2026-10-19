<?php

namespace App\Http\Controllers;

use App\Models\EnvPmRecord;
use App\Models\EnvPmSchedule;
use App\Models\EnvPmSetting;
use App\Models\EnvPmWorkOrder;
use App\Models\EnvAsset;
use App\Services\Env\PmKpiService;
use App\Services\Env\PmWorkOrderService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EnvPmController extends Controller
{
    public function index(Request $request, PmKpiService $kpi)
    {
        $year = (int) $request->input('year', now()->year);
        $month = $request->filled('month') ? (int) $request->input('month') : null;

        $upcoming = EnvPmWorkOrder::query()
            ->with('asset:id,name,location,issue_location,risk_level,stock_number')
            ->whereIn('status', EnvPmWorkOrder::OPEN_STATUSES)
            ->whereDate('due_date', '<=', now()->addDays(30)->toDateString())
            ->orderBy('due_date')
            ->limit(40)
            ->get();

        $history = EnvPmRecord::query()
            ->with('asset:id,name')
            ->orderByDesc('performed_at')
            ->limit(20)
            ->get();

        return Inertia::render('Env/PM/Index', [
            'kpi' => $kpi->summarize($year, $month),
            'filters' => ['year' => $year, 'month' => $month],
            'years' => range(now()->year - 2, now()->year + 1),
            'upcoming' => $upcoming,
            'history' => $history,
            'laborRate' => EnvPmSetting::getValue('labor_rate_per_hour', '0'),
        ]);
    }

    public function calendar(Request $request)
    {
        $month = (string) $request->input('month', now()->format('Y-m'));
        try {
            $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        } catch (\Throwable) {
            $start = now()->startOfMonth();
        }

        $orders = EnvPmWorkOrder::query()
            ->with('asset:id,name,risk_level')
            ->where('status', '!=', 'cancelled')
            ->whereBetween('due_date', [$start->toDateString(), $start->copy()->endOfMonth()->toDateString()])
            ->orderBy('due_date')
            ->get();

        return Inertia::render('Env/PM/Calendar', [
            'month' => $start->format('Y-m'),
            'orders' => $orders,
        ]);
    }

    public function updateSettings(Request $request)
    {
        $data = $request->validate([
            'labor_rate_per_hour' => 'required|numeric|min:0',
        ]);

        EnvPmSetting::putValue('labor_rate_per_hour', (string) $data['labor_rate_per_hour']);

        return back()->with('success', 'บันทึกอัตราค่าแรงแล้ว');
    }

    public function generate(PmWorkOrderService $workOrders)
    {
        $created = $workOrders->generateDue();
        $alerted = $workOrders->alertOpenWorkOrders();

        if ($created === 0) {
            return back()->with('error', 'ยังไม่มีแผนที่ถึงรอบ กดสร้างใบงานแล้วเลือกเครื่องเพื่อเปิดใบงานได้ทันที');
        }

        return back()->with('success', "สร้างใบงาน {$created} รายการ และแจ้งเตือน {$alerted} รายการ");
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

        EnvPmRecord::create($validated);

        $schedule = EnvPmSchedule::find($request->schedule_id);
        if ($request->result === 'Pass') {
            $schedule->advanceAfter(Carbon::parse($request->performed_at));
            EnvAsset::find($request->asset_id)?->update([
                'status' => EnvAsset::operationalStatusForRegistry('normal'),
                'registry_status' => 'normal',
            ]);
        } else {
            $schedule->last_pm_date = $request->performed_at;
            $schedule->save();
            EnvAsset::find($request->asset_id)?->update([
                'status' => EnvAsset::operationalStatusForRegistry('repair'),
                'registry_status' => 'repair',
            ]);
        }

        return redirect()->back()->with('success', 'PM Record saved successfully.');
    }
}
