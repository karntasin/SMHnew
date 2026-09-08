<?php

namespace App\Console\Commands;

use App\Services\DatabaseDumpBackupService;
use Illuminate\Console\Command;
use Throwable;

class BackupHosxpDatabase extends Command
{
    protected $signature = 'hosxp:backup
                            {--keep= : จำนวนไฟล์ที่เก็บไว้ต่อชุด (ค่าเริ่มต้น 3)}
                            {--prune-only : ลบไฟล์เก่าให้เหลือตาม --keep โดยยังไม่ dump}
                            {--dry-run : ทดสอบการเชื่อมต่อโดยยังไม่ dump}';

    protected $description = 'สำรองฐาน HOSxP จากเซิร์ฟเวอร์สำรอง (ไม่ใช้ connection รายงานเดิม) แล้วลง Backup Logs ของ IM';

    public function handle(DatabaseDumpBackupService $backup): int
    {
        return $this->runJob($backup, 'hosxp');
    }

    protected function runJob(DatabaseDumpBackupService $backup, string $job): int
    {
        $keep = $this->option('keep') !== null && $this->option('keep') !== ''
            ? (int) $this->option('keep')
            : null;

        if ($this->option('prune-only')) {
            $result = $backup->pruneJob($job, $keep);
            $this->info(sprintf(
                'ตัดไฟล์เก่าแล้ว · เหลือ %d ไฟล์ · ลบ %s%s',
                $result['kept'],
                $result['deleted'] === [] ? '-' : implode(', ', $result['deleted']),
                $result['failed'] === [] ? '' : ' · ลบไม่สำเร็จ: '.implode(', ', $result['failed'])
            ));

            return $result['failed'] === [] ? self::SUCCESS : self::FAILURE;
        }

        $probe = $backup->probe($job);
        $this->line(sprintf('%s %s / %s', $probe['ok'] ? 'OK' : 'FAIL', $probe['host'], $probe['database']));
        $this->line($probe['message']);

        if ($this->option('dry-run')) {
            return $probe['ok'] ? self::SUCCESS : self::FAILURE;
        }

        try {
            $result = $backup->run($job, $keep);
        } catch (Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->info(sprintf(
            'สำรองแล้ว %.1f MB · %s · เหลือ %d ไฟล์ · ลบ %s',
            $result['bytes'] / 1048576,
            $result['path'],
            $result['kept'],
            $result['deleted'] === [] ? '-' : implode(', ', $result['deleted'])
        ));

        return self::SUCCESS;
    }
}
