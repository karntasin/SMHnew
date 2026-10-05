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

    public function getBotToken(): ?string
    {
        $dbToken = \App\Models\Pharmacy\PharmacySetting::query()->where('key', 'telegram_bot_token')->value('value');

        return TelegramBotService::firstLikelyBotToken(
            (string) $dbToken,
            (string) config('services.telegram.stock_alerts.bot_token', ''),
            (string) config('services.telegram.bot_token', ''),
        );
    }

    public function getChatId(): ?string
    {
        $dbStockChat = \App\Models\Pharmacy\PharmacySetting::query()->where('key', 'telegram_stock_chat_id')->value('value');

        return TelegramBotService::firstLikelyChatId(
            (string) $dbStockChat,
            (string) config('services.telegram.stock_alerts.chat_id', ''),
        );
    }

    public function isEnabled(): bool
    {
        $dbEnabled = \App\Models\Pharmacy\PharmacySetting::query()->where('key', 'telegram_stock_alerts_enabled')->value('value');
        $enabled = $dbEnabled !== null
            ? (bool) (int) $dbEnabled
            : (bool) config('services.telegram.stock_alerts.enabled', false);

        return $enabled && filled($this->getBotToken()) && filled($this->getChatId());
    }

    /**
     * @return array{ok:bool,skipped:bool,message:string,sent:int}
     */
    public function notify(bool $force = false): array
    {
        $token = $this->getBotToken();
        $chatId = $this->getChatId();

        if (! $this->isEnabled() && ! $force) {
            return ['ok' => false, 'skipped' => true, 'message' => 'ยังไม่เปิดแจ้งเตือนสต็อกยาผ่าน Telegram', 'sent' => 0];
        }
        if (! filled($token) || ! filled($chatId)) {
            return ['ok' => false, 'skipped' => true, 'message' => 'ยังไม่ตั้งค่า Telegram bot token หรือ Chat ID สำหรับกลุ่มคลังยา', 'sent' => 0];
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

        $res = $this->telegram->sendMessage($chatId, implode("\n", $lines), true, 'HTML', $token);
        if (! ($res['ok'] ?? false)) {
            Log::warning('Pharmacy stock telegram failed: '.($res['message'] ?? ''));

            return ['ok' => false, 'skipped' => false, 'message' => (string) ($res['message'] ?? 'ส่งไม่สำเร็จ'), 'sent' => 0];
        }

        Cache::put($cacheKey, now()->toIso8601String(), now()->addHours(6));

        return ['ok' => true, 'skipped' => false, 'message' => 'ส่งแจ้งเตือนสต็อกแล้ว', 'sent' => 1];
    }
}
