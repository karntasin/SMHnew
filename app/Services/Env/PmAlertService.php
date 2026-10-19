<?php

namespace App\Services\Env;

use App\Models\EnvPmWorkOrder;
use App\Models\User;
use App\Notifications\PmScheduleNotification;

class PmAlertService
{
    public function notify(EnvPmWorkOrder $workOrder, string $kind): void
    {
        $workOrder->loadMissing(['asset', 'assigneeUsers']);

        $recipients = $workOrder->assigneeUsers;
        $heads = User::query()
            ->whereHas('roles', fn ($query) => $query->where('name', 'headtec'))
            ->get();

        $recipients = $recipients->concat($heads)->unique('id');

        foreach ($recipients as $user) {
            $user->notify(new PmScheduleNotification($workOrder, $kind));
        }

        $workOrder->update(['last_alert_on' => now()->toDateString()]);
    }
}
