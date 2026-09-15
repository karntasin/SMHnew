<?php

namespace App\Services\Hosxp;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * ส่งข้อความ popup ใน HOSxP ผ่าน ksklog (NOTIFYMESSAGE)
 * เขียนได้เฉพาะตาราง ksklog เท่านั้น
 *
 * สำคัญ: ผู้ส่งต้องเป็น session จริงใน onlineuser
 * (loginname / computer_name / onlineid ปลอม → client มักไม่แสดง popup)
 */
class HosxpDesktopNotifyService
{
    private const ALLOWED_WRITE_TABLE = 'ksklog';

    public function isEnabled(): bool
    {
        return (bool) config('services.hosxp_notify.enabled', false);
    }

    /**
     * @return array{online:bool,user:?array<string,mixed>}
     */
    public function findOnlineByComputer(string $computerOrIp): array
    {
        $computerOrIp = trim($computerOrIp);
        $row = DB::connection('hosxp')
            ->table('onlineuser')
            ->where('computername', $computerOrIp)
            ->orderByDesc('ksklogintime')
            ->first();

        if (! $row) {
            return ['online' => false, 'user' => null];
        }

        return [
            'online' => true,
            'user' => $this->mapOnlineUser($row),
        ];
    }

    /**
     * ส่งข้อความสั้นไปเครื่องที่ระบุ (computername ใน onlineuser = IP)
     *
     * @return array{ok:bool,skipped:bool,message:string,ksklog_id:?int,detail:?string,sender:?array<string,mixed>}
     */
    public function sendToComputer(string $targetComputer, string $message, bool $requireOnline = true): array
    {
        $targetComputer = trim($targetComputer);
        $message = $this->sanitizeMessage($message);

        if ($targetComputer === '' || $message === '') {
            return [
                'ok' => false,
                'skipped' => false,
                'message' => 'ต้องระบุเครื่องปลายทางและข้อความ',
                'ksklog_id' => null,
                'detail' => null,
                'sender' => null,
            ];
        }

        $online = $this->findOnlineByComputer($targetComputer);
        if ($requireOnline && ! $online['online']) {
            return [
                'ok' => false,
                'skipped' => true,
                'message' => "เครื่อง {$targetComputer} ไม่ได้ออนไลน์ใน onlineuser",
                'ksklog_id' => null,
                'detail' => null,
                'sender' => null,
            ];
        }

        $sender = $this->resolveSender($targetComputer);
        if ($sender === null) {
            return [
                'ok' => false,
                'skipped' => true,
                'message' => 'ไม่พบผู้ส่งที่เป็น session จริงใน onlineuser (ตั้ง HOSXP_NOTIFY_SENDER_COMPUTER เป็น IP เครื่องที่ login HOSxP อยู่)',
                'ksklog_id' => null,
                'detail' => null,
                'sender' => null,
            ];
        }

        $displayName = $this->resolveDisplayName($sender);
        $detail = $this->buildDetail($targetComputer, $message, $displayName, $sender['onlineid']);

        try {
            $id = $this->insertKsklogOnly([
                'logtime' => now('Asia/Bangkok')->format('Y-m-d H:i:s'),
                'loginname' => $sender['kskloginname'] !== '' ? $sender['kskloginname'] : $sender['loginname'],
                'tablename' => 'NOTIFYMESSAGE',
                'modifytype' => 'SEND',
                'detail' => $detail,
                'computer_name' => $sender['servername'] !== '' ? $sender['servername'] : $sender['computername'],
            ]);
        } catch (Throwable $e) {
            Log::warning('HOSxP ksklog notify failed: '.$e->getMessage());

            return [
                'ok' => false,
                'skipped' => false,
                'message' => 'บันทึก ksklog ไม่สำเร็จ: '.$e->getMessage(),
                'ksklog_id' => null,
                'detail' => $detail,
                'sender' => $sender,
            ];
        }

        return [
            'ok' => true,
            'skipped' => false,
            'message' => "ส่งแล้ว ksklog_id={$id} → {$targetComputer} (จาก {$sender['computername']})",
            'ksklog_id' => $id,
            'detail' => $detail,
            'sender' => $sender,
        ];
    }

    private function buildDetail(string $target, string $message, string $senderName, string $onlineId): string
    {
        // รูปแบบที่ส่งสำเร็จจริง: IP:ข้อความ:ชื่อผู้ส่ง:onlineid
        $message = str_replace(':', ' ', $message);
        $senderName = str_replace(':', ' ', $senderName);

        $prefix = $target.':';
        $suffix = ':'.$senderName.':'.$onlineId;
        $max = 250;
        $budget = $max - mb_strlen($prefix.$suffix, 'UTF-8');
        if ($budget < 8) {
            $message = 'ALERT';
            $budget = max(1, $max - mb_strlen($prefix.$suffix, 'UTF-8'));
        }
        if (mb_strlen($message, 'UTF-8') > $budget) {
            $message = mb_substr($message, 0, max(1, $budget - 1), 'UTF-8').'.';
        }

        return $prefix.$message.$suffix;
    }

