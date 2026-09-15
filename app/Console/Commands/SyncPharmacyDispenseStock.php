<?php

namespace App\Console\Commands;

use App\Services\Pharmacy\PharmacyDispenseSyncService;
use App\Services\Pharmacy\PharmacyStockTelegramNotifier;
use Illuminate\Console\Command;

class SyncPharmacyDispenseStock extends Command
{
    protected $signature = 'pharmacy:sync-dispense-stock {--date=} {--notify : ส่งแจ้งเตือนสต็อกหลัง sync}';

    protected $description = 'ตัดสต็อกห้องยาตามใบสั่ง HOSxP (opitemrece) และแจ้งเตือนสต็อกต่ำ';

    public function handle(PharmacyDispenseSyncService $sync, PharmacyStockTelegramNotifier $notifier): int
    {
        $date = $this->option('date');
        $date = is_string($date) && $date !== '' ? $date : null;

        $this->info('Sync dispense stock'.($date ? " ({$date})" : ' (วันนี้)'));
        $result = $sync->sync($date);
        $this->line($result['message']);

        if (! ($result['ok'] ?? false)) {
            return self::FAILURE;
        }

        if ($this->option('notify') || config('services.telegram.stock_alerts.enabled')) {
            $n = $notifier->notify();
            $this->line($n['message']);
        }

        return self::SUCCESS;
    }
}
