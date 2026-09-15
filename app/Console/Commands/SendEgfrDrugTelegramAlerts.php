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

        if ($result['skipped'] ?? false) {
            $this->warn($result['message']);

            return self::SUCCESS;
        }

        if (! ($result['ok'] ?? false)) {
            $this->error($result['message']);

            return self::FAILURE;
        }

        $this->info($result['message']);
        $this->line("สแกนผ่านเกณฑ์: {$result['scanned']} | ใหม่: {$result['new']} | ข้อความที่ส่ง: {$result['sent']}");

        return self::SUCCESS;
    }
}
