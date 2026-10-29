<?php

namespace App\Console\Commands;

use App\Models\Im\BackupLog;
use App\Services\Backup\DriveBackupPublisher;
use Illuminate\Console\Command;
use Throwable;

class UploadEncryptedBackupsToDrive extends Command
{
    private bool $sourceError = false;

    protected $signature = 'backup:upload-drive
                            {--dumps : อัปโหลด dump ล่าสุดของ HOSxP และ app db}
                            {--dotenv : อัปโหลดสแนปช็อต .env}
                            {--file= : อัปโหลดไฟล์ที่ระบุ}
                            {--dry-run : ตรวจคีย์และไฟล์โดยยังไม่อัปโหลด}';

    protected $description = 'เข้ารหัสไฟล์สำรองแบบ Databasus แล้วอัปโหลดขึ้น Google Drive';

    public function handle(DriveBackupPublisher $publisher): int
    {
        $dumps = (bool) $this->option('dumps');
        $env = (bool) $this->option('dotenv');
        $file = $this->option('file');
        $file = is_string($file) ? trim($file) : '';
        if (! $dumps && ! $env && $file === '') {
            $dumps = true;
            $env = true;
        }

        if (! config()->has('drive_backup')) {
            $this->warn('ยังไม่โหลดการตั้งค่า Google Drive ให้รัน php artisan config:clear');

            return self::SUCCESS;
        }

        if (! $publisher->isConfigured()) {
            $this->warn('ยังไม่ตั้งค่า Google Drive (คีย์หรือ token) จึงข้ามการอัปโหลด');

            return self::SUCCESS;
        }

        $sources = $this->sources($dumps, $env, $file);
        if ($sources === []) {
            return self::FAILURE;
        }

        if ($this->option('dry-run')) {
            foreach ($sources as $source) {
                $this->line(sprintf('จะอัปโหลด %s (%s)', $source['path'], $this->formatBytes((int) filesize($source['path']))));
            }
            $this->info('dry-run ยังไม่เข้ารหัสและยังไม่ส่งขึ้น Drive');

            return $this->sourceError ? self::FAILURE : self::SUCCESS;
        }

        $failed = false;
        foreach ($sources as $source) {
            try {
                $result = $publisher->publish($source['path'], $source['stem']);
            } catch (Throwable $e) {
                $failed = true;
                $this->error($source['path'].' : '.$e->getMessage());
                $this->log($source['scope'], 'failed', null, mb_substr($e->getMessage(), 0, 500), $source['performed_by']);

                continue;
            }

            $notes = 'อัปโหลดไฟล์เข้ารหัส '.$result['remote'].' ขึ้น Google Drive';
            if ($result['deleted'] !== []) {
                $notes .= ' · ลบของเก่า: '.implode(', ', $result['deleted']);
            }
            if ($result['failed'] !== []) {
                $failed = true;
                $notes .= ' · ลบไม่สำเร็จ: '.implode(', ', $result['failed']);
            }
            $this->log(
                $source['scope'],
                $result['failed'] === [] ? 'success' : 'partial',
                $result['bytes'],
                $notes,
                $source['performed_by']
            );
            $this->info($notes);
        }

        return ($failed || $this->sourceError) ? self::FAILURE : self::SUCCESS;
    }

    /**
     * @return list<array{path:string,stem:string,scope:string,performed_by:string}>
     */
    private function sources(bool $dumps, bool $env, string $file): array
    {
        $sources = [];

        if ($file !== '') {
            if (! is_file($file)) {
                $this->error('ไม่พบไฟล์ '.$file);

                return [];
            }
            $stem = pathinfo($file, PATHINFO_FILENAME);
            $sources[] = [
                'path' => $file,
                'stem' => $stem !== '' ? $stem : 'file',
                'scope' => 'Google Drive '.basename($file),
                'performed_by' => 'คำสั่ง backup:upload-drive',
            ];
        }

        if ($dumps) {
            $found = false;
            foreach (config('database_backup.jobs', []) as $job) {
                $prefix = (string) ($job['prefix'] ?? '');
                if ($prefix === '') {
                    continue;
                }
                $path = $this->latestDump($prefix);
                if ($path === null) {
                    $this->warn('ยังไม่มี dump ของ '.$prefix);

                    continue;
                }
                $found = true;
                $sources[] = [
                    'path' => $path,
                    'stem' => basename($path, '.sql.gz'),
                    'scope' => 'Google Drive '.basename($path),
                    'performed_by' => 'คำสั่ง backup:upload-drive',
                ];
            }
            if (! $found) {
                $this->sourceError = true;
                $this->error('ไม่พบไฟล์ dump ที่จะอัปโหลด');
            }
        }

        if ($env) {
            $path = base_path('.env');
            if (! is_file($path)) {
                $this->sourceError = true;
                $this->error('ไม่พบไฟล์ .env');
            } else {
                $sources[] = [
                    'path' => $path,
                    'stem' => 'env-'.now('Asia/Bangkok')->format('Ymd-His'),
                    'scope' => 'ไฟล์ .env',
                    'performed_by' => 'ระบบอัตโนมัติ (05:30)',
                ];
            }
        }

        return $sources;
    }

    private function latestDump(string $prefix): ?string
    {
        $directory = rtrim((string) config('database_backup.directory'), DIRECTORY_SEPARATOR);
        $files = glob($directory.DIRECTORY_SEPARATOR.$prefix.'-*.sql.gz') ?: [];
        if ($files === []) {
            return null;
        }

        usort($files, function (string $a, string $b): int {
            $time = (filemtime($b) ?: 0) <=> (filemtime($a) ?: 0);
            if ($time !== 0) {
                return $time;
            }

            return strcmp($b, $a);
        });

        return $files[0];
    }

    private function log(string $scope, string $status, ?int $bytes, string $notes, string $performedBy): void
    {
        BackupLog::create([
            'backup_date' => now('Asia/Bangkok')->toDateString(),
            'type' => 'offline',
            'scope' => $scope,
            'status' => $status,
            'size_gb' => $bytes === null ? null : round($bytes / 1073741824, 4),
            'notes' => $notes,
            'performed_by' => $performedBy,
        ]);
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes >= 1048576) {
            return round($bytes / 1048576, 1).' MB';
        }

        return round($bytes / 1024, 1).' KB';
    }
}
