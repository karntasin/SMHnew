<?php

namespace App\Console\Commands;

use App\Services\Im\GoogleTimesheetSyncService;
use Illuminate\Console\Command;
use RuntimeException;

class SyncImTimesheets extends Command
{
    protected $signature = 'im:sync-timesheets
                            {--file= : นำเข้าจากไฟล์ CSV/XLSX แทนการดึง Google Sheet}
                            {--prune : ลบรายการจากชีตที่ไม่มีในไฟล์แล้ว}';

    protected $description = 'ดึง Timesheet IT จาก Google Sheet ลงเวลาปฎิบัติงาน เข้า IM';

    public function handle(GoogleTimesheetSyncService $sync): int
    {
        $file = $this->option('file');
        $file = is_string($file) && $file !== '' ? $file : null;

        try {
            $result = $sync->sync(
                prune: (bool) $this->option('prune'),
                file: $file,
            );
        } catch (RuntimeException $e) {
            $sync->rememberError($e->getMessage());
            $this->error($e->getMessage());

            return self::FAILURE;
        } catch (\Throwable $e) {
            $sync->rememberError($e->getMessage());
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->info(sprintf(
            'นำเข้า %d · อัปเดต %d · ข้าม %d · ลบ %d · ผ่าน %s · ชีต %s',
            $result['imported'],
            $result['updated'],
            $result['skipped'],
            $result['pruned'],
            $result['source'],
            implode(', ', $result['tabs'])
        ));

        return self::SUCCESS;
    }
}
