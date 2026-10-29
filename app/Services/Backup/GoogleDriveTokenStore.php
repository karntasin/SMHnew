<?php

namespace App\Services\Backup;

use RuntimeException;

class GoogleDriveTokenStore
{
    public function path(): string
    {
        return trim((string) config('drive_backup.token_file'));
    }

    public function isReady(): bool
    {
        if (! is_file($this->path())) {
            return false;
        }

        $data = $this->read();

        return ($data['client_id'] ?? '') !== ''
            && ($data['client_secret'] ?? '') !== ''
            && ($data['refresh_token'] ?? '') !== '';
    }

    /**
     * @return array<string, mixed>
     */
    public function read(): array
    {
        $path = $this->path();
        if ($path === '' || ! is_file($path)) {
            throw new RuntimeException('ไม่พบไฟล์ token ของ Google Drive ตั้ง BACKUP_DRIVE_TOKEN_FILE แล้วยังรัน backup:drive-auth');
        }

        $data = json_decode((string) file_get_contents($path), true);
        if (! is_array($data)) {
            throw new RuntimeException('ไฟล์ token ของ Google Drive อ่านไม่ได้');
        }

        return $data;
    }

    /**
     * @param  array<string, mixed>  $values
     */
    public function put(array $values): void
    {
        $current = is_file($this->path()) ? $this->read() : [];
        $this->write(array_merge($current, $values));
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function write(array $data): void
    {
        $path = $this->path();
        if ($path === '') {
            throw new RuntimeException('ยังไม่ตั้ง BACKUP_DRIVE_TOKEN_FILE');
        }

        $directory = dirname($path);
        if (! is_dir($directory) && ! mkdir($directory, 0700, true) && ! is_dir($directory)) {
            throw new RuntimeException('สร้างโฟลเดอร์เก็บ token ไม่ได้');
        }

        $encoded = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR);
        if (file_put_contents($path, $encoded, LOCK_EX) === false) {
            throw new RuntimeException('บันทึกไฟล์ token ไม่ได้');
        }

        @chmod($path, 0600);
    }
}
