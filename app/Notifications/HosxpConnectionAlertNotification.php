<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class HosxpConnectionAlertNotification extends Notification
{
    use Queueable;

    public function __construct(private string $detail) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'hosxp_connection',
            'title' => 'HOSxP ขาดการเชื่อมต่อ',
            'message' => $this->detail,
            'url' => route('setting.database'),
            'urgent' => true,
        ];
    }
}
