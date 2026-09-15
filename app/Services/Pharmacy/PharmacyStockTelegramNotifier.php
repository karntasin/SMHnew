<?php

namespace App\Services\Pharmacy;

use App\Services\Telegram\TelegramBotService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class PharmacyStockTelegramNotifier
{
    public function __construct(
        private readonly PharmacyInventoryService $inventory,
        private readonly TelegramBotService $telegram,
    ) {}

    public function isEnabled(): bool
    {
        return (bool) config('services.telegram.stock_alerts.enabled', false)
            && $this->telegram->isConfigured();
    }

    /**
     * @return array{ok:bool,skipped:bool,message:string,sent:int}
     */
    public function notify(bool $force = false): array
    {
        if (! $this->isEnabled() && ! $force) {
            return ['ok' => false, 'skipped' => true, 'message' => 'ยังไม่เปิด TELEGRAM_STOCK_ALERTS_ENABLED', 'sent' => 0];
        }
        if (! $this->telegram->isConfigured()) {
            return ['ok' => false, 'skipped' => true, 'message' => 'ยังไม่ตั้งค่า Telegram bot/chat', 'sent' => 0];
        }

        $snap = $this->inventory->alertSnapshot();
        $hasIssue = ($snap['low'] + $snap['empty'] + $snap['expiring_90d']) > 0;
        if (! $hasIssue) {
            return ['ok' => true, 'skipped' => false, 'message' => 'สต็อกปกติ ไม่มีรายการแจ้ง', 'sent' => 0];
        }

        $fingerprint = md5(json_encode([
            'low' => collect($snap['low_stock'])->pluck('id')->sort()->values(),
            'empty' => collect($snap['empty_stock'])->pluck('id')->sort()->values(),
            'exp' => collect($snap['expiring'])->pluck('id')->sort()->values(),
        ]));
        $cacheKey = 'pharmacy:stock:tg:'.$fingerprint;
        if (! $force && Cache::has($cacheKey)) {
            return ['ok' => true, 'skipped' => false, 'message' => 'แจ้งชุดนี้ไปแล้ว ข้าม', 'sent' => 0];
        }

        $e = [TelegramBotService::class, 'e'];
        $lines = [
            '📦 <b>แจ้งเตือนสต็อกยา</b>',
            '🔴 หมด <b>'.$snap['empty'].'</b> · 🟠 เหลือน้อย <b>'.$snap['low'].'</b> · 🟡 ใกล้หมดอายุ <b>'.$snap['expiring_90d'].'</b>',
            '',
        ];

        if ($snap['empty_stock'] !== []) {
            $lines[] = '🔴 <b>หมดสต็อก</b>';
            foreach (array_slice($snap['empty_stock'], 0, 8) as $row) {
                $lines[] = '• '.$e(($row['location']['name'] ?? '').' · '.($row['item']['name'] ?? '').' ('.$e((string) ($row['item']['icode'] ?? '')).')');
            }
            $lines[] = '';
        }

        if ($snap['low_stock'] !== []) {
            $lines[] = '🟠 <b>เหลือน้อย</b>';
            foreach (array_slice($snap['low_stock'], 0, 8) as $row) {
                $lines[] = '• '.$e(($row['location']['name'] ?? '').' · '.($row['item']['name'] ?? ''))
                    .' คงเหลือ <b>'.$e((string) $row['available']).'</b> / เกณฑ์ '.$e((string) max($row['min_level'], $row['reorder_level']));
            }
            $lines[] = '';
        }

        if ($snap['expiring'] !== []) {
            $lines[] = '🟡 <b>ใกล้หมดอายุ (90 วัน)</b>';
            foreach (array_slice($snap['expiring'], 0, 8) as $row) {
                $lines[] = '• '.$e(($row['item']['name'] ?? '').' · lot '.$row['lot_no'])
                    .' หมดอายุ <code>'.$e((string) $row['expires_at']).'</code> คงเหลือ '.$e((string) $row['qty_remaining']);
            }
        }

        $host = trim((string) config('cloudflare.public_hostname', ''));
        if ($host !== '') {
            $lines[] = '';
            $lines[] = '🔗 <a href="https://'.$e($host).'/pharmacy/inventory">เปิดคลังยา</a>';
        }

        $res = $this->telegram->sendMessage(null, implode("\n", $lines));
        if (! ($res['ok'] ?? false)) {
            Log::warning('Pharmacy stock telegram failed: '.($res['message'] ?? ''));

            return ['ok' => false, 'skipped' => false, 'message' => (string) ($res['message'] ?? 'ส่งไม่สำเร็จ'), 'sent' => 0];
        }

        Cache::put($cacheKey, now()->toIso8601String(), now()->addHours(6));

        return ['ok' => true, 'skipped' => false, 'message' => 'ส่งแจ้งเตือนสต็อกแล้ว', 'sent' => 1];
    }
}
