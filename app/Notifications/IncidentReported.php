<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

use App\Models\EnvIncident;

class IncidentReported extends Notification
{
    use Queueable;

    public $incident;

    /**
     * Create a new notification instance.
     */
    public function __construct(EnvIncident $incident)
    {
        $this->incident = $incident;
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
        return [
            'title' => 'มีการแจ้งอุบัติการณ์ความปลอดภัยใหม่',
            'message' => "มีการแจ้งอุบัติการณ์ระดับ {$this->incident->severity} ({$this->incident->incident_type}) ที่ {$this->incident->location}",
            'incident_id' => $this->incident->id,
            'link' => route('env.incidents.index'),
        ];
    }
}
