<?php

namespace App\Console\Commands;

use App\Services\DatabaseDumpBackupService;

class BackupAppDatabase extends BackupHosxpDatabase
{
    protected $signature = 'appdb:backup
                            {--keep= : จำนวนไฟล์ที่เก็บไว้ต่อชุด (ค่าเริ่มต้น 3)}
                            {--prune-only : ลบไฟล์เก่าให้เหลือตาม --keep โดยยังไม่ dump}
                            {--dry-run : ทดสอบการเชื่อมต่อโดยยังไม่ dump}';

    protected $description = 'สำรองฐาน app_db ลงโฟลเดอร์เดียวกับ HOSxP แล้วลง Backup Logs ของ IM';

    public function handle(DatabaseDumpBackupService $backup): int
    {
        return $this->runJob($backup, 'app');
    }
}
