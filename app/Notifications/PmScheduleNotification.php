<?php

namespace App\Notifications;

use App\Models\EnvPmWorkOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class PmScheduleNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected EnvPmWorkOrder $workOrder,
        protected string $kind = 'upcoming',
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $assetName = $this->workOrder->asset?->name ?: 'ครุภัณฑ์';
        $due = optional($this->workOrder->due_date)->format('d/m/Y');
        $overdue = $this->kind === 'overdue';

        return [
            'title' => $overdue ? 'งาน PM เลยกำหนด' : 'งาน PM ใกล้ถึงกำหนด',
            'message' => sprintf(
                '%s · %s กำหนด %s',
                $this->workOrder->wo_number,
                $assetName,
                $due ?: '-'
            ),
            'action_url' => route('env.pm.work-orders.show', $this->workOrder->id),
            'type' => 'pm',
            'pm_work_order_id' => $this->workOrder->id,
            'ticket_number' => $this->workOrder->wo_number,
            'priority' => $overdue ? 'high' : 'normal',
        ];
    }
}
