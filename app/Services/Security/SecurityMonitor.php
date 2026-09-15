<?php

namespace App\Services\Security;

use App\Services\FshhChat\AdminHubChatNotifier;
use App\Services\FshhChat\FshhChatSyncService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

class SecurityMonitor
{
    public function __construct(
        protected readonly FshhChatSyncService $chat,
    ) {}

    public function recordFailedLogin(string $email, string $ip): void
    {
        $this->hit('failed_login', $ip, [
            'อีเมล' => $this->redactEmail($email),
            'IP' => $ip,
        ], (int) config('security_monitor.failed_logins', 8), 'ความพยายามเข้าสู่ระบบล้มเหลวหลายครั้ง');
    }

    public function recordForbidden(string $ip, string $path, ?int $userId = null): void
    {
        $this->hit('forbidden', $ip, [
            'ผู้ใช้' => $userId ? '#'.$userId : 'guest',
            'เส้นทาง' => mb_substr($path, 0, 200),
            'IP' => $ip,
        ], (int) config('security_monitor.forbidden', 20), 'มีการเข้าถึงหน้าที่ไม่มีสิทธิ์ซ้ำๆ');
    }

    public function recordExport(string $ip, string $path, ?int $userId = null): void
    {
        $this->hit('export', $ip.'|'.($userId ?? 'guest'), [
            'ผู้ใช้' => $userId ? '#'.$userId : 'guest',
            'เส้นทาง' => mb_substr($path, 0, 200),
            'IP' => $ip,
        ], (int) config('security_monitor.exports', 8), 'มีการส่งออกข้อมูลถี่ผิดปกติ');
    }

    public function recordPatientLookup(string $ip, ?int $userId = null): void
    {
        $this->hit('patient_lookup', $ip.'|'.($userId ?? 'guest'), [
            'ผู้ใช้' => $userId ? '#'.$userId : 'guest',
            'IP' => $ip,
        ], (int) config('security_monitor.patient_lookups', 40), 'มีการค้นหาผู้ป่วยถี่ผิดปกติ');
    }

    public function recordSuspiciousRequest(string $ip, string $path, string $reason, ?int $userId = null): void
    {
        $this->hit('suspicious', $ip, [
            'เหตุผล' => $reason,
            'ผู้ใช้' => $userId ? '#'.$userId : 'guest',
            'เส้นทาง' => mb_substr($path, 0, 200),
            'IP' => $ip,
        ], (int) config('security_monitor.suspicious_payloads', 3), 'ตรวจพบคำขอที่น่าสงสัย');
    }

    /**
     * @param  array<string, string>  $fields
     */
    private function hit(string $type, string $bucket, array $fields, int $threshold, string $title): void
    {
        if (! config('security_monitor.enabled', true)) {
            return;
        }

        $window = max(1, (int) config('security_monitor.window_minutes', 15));
        $key = 'security_monitor:'.$type.':'.sha1($bucket);
        $count = (int) Cache::get($key, 0) + 1;
        Cache::put($key, $count, now()->addMinutes($window));

        if ($count < $threshold) {
            return;
        }

        $cooldownKey = 'security_monitor:alert:'.$type.':'.sha1($bucket);
        $cooldown = max(5, (int) config('security_monitor.alert_cooldown_minutes', 30));
        if (! Cache::add($cooldownKey, 1, now()->addMinutes($cooldown))) {
            return;
        }

        $fields['จำนวนใน '.$window.' นาที'] = (string) $count;
        $fields['เวลา'] = now('Asia/Bangkok')->format('d/m/Y H:i:s');

        Log::warning('SecurityMonitor: '.$title, $fields);

        if (! config('security_monitor.notify_chat', true)) {
            return;
        }

        try {
            $this->chat->notifyCard(
                $this->chat->itDepartment(),
                '⚠️ แจ้งเตือนความปลอดภัย: '.$title,
                $fields,
                '#EF4444',
                'วิกฤต',
            );
        } catch (Throwable $e) {
            Log::warning('SecurityMonitor chat notify failed: '.$e->getMessage());
        }
    }

    private function redactEmail(string $email): string
    {
        $email = trim($email);
        if ($email === '' || ! str_contains($email, '@')) {
            return '(ไม่ระบุ)';
        }
        [$local, $domain] = explode('@', $email, 2);
        $keep = mb_substr($local, 0, 2);

        return $keep.str_repeat('*', max(1, mb_strlen($local) - 2)).'@'.$domain;
    }
}
