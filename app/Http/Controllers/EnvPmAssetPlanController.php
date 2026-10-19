<?php

namespace App\Http\Controllers;

use App\Models\EnvAsset;
use App\Models\EnvPmSchedule;
use App\Models\EnvPmStandard;
use App\Models\EnvPmWorkOrder;
use App\Services\Env\PmWorkOrderService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EnvPmAssetPlanController extends Controller
{
    public function show(EnvAsset $asset)
    {
        $asset->load([
            'line:id,code,name',
            'schedules.standard.tasks',
            'schedules.standard.parts.sparePart',
            'schedules.meterReadings' => fn ($query) => $query->latest('read_at')->limit(8),
        ]);

        return Inertia::render('Env/PM/AssetPlan', [
            'asset' => [
                'id' => $asset->id,
                'name' => $asset->name,
                'brand' => $asset->brand,
                'model' => $asset->model,
                'serial_number' => $asset->serial_number,
                'stock_number' => $asset->stock_number,
                'control_number' => $asset->control_number,
                'location' => $asset->location,
                'issue_location' => $asset->issue_location,
                'owner' => $asset->owner,
                'line' => $asset->line?->name,
                'risk_level' => $asset->risk_level ?: 'N',
                'risk_label' => EnvAsset::RISK_LEVELS[$asset->risk_level] ?? 'ไม่ระบุ',
                'criticality' => match ($asset->risk_level) {
                    'A' => 'High',
                    'B' => 'Medium',
                    'C' => 'Low',
                    default => null,
                },
                'install_date' => optional($asset->install_date)->format('Y-m-d'),
                'annual_pm_budget' => $asset->annual_pm_budget,
                'purchase_date' => optional($asset->purchase_date)->format('Y-m-d'),
            ],
            'schedules' => $asset->schedules,
            'standards' => EnvPmStandard::query()->where('is_active', true)->orderBy('name')->get(),
            'openOrders' => EnvPmWorkOrder::query()
                ->where('asset_id', $asset->id)
                ->whereIn('status', EnvPmWorkOrder::OPEN_STATUSES)
                ->orderBy('due_date')
                ->get(['id', 'wo_number', 'status', 'due_date', 'schedule_id']),
        ]);
    }

    public function update(Request $request, EnvAsset $asset)
    {
        $data = $request->validate([
            'install_date' => 'nullable|date',
            'annual_pm_budget' => 'nullable|numeric|min:0',
        ]);

        $asset->update([
            'install_date' => $data['install_date'] ?? null,
            'annual_pm_budget' => $data['annual_pm_budget'] ?? null,
        ]);

        return back()->with('success', 'อัปเดตข้อมูลเครื่องแล้ว');
    }

    public function storeSchedule(Request $request, EnvAsset $asset, PmWorkOrderService $service)
    {
        $data = $request->validate([
            'standard_id' => 'required|exists:env_pm_standards,id',
            'next_pm_date' => 'nullable|date',
        ]);

        $standard = EnvPmStandard::findOrFail($data['standard_id']);
        $service->assignStandard($asset, $standard, $data['next_pm_date'] ?? null);

        return back()->with('success', 'ผูกแผนมาตรฐานกับเครื่องแล้ว');
    }

    public function destroySchedule(EnvAsset $asset, EnvPmSchedule $schedule)
    {
        if ((int) $schedule->asset_id !== (int) $asset->id) {
            abort(404);
        }

        $open = $schedule->workOrders()->whereIn('status', EnvPmWorkOrder::OPEN_STATUSES)->exists();
        if ($open) {
            return back()->with('error', 'ยังมีใบงานที่เปิดอยู่ของแผนนี้');
        }

        $schedule->delete();

        return back()->with('success', 'นำแผนออกจากเครื่องแล้ว');
    }

    public function meter(Request $request, EnvAsset $asset, PmWorkOrderService $service)
    {
        $data = $request->validate([
            'schedule_id' => 'required|exists:env_pm_schedules,id',
            'reading' => 'required|numeric|min:0',
            'read_at' => 'required|date',
            'note' => 'nullable|string|max:500',
        ]);

        $schedule = EnvPmSchedule::query()
            ->where('asset_id', $asset->id)
            ->whereKey($data['schedule_id'])
            ->firstOrFail();

        if ($schedule->basis !== 'meter') {
            return back()->with('error', 'แผนนี้ไม่ได้คิดตามชั่วโมงทำงาน');
        }

        $service->recordMeter($schedule, (float) $data['reading'], Carbon::parse($data['read_at']), $data['note'] ?? null);

        return back()->with('success', 'บันทึกมิเตอร์แล้ว');
    }
}
