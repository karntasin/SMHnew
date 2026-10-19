<?php

namespace App\Services;

use App\Models\QueuePortalSubscription;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class QueuePortalPushService
{
    /**
     * @return array{soon: int, called: int, removed: int, skipped: bool}
     */
    public function notifyDue(): array
    {
        $public = config('queue_portal.vapid_public');
        $private = config('queue_portal.vapid_private');
        if (! is_string($public) || $public === '' || ! is_string($private) || $private === '') {
            return ['soon' => 0, 'called' => 0, 'removed' => 0, 'skipped' => true];
        }

        $today = now('Asia/Bangkok')->toDateString();
        QueuePortalSubscription::query()->whereDate('visit_date', '<', $today)->delete();

        $subscriptions = QueuePortalSubscription::query()->whereDate('visit_date', $today)->get();
        if ($subscriptions->isEmpty()) {
            return ['soon' => 0, 'called' => 0, 'removed' => 0, 'skipped' => false];
        }

        $portal = app(QueuePortalService::class);
        $aheadLimit = (int) config('queue_portal.notify_ahead', 3);
        $webPush = new WebPush([
            'VAPID' => [
                'subject' => (string) config('queue_portal.vapid_subject'),
                'publicKey' => $public,
                'privateKey' => $private,
            ],
        ]);

        $pending = [];
        foreach ($subscriptions as $subscription) {
            try {
                $status = $portal->statusForQueue($subscription->oqueue);
            } catch (\Throwable $e) {
                Log::warning('queue-portal notify lookup failed', ['oqueue' => $subscription->oqueue, 'error' => $e->getMessage()]);
                continue;
            }

            if ($status === null) {
                continue;
            }

            $event = $this->eventFor($subscription, $status, $aheadLimit);
            if ($event === null) {
                continue;
            }

            $payload = json_encode([
                'title' => 'คิว '.$status['oqueue'],
                'body' => $this->body($event, $status),
                'url' => url('/queue/'.$status['oqueue']),
                'tag' => 'queue-'.$status['oqueue'].'-'.$event,
            ], JSON_UNESCAPED_UNICODE);

            if (! is_string($payload)) {
                continue;
            }

            $webPush->queueNotification(
                Subscription::create([
                    'endpoint' => $subscription->endpoint,
                    'keys' => [
                        'p256dh' => $subscription->p256dh,
                        'auth' => $subscription->auth_token,
                    ],
                    'contentEncoding' => 'aes128gcm',
                ]),
                $payload
            );
            $pending[$subscription->endpoint] = ['model' => $subscription, 'event' => $event];
        }

        $soon = 0;
        $called = 0;
        $removed = 0;

        foreach ($webPush->flush() as $report) {
            $endpoint = $report->getEndpoint();
            $item = $pending[$endpoint] ?? null;
            if ($item === null) {
                continue;
            }

            if ($report->isSuccess()) {
                $column = $item['event'] === 'called' ? 'notified_called_at' : 'notified_soon_at';
                $item['model']->forceFill([$column => now()])->save();
                if ($item['event'] === 'called') {
                    $called++;
                } else {
                    $soon++;
                }
                continue;
            }

            if ($report->isSubscriptionExpired()) {
                $item['model']->delete();
                $removed++;
                continue;
            }

            Log::info('queue-portal push failed', [
                'endpoint' => $endpoint,
                'reason' => $report->getReason(),
            ]);
        }

        return ['soon' => $soon, 'called' => $called, 'removed' => $removed, 'skipped' => false];
    }

    /**
     * @param  array<string, mixed>  $status
     */
    private function eventFor(QueuePortalSubscription $subscription, array $status, int $aheadLimit): ?string
    {
        if (($status['pharmacy_stage'] ?? '') === 'done') {
            return null;
        }

        $remaining = $status['remaining'] ?? null;
        $calling = (bool) ($status['is_calling'] ?? false);
        $hasRemaining = is_int($remaining) || (is_string($remaining) && is_numeric($remaining));

        if ($calling && $subscription->notified_called_at === null) {
            return 'called';
        }

        if (! $hasRemaining) {
            return null;
        }

        $remaining = (int) $remaining;

        if ($remaining === 0 && $subscription->notified_called_at === null) {
            return 'called';
        }

        if (! $calling && $remaining > 0 && $remaining <= $aheadLimit && $subscription->notified_soon_at === null && $subscription->notified_called_at === null) {
            return 'soon';
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $status
     */
    private function body(string $event, array $status): string
    {
        $place = trim((string) ($status['contact_text'] ?? ''));
        if ($place === '') {
            $place = 'ที่'.(string) ($status['room_name'] ?? 'ห้องตรวจ');
        }

        if ($event === 'called') {
            $pharmacy = (string) ($status['pharmacy_text'] ?? '');
            if (in_array($status['pharmacy_stage'] ?? '', ['prepare', 'ready'], true)) {
                return 'ถึงคิวรับยาแล้ว '.$pharmacy.' '.$place;
            }

            return 'ถึงคิวของท่านแล้ว '.$place;
        }

        return 'เหลืออีก '.(int) $status['remaining'].' คิว '.$place;
    }
}
