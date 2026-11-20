<?php

namespace App\Console\Commands;

use App\Services\Rcm\RcmQualityIndicatorSyncService;
use Illuminate\Console\Command;

class RcmSyncIm11IndicatorCommand extends Command
{
    protected $signature = 'rcm:sync-im11-indicator {--year= : ปีงบประมาณ พ.ศ. (เช่น 2569)}';

    protected $description = 'ซิงค์ข้อมูลสถิติการติด C จากระบบ RCM เข้าสู่ตัวชี้วัดคุณภาพ IM-11 (จำนวนติด C ระบบ Claim) รายเดือน';

    public function handle(RcmQualityIndicatorSyncService $syncService): int
    {
        $year = $this->option('year') ? (int) $this->option('year') : null;
        $this->info('Starting RCM C-Deny data sync to IM-11 indicator...');

        $result = $syncService->syncIm11($year);

        if ($result['success']) {
            $this->info($result['message']);
            return Command::SUCCESS;
        }

        $this->error('Sync failed: ' . ($result['message'] ?? 'Unknown error'));
        return Command::FAILURE;
    }
}
