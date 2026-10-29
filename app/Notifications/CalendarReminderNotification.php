<?php

namespace App\Notifications;

use App\Models\CalendarEvent;
use App\Models\CalendarReminder;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class CalendarReminderNotification extends Notification
{
    use Queueable;

    // Set to false here because CalendarNotificationService handles S-Chat card dispatch explicitly
    public bool $forwardToFshhChat = false;

    public function __construct(
        public readonly CalendarEvent $event,
        public readonly CalendarReminder $reminder
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $thaiYear = $this->event->start_time->year + 543;
        $timeStr = $this->event->is_all_day
            ? $this->event->start_time->format('d/m/') . $thaiYear . ' (ทั้งวัน)'
            : $this->event->start_time->format('d/m/') . $thaiYear . ' ' . $this->event->start_time->format('H:i');

        return [
            'type' => 'calendar_reminder',
            'title' => 'เตือนกำหนดการ: ' . $this->event->title,
            'message' => 'กำหนดการ: ' . $timeStr . ($this->event->location ? ' ที่ ' . $this->event->location : ''),
            'event_id' => $this->event->id,
            'scope' => $this->event->scope,
            'color' => $this->event->color,
            'priority' => $this->event->priority,
            'url' => '/calendar',
        ];
    }
}
