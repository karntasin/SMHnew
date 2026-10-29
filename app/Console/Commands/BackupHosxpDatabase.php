<?php

namespace App\Console\Commands;

use App\Services\DatabaseDumpBackupService;
use Illuminate\Console\Command;
use Symfony\Component\Process\Process;
use Throwable;

class BackupHosxpDatabase extends Command
{
    /** @var resource|null */
    private $dumpLockHandle = null;

    private ?string $dumpLockError = null;
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

        if ($this->anotherDumperIsRunning()) {
            $this->warn('มีงานสำรองนี้กำลังทำงานอยู่ จึงไม่เริ่มซ้ำ');

            return self::SUCCESS;
        }

        if (! $this->acquireDumpLock($job)) {
            if ($this->dumpLockError !== null) {
                $this->error($this->dumpLockError);

                return self::FAILURE;
            }

            $this->warn('มีงานสำรองนี้กำลังทำงานอยู่ จึงไม่เริ่มซ้ำ');

            return self::SUCCESS;
        }

        try {
            $result = $backup->run($job, $keep);
        } catch (Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        } finally {
            $this->releaseDumpLock();
        }

        $this->info(sprintf(
            'สำรองแล้ว %.1f MB · %s · เหลือ %d ไฟล์ · ลบ %s',
            $result['bytes'] / 1048576,
            $result['path'],
            $result['kept'],
            $result['deleted'] === [] ? '-' : implode(', ', $result['deleted'])
        ));

        if (($result['drive'] ?? null) !== null && $result['drive'] !== '') {
            if (($result['drive_ok'] ?? true) === false) {
                $this->warn($result['drive']);
            } else {
                $this->line($result['drive']);
            }
        }

        return self::SUCCESS;
    }

    private function anotherDumperIsRunning(): bool
    {
        if (DIRECTORY_SEPARATOR !== '\\') {
            return false;
        }

        $me = (int) getmypid();
        $needle = str_replace("'", '', $this->getName());
        $script = '$hits = @(Get-CimInstance Win32_Process -Filter "Name = \'php.exe\'" | Where-Object { $_.ProcessId -ne '.$me.' -and $_.CommandLine -match \''.$needle.'\' }); if ($hits) { $hits | ForEach-Object { $_.ProcessId } }';
        $powershell = (getenv('SystemRoot') ?: 'C:\\Windows').'\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';

        $process = new Process([
            $powershell,
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            $script,
        ]);
        $process->setTimeout(60);
        $process->run();

        if (! $process->isSuccessful()) {
            $this->warn('ตรวจโปรเซสสำรองเดิมไม่ได้ จะพึ่งไฟล์ล็อกแทน');

            return false;
        }

        return trim($process->getOutput()) !== '';
    }

    private function acquireDumpLock(string $job): bool
    {
        $directory = storage_path('framework/backup-locks');
        if (! is_dir($directory) && ! mkdir($directory, 0755, true) && ! is_dir($directory)) {
            $this->dumpLockError = 'สร้างโฟลเดอร์ล็อกสำรองไม่ได้';

            return false;
        }

        $handle = fopen($directory.DIRECTORY_SEPARATOR.$job.'.lock', 'c');
        if ($handle === false) {
            $this->dumpLockError = 'เปิดไฟล์ล็อกสำรองไม่ได้';

            return false;
        }

        if (! flock($handle, LOCK_EX | LOCK_NB)) {
            fclose($handle);

            return false;
        }

        ftruncate($handle, 0);
        fwrite($handle, (string) getmypid());
        fflush($handle);
        $this->dumpLockHandle = $handle;

        return true;
    }

    private function releaseDumpLock(): void
    {
        if (! is_resource($this->dumpLockHandle)) {
            return;
        }

        flock($this->dumpLockHandle, LOCK_UN);
        fclose($this->dumpLockHandle);
        $this->dumpLockHandle = null;
    }
}
