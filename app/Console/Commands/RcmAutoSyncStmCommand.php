<?php

namespace App\Console\Commands;

use App\Services\Rcm\RcmAutoSyncService;
use Illuminate\Console\Command;

class RcmAutoSyncStmCommand extends Command
{
    protected $signature = 'rcm:auto-sync-stm {--folder= : โฟลเดอร์ Hot-Folder ที่ต้องการสแกน}';
    protected $description = 'สแกน Hot-Folder บอท Auto4STM และนำเข้าไฟล์ REP / STM เข้าสู่ระบบ RCM อัตโนมัติ';

    public function handle(RcmAutoSyncService $syncService): int
    {
        $folder = $this->option('folder');
        $this->info('Starting RCM STM Auto-Sync...');

        $result = $syncService->scanAndImportHotFolder($folder, true);

        if ($result['success']) {
            $this->info("Folder: {$result['folder']}");
            $this->info("Scanned files: {$result['total_files']}");
            $this->info("Imported files: {$result['imported_count']}");
            $this->info('Sync completed successfully.');
            return Command::SUCCESS;
        }

        $this->error('Auto-Sync failed: ' . ($result['message'] ?? 'Unknown error'));
        return Command::FAILURE;
    }
}