    private function sanitizeMessage(string $message): string
    {
        $message = trim($message);
        $message = preg_replace('/[\x{10000}-\x{10FFFF}]/u', '', $message) ?? $message;
        $message = str_replace(["\r\n", "\r", "\n"], ' ', $message);
        $message = preg_replace('/\s+/u', ' ', $message) ?? $message;
        $message = str_replace(['—', '–', '•', '·', '…'], ['-', '-', '-', '-', '.'], $message);

        return trim($message);
    }

    /**
     * ผู้ส่งต้องเป็นเครื่องที่ login HOSxP จริงใน onlineuser
     *
     * @return array<string,mixed>|null
     */
    private function resolveSender(string $targetComputer): ?array
    {
        $preferred = trim((string) config('services.hosxp_notify.sender_computer', ''));

        if ($preferred !== '') {
            $found = $this->findOnlineByComputer($preferred);
            if ($found['online'] && $found['user'] && ($found['user']['onlineid'] ?? '') !== '') {
                return $found['user'];
            }
        }

        // เลือกเครื่องอื่นที่ออนไลน์ (ไม่ใช้เครื่องปลายทาง) เพื่อให้เหมือนการแชทจริง
        try {
            $row = DB::connection('hosxp')
                ->table('onlineuser')
                ->where('computername', '!=', $targetComputer)
                ->whereNotNull('onlineid')
                ->where('onlineid', '!=', '')
                ->orderByDesc('ksklogintime')
                ->first();

            if ($row) {
                return $this->mapOnlineUser($row);
            }
        } catch (Throwable) {
            // fall through
        }

        // สุดท้าย: ถ้ามีแค่เครื่องเป้าหมายออนไลน์ ใช้อันนั้น (ทดสอบส่งหาตัวเองอาจไม่ขึ้น)
        $self = $this->findOnlineByComputer($targetComputer);
        if ($self['online'] && $self['user'] && ($self['user']['onlineid'] ?? '') !== '') {
            return $self['user'];
        }

        return null;
    }

    /**
     * @param  array<string,mixed>  $sender
     */
    private function resolveDisplayName(array $sender): string
    {
        $login = (string) ($sender['loginname'] ?? '');
        $ksk = (string) ($sender['kskloginname'] ?? '');

        try {
            if ($login !== '') {
                $opd = DB::connection('hosxp')->table('opduser')->where('loginname', $login)->first();
                if ($opd && ! empty($opd->name)) {
                    return trim((string) $opd->name);
                }
            }
            if ($ksk !== '') {
                $opd = DB::connection('hosxp')->table('opduser')->where('loginname', $ksk)->orWhere('name', 'like', $ksk.'%')->first();
                if ($opd && ! empty($opd->name)) {
                    return trim((string) $opd->name);
                }
            }
        } catch (Throwable) {
            // ignore
        }

        // fallback: ชื่อที่โชว์ใน onlineuser
        if ($ksk !== '') {
            return $ksk;
        }

        return $login !== '' ? $login : 'HOSxP';
    }

    /** @param  object  $row */
    private function mapOnlineUser(object $row): array
    {
        return [
            'computername' => (string) $row->computername,
            'servername' => (string) ($row->servername ?? ''),
            'kskloginname' => (string) ($row->kskloginname ?? ''),
            'loginname' => (string) ($row->loginname ?? ''),
            'onlineid' => (string) ($row->onlineid ?? ''),
            'department' => (string) ($row->department ?? ''),
        ];
    }

    /**
     * เขียนเฉพาะตาราง ksklog เท่านั้น
     *
     * @param  array<string, mixed>  $payload
     */
    private function insertKsklogOnly(array $payload): int
    {
        if (self::ALLOWED_WRITE_TABLE !== 'ksklog') {
            throw new \RuntimeException('Write target not allowed');
        }

        $nextId = (int) DB::connection('hosxp')->table('ksklog')->max('ksklog_id') + 1;
        if ($nextId < 1) {
            $nextId = 1;
        }

        $affected = DB::connection('hosxp')->table('ksklog')->insert([
            'ksklog_id' => $nextId,
            'logtime' => $payload['logtime'],
            'loginname' => $payload['loginname'],
            'tablename' => 'NOTIFYMESSAGE',
            'modifytype' => 'SEND',
            'detail' => $payload['detail'],
            'old_delta' => null,
            'new_delta' => null,
            'log_id' => null,
            'computer_name' => $payload['computer_name'],
            'hos_guid' => null,
        ]);

        if (! $affected) {
            throw new \RuntimeException('insert ksklog returned false');
        }

        return $nextId;
    }
}
