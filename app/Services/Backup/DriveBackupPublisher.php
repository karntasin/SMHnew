<?php

namespace App\Services\Backup;

use RuntimeException;
use Throwable;

class DriveBackupPublisher
{
    public function __construct(
        private DatabasusCipher $cipher,
        private GoogleDriveBackupUploader $drive,
    ) {}

    public function isEnabled(): bool
    {
        return trim((string) config('drive_backup.key_file')) !== ''
            || trim((string) config('drive_backup.token_file')) !== '';
    }

    public function isConfigured(): bool
    {
        $keyFile = trim((string) config('drive_backup.key_file'));
        if ($keyFile === '' || ! is_file($keyFile)) {
            return false;
        }

        return (new GoogleDriveTokenStore)->isReady();
    }

    /**
     * @return array{remote:string,bytes:int,deleted:list<string>,failed:list<string>}
     */
    public function publish(string $sourcePath, string $stem): array
    {
        if (! is_file($sourcePath)) {
            throw new RuntimeException('ไม่พบไฟล์ที่จะส่งขึ้น Google Drive');
        }
        if (! $this->isConfigured()) {
            throw new RuntimeException('ยังตั้งค่า Google Drive ไม่ครบ');
        }

        $stem = trim(str_replace(['/', '\\', "\0"], '-', $stem), '-');
        if ($stem === '') {
            throw new RuntimeException('ชื่อไฟล์สำรองว่าง');
        }

        $backupId = $this->cipher->newBackupId();
        $remote = $stem.'-'.$backupId;
        $work = $this->workDirectory($backupId);
        $destination = $work.DIRECTORY_SEPARATOR.$remote;
        $dataId = null;

        try {
            $this->cipher->encrypt(
                $sourcePath,
                $destination,
                $this->cipher->masterKeyFromFile(trim((string) config('drive_backup.key_file'))),
                $backupId
            );

            $folderId = $this->drive->ensureFolder((string) config('drive_backup.folder_name', 'SSS-Backups'));
            $dataId = $this->drive->upload($destination, $remote, $folderId);
            try {
                $this->drive->upload($destination.'.metadata', $remote.'.metadata', $folderId, 'application/json');
            } catch (Throwable $e) {
                if (is_string($dataId)) {
                    try {
                        $this->drive->delete($dataId);
                    } catch (Throwable) {
                        // ไฟล์ข้อมูลที่ไม่มี metadata คู่กันถอดรหัสไม่ได้ ลบไม่สำเร็จก็ยังรายงานความล้มเหลวเดิม
                    }
                }
                throw $e;
            }

            $pruned = $this->drive->prune((int) config('drive_backup.keep', 14));

            return [
                'remote' => $remote,
                'bytes' => (int) filesize($sourcePath),
                'deleted' => $pruned['deleted'],
                'failed' => $pruned['failed'],
            ];
        } finally {
            $this->deleteWork($work);
        }
    }

    private function workDirectory(string $backupId): string
    {
        $root = (string) config('drive_backup.temp_directory');
        if ($root === '') {
            $root = storage_path('app/drive-backup-temp');
        }
        $work = rtrim($root, '\\/').DIRECTORY_SEPARATOR.$backupId;
        if (! is_dir($work) && ! mkdir($work, 0700, true) && ! is_dir($work)) {
            throw new RuntimeException('สร้างโฟลเดอร์ชั่วคราวสำหรับเข้ารหัสไม่ได้');
        }

        return $work;
    }

    private function deleteWork(string $work): void
    {
        foreach (glob($work.DIRECTORY_SEPARATOR.'*') ?: [] as $file) {
            if (is_file($file)) {
                @unlink($file);
            }
        }
        @rmdir($work);
    }
}
