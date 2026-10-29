<?php

namespace App\Console\Commands;

use App\Services\Backup\DatabasusCipher;
use Illuminate\Console\Command;
use Throwable;

class DecryptDriveBackup extends Command
{
    protected $signature = 'backup:drive-decrypt
                            {file : ไฟล์ที่เข้ารหัส}
                            {--metadata= : ไฟล์ .metadata ค่าเริ่มต้นคือชื่อไฟล์ตามด้วย .metadata}
                            {--output= : ไฟล์ผลลัพธ์}
                            {--key-file= : ไฟล์ secret.key ถ้าไม่ระบุใช้ BACKUP_DRIVE_KEY_FILE}';

    protected $description = 'ถอดรหัสไฟล์สำรองแบบ Databasus ด้วย secret.key นอกเว็บ';

    public function handle(DatabasusCipher $cipher): int
    {
        $file = (string) $this->argument('file');
        $metadata = $this->option('metadata');
        $metadata = is_string($metadata) && $metadata !== '' ? $metadata : $file.'.metadata';
        $output = $this->option('output');
        $output = is_string($output) && $output !== ''
            ? $output
            : dirname($file).DIRECTORY_SEPARATOR.'decrypted_'.basename($file);
        $keyFile = $this->option('key-file');
        $keyFile = is_string($keyFile) && $keyFile !== '' ? $keyFile : trim((string) config('drive_backup.key_file'));

        if (is_file($output)) {
            $this->error('มีไฟล์ผลลัพธ์อยู่แล้ว: '.$output);

            return self::FAILURE;
        }

        try {
            $cipher->decrypt($file, $metadata, $output, $cipher->masterKeyFromFile($keyFile));
        } catch (Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->info('ถอดรหัสแล้ว: '.$output);
        $header = (string) file_get_contents($output, false, null, 0, 2);
        if ($header === "\x1f\x8b") {
            $this->line('ไฟล์นี้เป็น gzip ของ dump ให้แตก .sql.gz แล้วค่อยนำเข้า MySQL');
        }
        $this->line('หรือใช้ python scripts/decrypt-databasus-backup.py โดยไม่ต้องมีแอปนี้');

        return self::SUCCESS;
    }
}
