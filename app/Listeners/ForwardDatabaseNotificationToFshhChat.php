<?php

namespace App\Listeners;

use App\Models\User;
use App\Services\FshhChat\FshhChatSyncService;
use Illuminate\Notifications\Events\NotificationSent;

class ForwardDatabaseNotificationToFshhChat
{
    public function __construct(
        protected readonly FshhChatSyncService $sync,
    ) {}

    public function handle(NotificationSent $event): void
    {
        if ($event->channel !== 'database') {
            return;
        }
        $notification = $event->notification;
        if (property_exists($notification, 'forwardToFshhChat') && $notification->forwardToFshhChat === false) {
            return;
        }
        $notifiable = $event->notifiable;
        if (! $notifiable instanceof User) {
            return;
        }

        $data = [];
        if (method_exists($event->notification, 'toArray')) {
            $data = $event->notification->toArray($notifiable);
        }
        if (! is_array($data) || $data === []) {
            return;
        }

        $this->sync->notifyUser($notifiable, $data);
    }
}
