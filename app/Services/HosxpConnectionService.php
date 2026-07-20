<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\HosxpConnectionAlertNotification;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class HosxpConnectionService
{
    public const CACHE_KEY = 'hosxp.connection.status';

    public const ALERT_COOLDOWN_KEY = 'hosxp.connection.alert_sent';

    /** @return array{connected: bool, database: ?string, message: string, checked_at: ?string, response_ms: ?int} */
    public function check(bool $notifyOnFailure = false): array
    {
        $started = microtime(true);
        $previous = $this->getCachedStatus();

        try {
            if (! config('database.connections.hosxp')) {
                throw new \RuntimeException('ยังไม่ได้ตั้งค่าการเชื่อมต่อ HOSxP');
            }

            $conn = DB::connection('hosxp');
            $conn->getPdo();
            $conn->select('SELECT 1');

            $status = [
                'connected' => true,
                'database' => $conn->getDatabaseName(),
                'message' => 'เชื่อมต่อฐานข้อมูล HOSxP สำเร็จ',
                'checked_at' => now()->toDateTimeString(),
                'response_ms' => (int) round((microtime(true) - $started) * 1000),
            ];
        } catch (\Throwable $e) {
            Log::warning('HOSxP health check failed: '.$e->getMessage());

            $status = [
                'connected' => false,
                'database' => null,
                'message' => 'ไม่สามารถเชื่อมต่อ HOSxP: '.$e->getMessage(),
                'checked_at' => now()->toDateTimeString(),
                'response_ms' => (int) round((microtime(true) - $started) * 1000),
            ];

            if ($notifyOnFailure && ($previous['connected'] ?? true) && ! Cache::has(self::ALERT_COOLDOWN_KEY)) {
                $this->notifyAdmins($status['message']);
                Cache::put(self::ALERT_COOLDOWN_KEY, true, now()->addHours(6));
            }
        }

        if ($status['connected']) {
            Cache::forget(self::ALERT_COOLDOWN_KEY);
        }

        Cache::put(self::CACHE_KEY, $status, now()->addMinutes(30));

        return $status;
    }

    /** @return array{connected: bool, database: ?string, message: string, checked_at: ?string, response_ms: ?int} */
    public function getCachedStatus(): array
    {
        return Cache::get(self::CACHE_KEY, [
            'connected' => true,
            'database' => null,
            'message' => 'ยังไม่ได้ตรวจสอบการเชื่อมต่อ',
            'checked_at' => null,
            'response_ms' => null,
        ]);
    }

    private function notifyAdmins(string $message): void
    {
        $admins = User::role(['admin', 'Admin'])->get();
        if ($admins->isEmpty()) {
            return;
        }

        Notification::send($admins, new HosxpConnectionAlertNotification($message));
    }
}
