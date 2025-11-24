<?php

namespace App\Http\Controllers;

use App\Models\EnvUtilitySystem;
use App\Models\EnvUtilityChecklist;
use App\Models\EnvUtilityCheck;
use App\Models\EnvUtilityCheckItem;
use App\Models\EnvIncident;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class EnvUtilityController extends Controller
{
    public function index()
    {
        $systems = EnvUtilitySystem::with(['checklists', 'latestCheck.inspector'])->get();
        
        return Inertia::render('Env/Utility/Index', [
            'systems' => $systems,
        ]);
    }

    public function storeSystem(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'description' => 'nullable|string',
        ]);

        EnvUtilitySystem::create($validated);

        return redirect()->back()->with('success', 'เพิ่มระบบสาธารณูปโภคเรียบร้อยแล้ว');
    }

    public function storeChecklist(Request $request)
    {
        $validated = $request->validate([
            'system_id' => 'required|exists:env_utility_systems,id',
            'item_name' => 'required|string',
            'frequency' => 'required|in:daily,weekly,monthly',
            'min_value' => 'nullable|numeric',
            'max_value' => 'nullable|numeric',
            'unit' => 'nullable|string',
        ]);

        EnvUtilityChecklist::create($validated);

        return redirect()->back()->with('success', 'เพิ่มรายการตรวจสอบเรียบร้อยแล้ว');
    }

    public function storeCheck(Request $request)
    {
        $validated = $request->validate([
            'system_id' => 'required|exists:env_utility_systems,id',
            'check_date' => 'required|date',
            'items' => 'required|array',
            'items.*.checklist_id' => 'required|exists:env_utility_checklists,id',
            'items.*.status' => 'required|in:pass,fail',
            'items.*.value' => 'nullable|numeric',
            'items.*.notes' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        DB::transaction(function () use ($request, $validated) {
            $overallStatus = 'pass';
            $failedItems = [];

            foreach ($request->items as $item) {
                if ($item['status'] === 'fail') {
                    $overallStatus = 'fail';
                    $checklist = EnvUtilityChecklist::find($item['checklist_id']);
                    $failedItems[] = $checklist->item_name . ($item['notes'] ? " ({$item['notes']})" : "");
                }
            }

            $check = EnvUtilityCheck::create([
                'system_id' => $request->system_id,
                'inspector_id' => Auth::id(),
                'check_date' => $request->check_date,
                'status' => $overallStatus,
                'notes' => $request->notes,
            ]);

            foreach ($request->items as $item) {
                EnvUtilityCheckItem::create([
                    'check_id' => $check->id,
                    'checklist_id' => $item['checklist_id'],
                    'status' => $item['status'],
                    'value' => $item['value'] ?? null,
                    'notes' => $item['notes'] ?? null,
                ]);
            }

            // Update System Status
            $system = EnvUtilitySystem::find($request->system_id);
            $system->update(['status' => $overallStatus === 'pass' ? 'normal' : 'critical']);

            // Auto-create Incident if failed
            if ($overallStatus === 'fail') {
                EnvIncident::create([
                    'reporter_id' => Auth::id(),
                    'incident_type' => 'Utility Failure',
                    'location' => $system->name,
                    'severity' => 'high',
                    'description' => "Utility Check Failed for {$system->name}. Failed items: " . implode(', ', $failedItems),
                    'status' => 'reported',
                ]);
            }
        });

        return redirect()->back()->with('success', 'บันทึกผลการตรวจสอบเรียบร้อยแล้ว');
    }
}
