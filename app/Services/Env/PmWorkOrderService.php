<?php

namespace App\Services\Env;

use App\Models\EnvAsset;
use App\Models\EnvPmMeterReading;
use App\Models\EnvPmRecord;
use App\Models\EnvPmSchedule;
use App\Models\EnvPmSetting;
use App\Models\EnvPmStandard;
use App\Models\EnvPmWorkOrder;
use App\Models\EnvPmWorkOrderAssignee;
use App\Models\EnvPmWorkOrderPart;
use App\Models\EnvPmWorkOrderTask;
use App\Models\EnvSparePart;
use App\Models\EnvSparePartMovement;
use App\Models\MaintenanceCategory;
use App\Models\MaintenancePriority;
use App\Models\MaintenanceRequest;
use App\Models\MaintenanceRequestTimeline;
use App\Models\User;
use App\Services\MaintenanceNotificationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PmWorkOrderService
{
    public const TECHNICIAN_POSITIONS = ['ช่างส่งกำลัง', 'ช่างIT', 'ช่างไฟฟ้า', 'ช่างประปา', 'ช่างทั่วไป'];

    public function __construct(private PmAlertService $alerts) {}

    /**
     * @return \Illuminate\Support\Collection<int, User>
     */
    public function technicians()
    {
        return User::query()
            ->where(function ($query) {
                $query->whereHas('positions', fn ($positions) => $positions->whereIn('name', self::TECHNICIAN_POSITIONS))
                    ->orWhereHas('roles', fn ($roles) => $roles->whereIn('name', ['technician', 'headtec']));
            })
            ->orderBy('name')
            ->get(['id', 'name']);
    }

    public function assignStandard(EnvAsset $asset, EnvPmStandard $standard, ?string $nextPmDate = null): EnvPmSchedule
    {
        [$frequencyType, $frequencyValue] = EnvPmSchedule::frequencyFromStandard($standard);
        $schedule = EnvPmSchedule::query()
            ->where('asset_id', $asset->id)
            ->where('standard_id', $standard->id)
            ->first();

        $payload = [
            'frequency_type' => $frequencyType,
            'frequency_value' => $frequencyValue,
            'basis' => $standard->basis === 'meter' ? 'meter' : 'time',
            'meter_interval' => $standard->meter_interval,
            'meter_unit' => $standard->meter_unit,
            'lead_days' => EnvPmSchedule::leadDaysForRisk($asset->risk_level),
            'checklist_template' => [],
        ];

        $existingDue = $schedule?->next_pm_date?->toDateString();
        if ($payload['basis'] === 'meter') {
            $payload['last_meter_reading'] = $schedule?->last_meter_reading ?? 0;
            $payload['next_meter_due'] = $schedule?->next_meter_due
                ?? ((float) ($standard->meter_interval ?: 0));
            $payload['next_pm_date'] = $nextPmDate ?: ($existingDue ?? now()->toDateString());
        } else {
            $payload['next_pm_date'] = $nextPmDate ?: ($existingDue ?? now()->toDateString());
        }

        if ($schedule) {
            $schedule->update($payload);

            return $schedule->fresh();
        }

        return EnvPmSchedule::create([
            'asset_id' => $asset->id,
            'standard_id' => $standard->id,
            ...$payload,
        ]);
    }

    public function generateDue(): int
    {
        $created = 0;
        $schedules = EnvPmSchedule::query()->with(['asset', 'standard.tasks'])->get();

        foreach ($schedules as $schedule) {
            if (! $this->isDue($schedule)) {
                continue;
            }

            $result = $this->createFromSchedule($schedule);
            if ($result['created']) {
                $this->alerts->notify($result['work_order'], 'upcoming');
                $created++;
            }
        }

        return $created;
    }

    public function alertOpenWorkOrders(): int
    {
        $count = 0;
        $orders = EnvPmWorkOrder::query()
            ->with(['asset', 'assigneeUsers'])
            ->whereIn('status', EnvPmWorkOrder::OPEN_STATUSES)
            ->get();

        foreach ($orders as $order) {
            if ($order->last_alert_on && $order->last_alert_on->isToday()) {
                continue;
            }

            $overdue = $order->due_date && $order->due_date->lt(now()->startOfDay());
            if (! $overdue && $order->due_date && $order->due_date->gt(now()->startOfDay()->addDays(7))) {
                continue;
            }

            $this->alerts->notify($order, $overdue ? 'overdue' : 'upcoming');
            $count++;
        }

        return $count;
    }

    /**
     * @return array{work_order: EnvPmWorkOrder, created: bool}
     */
    public function createFromSchedule(EnvPmSchedule $schedule): array
    {
        $existing = EnvPmWorkOrder::query()
            ->where('schedule_id', $schedule->id)
            ->whereIn('status', EnvPmWorkOrder::OPEN_STATUSES)
            ->first();

        if ($existing) {
            return ['work_order' => $existing, 'created' => false];
        }

        $schedule->loadMissing(['standard.tasks', 'asset']);
        $due = $schedule->basis === 'meter'
            ? now()->toDateString()
            : optional($schedule->next_pm_date)->toDateString() ?? now()->toDateString();

        $workOrder = DB::transaction(function () use ($schedule, $due) {
            $workOrder = EnvPmWorkOrder::create([
                'wo_number' => $this->nextNumber(),
                'asset_id' => $schedule->asset_id,
                'schedule_id' => $schedule->id,
                'standard_id' => $schedule->standard_id,
                'status' => 'scheduled',
                'due_date' => $due,
                'scheduled_date' => $due,
                'sop' => $schedule->standard?->sop,
                'created_by' => Auth::id(),
            ]);

            foreach ($schedule->standard?->tasks ?? [] as $task) {
                EnvPmWorkOrderTask::create([
                    'work_order_id' => $workOrder->id,
                    'standard_task_id' => $task->id,
                    'sort' => $task->sort,
                    'task_name' => $task->task_name,
                    'acceptable_criteria' => $task->acceptable_criteria,
                    'unit' => $task->unit,
                    'min_value' => $task->min_value,
                    'max_value' => $task->max_value,
                    'input_type' => $task->input_type,
                ]);
            }

            return $workOrder;
        });

        return ['work_order' => $workOrder, 'created' => true];
    }

    /**
     * Open a work order for a chosen machine even when no plan is inside the lead window.
     *
     * @return array{work_order: EnvPmWorkOrder, created: bool}
     */
    public function createManual(EnvAsset $asset, ?string $dueDate = null): array
    {
        $due = $dueDate ? Carbon::parse($dueDate)->toDateString() : now()->toDateString();

        $schedule = EnvPmSchedule::query()
            ->where('asset_id', $asset->id)
            ->where(function ($query) {
                $query->where('basis', 'time')->orWhereNull('basis');
            })
            ->orderByRaw('CASE WHEN next_pm_date IS NULL THEN 1 ELSE 0 END')
            ->orderBy('next_pm_date')
            ->first();

        if (! $schedule) {
            $schedule = EnvPmSchedule::create([
                'asset_id' => $asset->id,
                'frequency_type' => 'month',
                'frequency_value' => 1,
                'basis' => 'time',
                'lead_days' => EnvPmSchedule::leadDaysForRisk($asset->risk_level),
                'next_pm_date' => $due,
                'checklist_template' => [],
            ]);
        }

        $result = $this->createFromSchedule($schedule);
        if ($result['created']) {
            $result['work_order']->update([
                'due_date' => $due,
                'scheduled_date' => $due,
            ]);
            try {
                $this->alerts->notify($result['work_order']->fresh(), 'upcoming');
            } catch (\Throwable $exception) {
                report($exception);
            }
        }

        return $result;
    }

    public function recordMeter(EnvPmSchedule $schedule, float $reading, Carbon $readAt, ?string $note = null): EnvPmMeterReading
    {
        $row = EnvPmMeterReading::create([
            'asset_id' => $schedule->asset_id,
            'schedule_id' => $schedule->id,
            'reading' => $reading,
            'read_at' => $readAt,
            'user_id' => Auth::id(),
            'note' => $note,
        ]);

        $schedule->last_meter_reading = $reading;
        $schedule->save();

        if ($schedule->basis === 'meter' && $schedule->next_meter_due !== null && $reading >= (float) $schedule->next_meter_due) {
            $result = $this->createFromSchedule($schedule->fresh(['standard.tasks', 'asset']));
            if ($result['created']) {
                $this->alerts->notify($result['work_order'], 'upcoming');
            }
        }

        return $row;
    }

    /**
     * @param  list<int>  $userIds
     */
    public function assign(EnvPmWorkOrder $workOrder, array $userIds): void
    {
        DB::transaction(function () use ($workOrder, $userIds) {
            $workOrder->assigneeRows()->delete();
            foreach (array_values(array_unique($userIds)) as $index => $userId) {
                EnvPmWorkOrderAssignee::create([
                    'work_order_id' => $workOrder->id,
                    'user_id' => $userId,
                    'is_lead' => $index === 0,
                ]);
            }

            if ($workOrder->status === 'scheduled') {
                $workOrder->status = 'assigned';
                $workOrder->save();
            }
        });
    }

    public function start(EnvPmWorkOrder $workOrder): void
    {
        $workOrder->update([
            'status' => 'in_progress',
            'started_at' => $workOrder->started_at ?: now(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function complete(EnvPmWorkOrder $workOrder, array $data): EnvPmWorkOrder
    {
        $workOrder->load(['tasks', 'schedule', 'asset', 'assigneeUsers', 'standard']);

        $completed = DB::transaction(function () use ($workOrder, $data) {
            $taskFail = false;
            foreach ($data['tasks'] ?? [] as $row) {
                $task = $workOrder->tasks->firstWhere('id', (int) $row['id']);
                if (! $task) {
                    continue;
                }

                $task->measured_value = $row['measured_value'] ?? null;
                $task->note = $row['note'] ?? null;
                $task->result = $row['result'] ?? null;
                $this->applyMeasuredResult($task);
                $task->save();
                if ($task->result === 'fail') {
                    $taskFail = true;
                }
            }

            $result = ($taskFail || ($data['result'] ?? '') === 'Fail') ? 'Fail' : 'Pass';
            $performedAt = Carbon::parse($data['performed_at']);
            $minutes = (int) ($data['labor_minutes'] ?? $workOrder->standard?->estimated_labor_minutes ?? 0);
            $rate = (float) EnvPmSetting::getValue('labor_rate_per_hour', '0');
            $belowMin = $this->issueParts($workOrder, $data['parts'] ?? []);

            $names = $workOrder->assigneeUsers->pluck('name')->filter()->implode(', ');
            $record = EnvPmRecord::create([
                'asset_id' => $workOrder->asset_id,
                'schedule_id' => $workOrder->schedule_id,
                'work_order_id' => $workOrder->id,
                'performed_by' => $names !== '' ? $names : (Auth::user()->name ?? 'ไม่ระบุ'),
                'result' => $result,
                'findings' => $data['findings'] ?? null,
                'data_values' => $workOrder->tasks()->get()->map(fn (EnvPmWorkOrderTask $task) => [
                    'task' => $task->task_name,
                    'result' => $task->result,
                    'measured_value' => $task->measured_value,
                    'note' => $task->note,
                ])->all(),
                'performed_at' => $performedAt,
            ]);

            if ($workOrder->schedule) {
                $meter = isset($data['meter_reading']) && $data['meter_reading'] !== '' && $data['meter_reading'] !== null
                    ? (float) $data['meter_reading']
                    : null;
                $workOrder->schedule->advanceAfter($performedAt, $meter);
            }

            $asset = $workOrder->asset;
            if ($asset) {
                $registry = $result === 'Fail' ? 'repair' : 'normal';
                $asset->update([
                    'status' => EnvAsset::operationalStatusForRegistry($registry),
                    'registry_status' => $registry,
                ]);
            }

            $correctiveId = null;
            if ($result === 'Fail') {
                $correctiveId = $this->openCorrective($workOrder, $data, $performedAt)->id;
            }

            $workOrder->update([
                'status' => 'completed',
                'result' => $result,
                'findings' => $data['findings'] ?? null,
                'labor_minutes' => $minutes,
                'labor_cost' => round($minutes / 60 * $rate, 2),
                'performed_at' => $performedAt,
                'started_at' => $workOrder->started_at ?: $performedAt,
                'completed_at' => now(),
                'record_id' => $record->id,
                'corrective_request_id' => $correctiveId,
                'below_min_stock' => $belowMin,
            ]);

            return $workOrder->fresh(['correctiveRequest']);
        });

        if ($completed->correctiveRequest) {
            app(MaintenanceNotificationService::class)->notifyTechnicians($completed->correctiveRequest, 'created');
        }

        return $completed;
    }

    public function cancel(EnvPmWorkOrder $workOrder): void
    {
        $workOrder->update(['status' => 'cancelled']);
    }

    private function isDue(EnvPmSchedule $schedule): bool
    {
        if ($schedule->basis === 'meter') {
            if ($schedule->next_meter_due === null || $schedule->last_meter_reading === null) {
                return false;
            }

            return (float) $schedule->last_meter_reading >= (float) $schedule->next_meter_due;
        }

        if (! $schedule->next_pm_date) {
            return false;
        }

        $lead = $schedule->lead_days ?? EnvPmSchedule::leadDaysForRisk($schedule->asset?->risk_level);

        return $schedule->next_pm_date->lte(now()->startOfDay()->addDays($lead));
    }

    private function nextNumber(): string
    {
        $prefix = 'PM-'.now()->format('Ymd').'-';
        $last = EnvPmWorkOrder::query()
            ->where('wo_number', 'like', $prefix.'%')
            ->orderByDesc('wo_number')
            ->lockForUpdate()
            ->value('wo_number');
        $sequence = $last ? ((int) substr($last, -4)) + 1 : 1;

        return $prefix.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);
    }

    private function applyMeasuredResult(EnvPmWorkOrderTask $task): void
    {
        if ($task->input_type !== 'number' || $task->measured_value === null || $task->measured_value === '') {
            return;
        }
        if ($task->min_value === null && $task->max_value === null) {
            return;
        }
        if (! is_numeric($task->measured_value)) {
            $task->result = 'fail';

            return;
        }

        $value = (float) $task->measured_value;
        $ok = ($task->min_value === null || $value >= (float) $task->min_value)
            && ($task->max_value === null || $value <= (float) $task->max_value);
        $task->result = $ok ? 'pass' : 'fail';
    }

    /**
     * @param  list<array{spare_part_id: int, qty: float|int|string}>  $lines
     */
    private function issueParts(EnvPmWorkOrder $workOrder, array $lines): bool
    {
        $below = false;
        foreach ($lines as $line) {
            $qty = (float) ($line['qty'] ?? 0);
            if ($qty <= 0) {
                continue;
            }

            $part = EnvSparePart::query()->lockForUpdate()->find($line['spare_part_id']);
            if (! $part) {
                continue;
            }

            $part->on_hand = round((float) $part->on_hand - $qty, 3);
            $part->save();
            if ($part->isBelowMinimum()) {
                $below = true;
            }

            EnvSparePartMovement::create([
                'spare_part_id' => $part->id,
                'type' => 'out',
                'qty' => $qty,
                'balance_after' => $part->on_hand,
                'work_order_id' => $workOrder->id,
                'note' => 'เบิกใช้ใน '.$workOrder->wo_number,
                'user_id' => Auth::id(),
            ]);

            EnvPmWorkOrderPart::create([
                'work_order_id' => $workOrder->id,
                'spare_part_id' => $part->id,
                'qty' => $qty,
                'unit_cost' => $part->unit_cost,
            ]);
        }

        return $below;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function openCorrective(EnvPmWorkOrder $workOrder, array $data, Carbon $performedAt): MaintenanceRequest
    {
        $category = MaintenanceCategory::query()->where('is_active', true)->orderBy('order')->first();
        if (! $category) {
            $category = MaintenanceCategory::query()->create([
                'name' => 'ซ่อมบำรุงจาก PM',
                'is_active' => true,
                'order' => 0,
            ]);
        }

        $priorityId = $data['priority_id'] ?? null;
        if (! $priorityId) {
            $priorityId = MaintenancePriority::query()->where('is_active', true)->orderBy('level')->value('id');
        }

        $failed = $workOrder->tasks()->where('result', 'fail')->pluck('task_name')->all();
        $asset = $workOrder->asset;
        $description = trim(implode("\n", array_filter([
            'เปิดจากใบ PM '.$workOrder->wo_number,
            $data['findings'] ?? null,
            $failed ? 'รายการที่ไม่ผ่าน: '.implode(', ', $failed) : null,
        ])));

        $date = now()->format('Ymd');
        $lastTicket = MaintenanceRequest::query()
            ->where('ticket_number', 'like', "MR-$date-%")
            ->orderByDesc('ticket_number')
            ->lockForUpdate()
            ->value('ticket_number');
        $sequence = $lastTicket ? ((int) substr($lastTicket, -4)) + 1 : 1;
        $ticketNumber = 'MR-'.$date.'-'.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);

        $request = MaintenanceRequest::create([
            'ticket_number' => $ticketNumber,
            'user_id' => Auth::id(),
            'category_id' => $category->id,
            'priority_id' => $priorityId,
            'title' => 'PM ไม่ผ่าน: '.($asset?->name ?: $workOrder->wo_number),
            'description' => $description !== '' ? $description : 'ตรวจพบความผิดปกติระหว่างทำ PM',
            'location' => $asset?->issue_location ?: $asset?->location ?: 'ไม่ระบุ',
            'status' => 'pending',
            'env_asset_id' => $workOrder->asset_id,
            'pm_work_order_id' => $workOrder->id,
        ]);

        MaintenanceRequestTimeline::create([
            'maintenance_request_id' => $request->id,
            'user_id' => Auth::id(),
            'action' => 'created',
            'description' => 'เปิดใบแจ้งซ่อมจาก '.$workOrder->wo_number.' เมื่อ '.$performedAt->format('d/m/Y'),
        ]);

        return $request;
    }
}
