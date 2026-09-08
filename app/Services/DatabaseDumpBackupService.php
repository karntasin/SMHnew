<?php

namespace App\Services;

use App\Models\Im\BackupLog;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Throwable;

class DatabaseDumpBackupService
{
    /**
     * @return array{ok:bool,host:string,database:string,message:string}
     */
    public function probe(string $job): array
    {
        $config = $this->job($job);
        $connection = $config['connection'];
        $host = (string) config("database.connections.{$connection}.host");
        $database = (string) config("database.connections.{$connection}.database");

        try {
            $pdo = DB::connection($connection)->getPdo();
            $version = (string) $pdo->query('SELECT VERSION()')->fetchColumn();

            return [
                'ok' => true,
                'host' => $host,
                'database' => $database,
                'message' => 'เชื่อมต่อได้ MySQL '.$version,
            ];
        } catch (Throwable $e) {
            return [
                'ok' => false,
                'host' => $host,
                'database' => $database,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * ลบไฟล์สำรองเก่าของงานที่ระบุ ให้เหลือไม่เกิน $keep ไฟล์ล่าสุด
     *
     * @return array{kept:int,deleted:list<string>,failed:list<string>}
     */
    public function pruneJob(string $job, ?int $keep = null): array
    {
        $config = $this->job($job);
        $keep = max(1, $keep ?? (int) ($config['keep'] ?? config('database_backup.keep', 3)));
        $directory = rtrim((string) config('database_backup.directory'), DIRECTORY_SEPARATOR);

        if (! is_dir($directory)) {
            return ['kept' => 0, 'deleted' => [], 'failed' => []];
        }

        $this->cleanupOrphanedCnf($directory);
        $this->cleanupSidecarFiles($directory, $config['prefix']);
        $result = $this->prune($directory, $config['prefix'], $keep);

        return [
            'kept' => $this->existingDumps($directory, $config['prefix'])->count(),
            'deleted' => $result['deleted'],
            'failed' => $result['failed'],
        ];
    }

    /**
     * @return array{path:string,bytes:int,kept:int,deleted:list<string>}
     */
    public function run(string $job, ?int $keep = null): array
    {
        $config = $this->job($job);
        $keep = max(1, $keep ?? (int) ($config['keep'] ?? config('database_backup.keep', 3)));
        $probe = $this->probe($job);
        if (! $probe['ok']) {
            $this->logFailure($job, $probe['message']);
            throw new RuntimeException('เชื่อมต่อสำหรับสำรองไม่ได้: '.$probe['message']);
        }

        $directory = rtrim((string) config('database_backup.directory'), DIRECTORY_SEPARATOR);
        if (! is_dir($directory) && ! mkdir($directory, 0755, true) && ! is_dir($directory)) {
            throw new RuntimeException('สร้างโฟลเดอร์สำรองไม่ได้: '.$directory);
        }

        $this->cleanupOrphanedCnf($directory);
        // คืนพื้นที่จากไฟล์เกินก่อน dump รอบใหม่
        $this->prune($directory, $config['prefix'], $keep);

        $connection = $config['connection'];
        $host = (string) config("database.connections.{$connection}.host");
        $port = (string) config("database.connections.{$connection}.port", '3306');
        $database = (string) config("database.connections.{$connection}.database");
        $username = (string) config("database.connections.{$connection}.username");
        $password = (string) (config("database.connections.{$connection}.password") ?? '');
        $charset = (string) (config("database.connections.{$connection}.charset") ?: 'utf8mb4');
        $prefix = $config['prefix'];
        $stamp = now('Asia/Bangkok')->format('Ymd-His');
        $filename = $prefix.'-'.$database.'-'.$stamp.'.sql.gz';
        $path = $directory.DIRECTORY_SEPARATOR.$filename;
        $cnf = $directory.DIRECTORY_SEPARATOR.'.mysqldump-'.$prefix.'-'.$stamp.'.cnf';

        file_put_contents($cnf, implode("\n", [
            '[client]',
            'host='.$host,
            'port='.$port,
            'user='.$username,
            'password='.$password,
            'default-character-set='.$charset,
        ])."\n");

        try {
            $this->streamDumpToGzip($cnf, $charset, $database, $path);
        } catch (Throwable $e) {
            @unlink($path);
            $this->logFailure($job, $e->getMessage());
            throw $e;
        } finally {
            @unlink($cnf);
        }

        if (! is_file($path) || filesize($path) < 1024) {
            @unlink($path);
            $message = 'ไฟล์สำรองว่างหรือเล็กผิดปกติ';
            $this->logFailure($job, $message);
            throw new RuntimeException($message);
        }

        $pruned = $this->prune($directory, $prefix, $keep);
        $this->cleanupSidecarFiles($directory, $prefix);
        $bytes = (int) filesize($path);
        $warnFile = $path.'.warn';
        $warning = is_file($warnFile) ? trim((string) file_get_contents($warnFile)) : '';
        @unlink($warnFile);

        $notes = sprintf(
            'ไฟล์ %s (%s) ที่ %s · เก็บไว้ไม่เกิน %d ไฟล์ล่าสุดของชุดนี้',
            $filename,
            $this->formatBytes($bytes),
            $directory,
            $keep
        );
        if ($pruned['deleted'] !== []) {
            $notes .= ' · ลบของเก่า: '.implode(', ', $pruned['deleted']);
        }
        if ($pruned['failed'] !== []) {
            $notes .= ' · ลบไม่สำเร็จ: '.implode(', ', $pruned['failed']);
        }
        if ($warning !== '') {
            $notes .= ' · คำเตือน: '.mb_substr($warning, 0, 500);
        }

        BackupLog::create([
            'backup_date' => now('Asia/Bangkok')->toDateString(),
            'type' => 'offline',
            'scope' => $config['label'].' '.$database.' @ '.$host,
            'status' => $warning !== '' || $pruned['failed'] !== [] ? 'partial' : 'success',
            'size_gb' => round($bytes / 1073741824, 4),
            'notes' => $notes,
            'performed_by' => $config['performed_by'],
        ]);

        return [
            'path' => $path,
            'bytes' => $bytes,
            'kept' => $this->existingDumps($directory, $prefix)->count(),
            'deleted' => $pruned['deleted'],
        ];
    }

    /**
     * Stream mysqldump stdout → gzip โดยตรง (ไม่สร้าง .sql ชั่วคราวทั้งก้อน)
     * ใช้ popen เพื่อเลี่ยง OOM ของ Symfony Process บน Windows
     */
    private function streamDumpToGzip(string $cnf, string $charset, string $database, string $path): void
    {
        $gzip = gzopen($path, 'wb9');
        if ($gzip === false) {
            throw new RuntimeException('เปิดไฟล์สำรองไม่ได้: '.$path);
        }

        $stderrFile = $path.'.stderr';
        @unlink($stderrFile);

        $command = $this->commandLine([
            $this->dumpBinary(),
            '--defaults-extra-file='.$cnf,
            '--single-transaction',
            '--quick',
            '--routines',
            '--triggers',
            '--events',
            '--hex-blob',
            '--force',
            '--default-character-set='.$charset,
            $database,
        ]).' 2>'.$this->commandLine([$stderrFile]);

        $handle = popen($command, 'rb');
        if ($handle === false) {
            gzclose($gzip);
            throw new RuntimeException('เริ่ม mysqldump ไม่ได้');
        }

        $bytesWritten = 0;
        try {
            while (! feof($handle)) {
                $chunk = fread($handle, 1024 * 1024);
                if ($chunk === false) {
                    break;
                }
                if ($chunk !== '') {
                    gzwrite($gzip, $chunk);
                    $bytesWritten += strlen($chunk);
                }
            }
        } finally {
            $exitCode = pclose($handle);
            gzclose($gzip);
        }

        $stderr = is_file($stderrFile) ? trim((string) file_get_contents($stderrFile)) : '';
        @unlink($stderrFile);

        if ($bytesWritten < 1024) {
            throw new RuntimeException(
                $stderr !== '' ? $stderr : 'mysqldump ไม่ได้เขียนข้อมูล (exit '.$exitCode.')'
            );
        }

        // --force อาจทำให้ exit != 0 ทั้งที่ dump ส่วนใหญ่สำเร็จ
        if ($exitCode !== 0 && $stderr !== '') {
            file_put_contents($path.'.warn', mb_substr($stderr, 0, 4000));
        }
    }

    /**
     * @param  list<string>  $parts
     */
    private function commandLine(array $parts): string
    {
        return implode(' ', array_map(static function (string $part): string {
            if ($part === '') {
                return '""';
            }
            if (preg_match('/^[A-Za-z0-9_.:\\\\\/\-]+$/', $part) === 1) {
                return $part;
            }

            return '"'.str_replace('"', '""', $part).'"';
        }, $parts));
    }

    /**
     * @return array{connection:string,prefix:string,label:string,performed_by:string,keep?:int}
     */
    private function job(string $job): array
    {
        $config = config('database_backup.jobs.'.$job);
        if (! is_array($config) || empty($config['connection']) || empty($config['prefix'])) {
            throw new RuntimeException('ไม่พบงานสำรอง: '.$job);
        }

        return $config;
    }

    private function dumpBinary(): string
    {
        $candidates = array_filter([
            (string) config('database_backup.dump_binary'),
            'D:\\Xampp\\mysql\\bin\\mysqldump.exe',
            'C:\\xampp\\mysql\\bin\\mysqldump.exe',
            'mysqldump',
        ]);

        foreach ($candidates as $bin) {
            $bin = trim((string) $bin, " \t\"'");
            if ($bin === '') {
                continue;
            }
            if ($bin === 'mysqldump' || is_file($bin)) {
                return $bin;
            }
        }

        throw new RuntimeException('ไม่พบ mysqldump.exe กรุณาตั้ง HOSXP_BACKUP_DUMP_BIN');
    }

    /**
     * @return array{deleted:list<string>,failed:list<string>}
     */
    private function prune(string $directory, string $prefix, int $keep): array
    {
        $files = $this->existingDumps($directory, $prefix)->values();
        $deleted = [];
        $failed = [];

        foreach ($files->slice($keep) as $file) {
            $path = (string) $file;
            $name = basename($path);
            if (@unlink($path) || ! is_file($path)) {
                $deleted[] = $name;
                @unlink($path.'.warn');
                @unlink($path.'.stderr');
            } else {
                $failed[] = $name;
            }
        }

        return [
            'deleted' => $deleted,
            'failed' => $failed,
        ];
    }

    private function existingDumps(string $directory, string $prefix)
    {
        $files = glob($directory.DIRECTORY_SEPARATOR.$prefix.'-*.sql.gz') ?: [];
        // เรียงใหม่สุดก่อน จาก mtime แล้วค่อยชื่อไฟล์ (กันกรณีชื่อไม่เรียงตามเวลา)
        usort($files, static function (string $a, string $b): int {
            $ma = @filemtime($a) ?: 0;
            $mb = @filemtime($b) ?: 0;
            if ($ma !== $mb) {
                return $mb <=> $ma;
            }

            return strcmp($b, $a);
        });

        return collect($files);
    }

    private function cleanupOrphanedCnf(string $directory): void
    {
        foreach (glob($directory.DIRECTORY_SEPARATOR.'.mysqldump-*.cnf') ?: [] as $file) {
            @unlink($file);
        }
    }

    private function cleanupSidecarFiles(string $directory, string $prefix): void
    {
        foreach (glob($directory.DIRECTORY_SEPARATOR.$prefix.'-*.sql.gz.warn') ?: [] as $file) {
            $dump = substr($file, 0, -5); // strip .warn
            if (! is_file($dump)) {
                @unlink($file);
            }
        }
        foreach (glob($directory.DIRECTORY_SEPARATOR.$prefix.'-*.sql.gz.stderr') ?: [] as $file) {
            @unlink($file);
        }
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes >= 1073741824) {
            return round($bytes / 1073741824, 2).' GB';
        }
        if ($bytes >= 1048576) {
            return round($bytes / 1048576, 1).' MB';
        }

        return round($bytes / 1024, 1).' KB';
    }

    private function logFailure(string $job, string $message): void
    {
        $config = $this->job($job);
        $connection = $config['connection'];

        BackupLog::create([
            'backup_date' => now('Asia/Bangkok')->toDateString(),
            'type' => 'offline',
            'scope' => $config['label'].' '.(string) config("database.connections.{$connection}.database").' @ '.(string) config("database.connections.{$connection}.host"),
            'status' => 'failed',
            'size_gb' => null,
            'notes' => mb_substr($message, 0, 2000),
            'performed_by' => $config['performed_by'],
        ]);
    }
}
