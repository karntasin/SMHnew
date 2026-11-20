<?php

namespace App\Console\Commands;

use App\Models\Pharmacy\PharmacySetting;
use App\Services\Pharmacy\PharmacyDispenseSyncService;
use App\Services\Pharmacy\PharmacyStockTelegramNotifier;
use Illuminate\Console\Command;

class SyncPharmacyDispenseStock extends Command
{
    protected $signature = 'pharmacy:sync-dispense-stock {--date=} {--notify : ส่งแจ้งเตือนสต็อกหลัง sync} {--force : บังคับรันแม้ปิดการตัดจ่ายอัตโนมัติ}';

    protected $description = 'ตัดสต็อกห้องยาและจุดจ่ายเวชภัณฑ์ตาม opitemrece ของ HOSxP แล้วแจ้งเตือนสต็อกต่ำ';

    public function handle(PharmacyDispenseSyncService $sync, PharmacyStockTelegramNotifier $notifier): int
    {
        $enabled = (bool) PharmacySetting::get('auto_dispense_sync_enabled', false);
        if (! $enabled && ! $this->option('force')) {
            $this->comment('การตัดจ่ายอัตโนมัติจาก HOSxP ถูกปิดอยู่ในการตั้งค่า (auto_dispense_sync_enabled = 0) — ข้ามการตัดสต็อกอัตโนมัติ');

            return self::SUCCESS;
        }

        $date = $this->option('date');
        $date = is_string($date) && $date !== '' ? $date : null;

        $this->info('Sync dispense stock'.($date ? " ({$date})" : ' (วันนี้)'));
        $result = $sync->sync($date);
        $this->line($result['message']);

        if (! ($result['ok'] ?? false)) {
            return self::FAILURE;
        }

        if ($this->option('notify') || $notifier->isEnabled()) {
            $n = $notifier->notify();
            $this->line($n['message']);
        }

        return self::SUCCESS;
    }
}
