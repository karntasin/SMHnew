<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\MaintenanceRequest;

class MaintenanceRequestNotification extends Notification
{
    use Queueable;

    protected $maintenanceRequest;
    protected $action;

    /**
     * Create a new notification instance.
     */
    public function __construct(MaintenanceRequest $maintenanceRequest, string $action = 'created', public bool $forwardToFshhChat = true)
    {
        $this->maintenanceRequest = $maintenanceRequest;
        $this->action = $action;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $messages = [
            'created' => 'มีการแจ้งซ่อมใหม่',
            'assigned' => 'คุณได้รับมอบหมายงานซ่อม',
            'in_progress' => 'เริ่มดำเนินการซ่อม',
            'completed' => 'งานซ่อมเสร็จสิ้น',
            'cancelled' => 'งานซ่อมถูกยกเลิก',
        ];

        $categoryName = $this->maintenanceRequest->category->name ?? 'ไม่ระบุ';
        
        return [
            'title' => $messages[$this->action] ?? 'การแจ้งซ่อม',
            'message' => sprintf(
                '%s: %s (%s) - สถานที่: %s',
                $this->maintenanceRequest->ticket_number,
                $this->maintenanceRequest->title,
                $categoryName,
                $this->maintenanceRequest->location
            ),
            'action_url' => route('maintenance.requests.show', $this->maintenanceRequest->id),
            'type' => 'maintenance',
            'maintenance_request_id' => $this->maintenanceRequest->id,
            'ticket_number' => $this->maintenanceRequest->ticket_number,
            'category' => $categoryName,
            'priority' => $this->action === 'created' ? 'high' : 'normal',
        ];
    }
}
