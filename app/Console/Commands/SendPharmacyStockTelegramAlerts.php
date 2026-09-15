<?php

namespace App\Console\Commands;

use App\Services\Pharmacy\PharmacyStockTelegramNotifier;
use Illuminate\Console\Command;

class SendPharmacyStockTelegramAlerts extends Command
{
    protected $signature = 'pharmacy:send-stock-telegram-alerts {--force}';

    protected $description = 'แจ้งเตือนสต็อกยาต่ำ/หมด/ใกล้หมดอายุ เข้า Telegram';

    public function handle(PharmacyStockTelegramNotifier $notifier): int
    {
        $result = $notifier->notify(force: (bool) $this->option('force'));
        if ($result['skipped'] ?? false) {
            $this->warn($result['message']);

            return self::SUCCESS;
        }
        if (! ($result['ok'] ?? false)) {
            $this->error($result['message']);

            return self::FAILURE;
        }
        $this->info($result['message']);

        return self::SUCCESS;
    }
}
