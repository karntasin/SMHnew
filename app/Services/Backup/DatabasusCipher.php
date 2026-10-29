<?php

namespace App\Services\Backup;

use RuntimeException;
use Throwable;

/**
 * รูปแบบไฟล์ตรงกับสคริปต์กู้คืนของ Databasus:
 * magic PGRSUS01, เฮดเดอร์ 64 ไบต์, ชิ้นละไม่เกิน 1 MB, AES-256-GCM
 * คีย์ต่อไฟล์มาจาก PBKDF2-HMAC-SHA256(masterKey + backupId, salt, 100000) ยาว 32 ไบต์
 */
class DatabasusCipher
{
    public const MAGIC = 'PGRSUS01';

    public const HEADER_LENGTH = 64;

    public const CHUNK_SIZE = 1048576;

    public const PBKDF2_ITERATIONS = 100000;

    public function newBackupId(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0F) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3F) | 0x80);
        $hex = bin2hex($bytes);

        return substr($hex, 0, 8).'-'.substr($hex, 8, 4).'-'.substr($hex, 12, 4).'-'.substr($hex, 16, 4).'-'.substr($hex, 20, 12);
    }

    public function masterKeyFromFile(string $path): string
    {
        if ($path === '' || ! is_file($path)) {
            throw new RuntimeException('ไม่พบไฟล์คีย์สำรอง ตั้ง BACKUP_DRIVE_KEY_FILE นอกโปรเจกต์');
        }

        $key = rtrim((string) file_get_contents($path), "\r\n");
        if ($key === '') {
            throw new RuntimeException('ไฟล์คีย์สำรองว่าง');
        }

        return $key;
    }

    /**
     * @return array{backupId:string,encryptionSalt:string,encryptionIV:string,encryption:string}
     */
    public function encrypt(string $sourcePath, string $destinationPath, string $masterKey, ?string $backupId = null): array
    {
        if (! is_file($sourcePath)) {
            throw new RuntimeException('ไม่พบไฟล์ต้นทางสำหรับเข้ารหัส');
        }
        if ($masterKey === '') {
            throw new RuntimeException('ไม่มีคีย์มาสเตอร์สำหรับเข้ารหัส');
        }

        $backupId = $backupId ?? $this->newBackupId();
        $this->assertBackupId($backupId);

        $salt = random_bytes(16);
        $iv = random_bytes(12);
        $key = $this->deriveKey($masterKey, $backupId, $salt);

        $input = fopen($sourcePath, 'rb');
        if ($input === false) {
            throw new RuntimeException('เปิดไฟล์ต้นทางไม่ได้');
        }

        $output = fopen($destinationPath, 'wb');
        if ($output === false) {
            fclose($input);
            throw new RuntimeException('สร้างไฟล์เข้ารหัสไม่ได้');
        }

        $metadata = [
            'backupId' => $backupId,
            'encryptionSalt' => base64_encode($salt),
            'encryptionIV' => base64_encode($iv),
            'encryption' => 'ENCRYPTED',
        ];

        try {
            if (fwrite($output, str_pad(self::MAGIC, self::HEADER_LENGTH, "\0")) === false) {
                throw new RuntimeException('เขียนเฮดเดอร์ไฟล์เข้ารหัสไม่ได้');
            }

            $index = 0;
            while (! feof($input)) {
                $plain = $this->readChunk($input, self::CHUNK_SIZE);
                if ($plain === '') {
                    break;
                }

                $tag = '';
                $cipher = openssl_encrypt(
                    $plain,
                    'aes-256-gcm',
                    $key,
                    OPENSSL_RAW_DATA,
                    $this->chunkNonce($iv, $index),
                    $tag,
                    '',
                    16
                );
                if ($cipher === false || strlen($tag) !== 16) {
                    throw new RuntimeException('เข้ารหัสชิ้นข้อมูลไม่ได้');
                }

                $payload = $cipher.$tag;
                if (fwrite($output, pack('N', strlen($payload))) === false || fwrite($output, $payload) === false) {
                    throw new RuntimeException('เขียนไฟล์เข้ารหัสไม่ได้');
                }
                $index++;
            }
        } catch (Throwable $e) {
            fclose($input);
            fclose($output);
            @unlink($destinationPath);
            @unlink($destinationPath.'.metadata');
            throw $e;
        }

        fclose($input);
        fclose($output);

        $encoded = json_encode($metadata, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR);
        if (file_put_contents($destinationPath.'.metadata', $encoded) === false) {
            @unlink($destinationPath);
            throw new RuntimeException('เขียนไฟล์ metadata ไม่ได้');
        }

        return $metadata;
    }

    public function decrypt(string $encryptedPath, string $metadataPath, string $destinationPath, string $masterKey): void
    {
        if (! is_file($encryptedPath)) {
            throw new RuntimeException('ไม่พบไฟล์ที่เข้ารหัส');
        }
        if (! is_file($metadataPath)) {
            throw new RuntimeException('ไม่พบไฟล์ metadata');
        }
        if ($masterKey === '') {
            throw new RuntimeException('ไม่มีคีย์มาสเตอร์สำหรับถอดรหัส');
        }

        $metadata = json_decode((string) file_get_contents($metadataPath), true);
        if (! is_array($metadata)) {
            throw new RuntimeException('อ่าน metadata ไม่ได้');
        }

        $encryption = strtoupper((string) ($metadata['encryption'] ?? ''));
        if ($encryption !== 'ENCRYPTED') {
            throw new RuntimeException('ไฟล์นี้ไม่ได้เข้ารหัสตามรูปแบบที่รองรับ');
        }

        $backupId = (string) ($metadata['backupId'] ?? '');
        $this->assertBackupId($backupId);
        $salt = base64_decode((string) ($metadata['encryptionSalt'] ?? ''), true);
        $iv = base64_decode((string) ($metadata['encryptionIV'] ?? ''), true);
        if (! is_string($salt) || strlen($salt) < 8 || ! is_string($iv) || strlen($iv) !== 12) {
            throw new RuntimeException('metadata ไม่มี salt หรือ IV ที่ใช้ได้');
        }

        $key = $this->deriveKey($masterKey, $backupId, $salt);
        $input = fopen($encryptedPath, 'rb');
        if ($input === false) {
            throw new RuntimeException('เปิดไฟล์ที่เข้ารหัสไม่ได้');
        }

        $output = fopen($destinationPath, 'wb');
        if ($output === false) {
            fclose($input);
            throw new RuntimeException('สร้างไฟล์ถอดรหัสไม่ได้');
        }

        try {
            $header = $this->readExact($input, self::HEADER_LENGTH);
            if (substr($header, 0, strlen(self::MAGIC)) !== self::MAGIC) {
                throw new RuntimeException('ไฟล์สำรองไม่ใช่รูปแบบ PGRSUS01');
            }

            $index = 0;
            while (! feof($input)) {
                $lengthBytes = fread($input, 4);
                if ($lengthBytes === false || $lengthBytes === '') {
                    break;
                }
                if (strlen($lengthBytes) !== 4) {
                    $lengthBytes = $this->readExact($input, 4, $lengthBytes);
                }

                $length = unpack('N', $lengthBytes)[1];
                if ($length < 16 || $length > self::CHUNK_SIZE + 16) {
                    throw new RuntimeException('ความยาวชิ้นข้อมูลไม่ถูกต้อง');
                }

                $payload = $this->readExact($input, $length);
                $plain = openssl_decrypt(
                    substr($payload, 0, -16),
                    'aes-256-gcm',
                    $key,
                    OPENSSL_RAW_DATA,
                    $this->chunkNonce($iv, $index),
                    substr($payload, -16),
                    ''
                );
                if ($plain === false) {
                    throw new RuntimeException('ถอดรหัสไม่สำเร็จ ที่ชิ้น '.$index.' (คีย์ไม่ตรง ไฟล์เสีย หรือ metadata ไม่คู่กัน)');
                }
                if (fwrite($output, $plain) === false) {
                    throw new RuntimeException('เขียนไฟล์ถอดรหัสไม่ได้');
                }
                $index++;
            }
        } catch (Throwable $e) {
            fclose($input);
            fclose($output);
            @unlink($destinationPath);
            throw $e;
        }

        fclose($input);
        fclose($output);
    }

    public function deriveKey(string $masterKey, string $backupId, string $salt): string
    {
        return hash_pbkdf2('sha256', $masterKey.$backupId, $salt, self::PBKDF2_ITERATIONS, 32, true);
    }

    public function chunkNonce(string $iv, int $index): string
    {
        if (strlen($iv) !== 12) {
            throw new RuntimeException('IV ต้องยาว 12 ไบต์');
        }

        return substr($iv, 0, 4).pack('J', $index);
    }

    private function assertBackupId(string $backupId): void
    {
        if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $backupId) !== 1) {
            throw new RuntimeException('backup id ไม่ถูกต้อง');
        }
    }

    /**
     * @param  resource  $handle
     */
    private function readChunk($handle, int $length): string
    {
        $data = '';
        while (strlen($data) < $length && ! feof($handle)) {
            $chunk = fread($handle, $length - strlen($data));
            if ($chunk === false || $chunk === '') {
                break;
            }
            $data .= $chunk;
        }

        return $data;
    }

    /**
     * @param  resource  $handle
     */
    private function readExact($handle, int $length, string $prefix = ''): string
    {
        $data = $prefix;
        while (strlen($data) < $length) {
            $chunk = fread($handle, $length - strlen($data));
            if ($chunk === false || $chunk === '') {
                break;
            }
            $data .= $chunk;
        }

        if (strlen($data) !== $length) {
            throw new RuntimeException('ไฟล์สำรองไม่ครบ');
        }

        return $data;
    }
}
