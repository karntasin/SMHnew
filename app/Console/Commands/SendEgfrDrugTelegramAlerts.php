<?php

namespace App\Console\Commands;

use App\Services\Pharmacy\EgfrDrugAlertTelegramNotifier;
use Illuminate\Console\Command;

class SendEgfrDrugTelegramAlerts extends Command
{
    protected $signature = 'pharmacy:send-egfr-telegram-alerts
                            {--force : ส่งแม้ยังไม่เปิด enabled และส่งซ้ำได้แม้เคยแจ้งแล้ว}
                            {--days= : จำนวนวันย้อนหลัง (override config)}';

    protected $description = 'สแกนสั่งยาเทียบ eGFR แล้วแจ้งเตือนเข้ากลุ่ม Telegram';

    public function handle(EgfrDrugAlertTelegramNotifier $notifier): int
    {
        $daysOpt = $this->option('days');
        $days = is_numeric($daysOpt) ? (int) $daysOpt : null;
        $force = (bool) $this->option('force');

        $this->info('กำลังสแกนและส่งแจ้งเตือน eGFR → Telegram ...');
        $result = $notifier->notify(force: $force, lookbackDays: $days);

        $summary = sprintf(
            'eGFR Telegram: %s | scanned=%s new=%s sent=%s force=%s',
            (string) ($result['message'] ?? ''),
            (string) ($result['scanned'] ?? 0),
            (string) ($result['new'] ?? 0),
            (string) ($result['sent'] ?? 0),
            $force ? '1' : '0',
        );

        if ($result['skipped'] ?? false) {
            $this->warn($result['message']);
            \Illuminate\Support\Facades\Log::info($summary);

            return self::SUCCESS;
        }

        if (! ($result['ok'] ?? false)) {
            $this->error($result['message']);
            \Illuminate\Support\Facades\Log::warning($summary);

            return self::FAILURE;
        }

        $this->info($result['message']);
        $this->line("สแกนผ่านเกณฑ์: {$result['scanned']} | ใหม่: {$result['new']} | ข้อความที่ส่ง: {$result['sent']}");
        \Illuminate\Support\Facades\Log::info($summary);

        return self::SUCCESS;
    }
}
