<?php

namespace Tests\Unit;

use App\Services\Backup\DatabasusCipher;
use PHPUnit\Framework\TestCase;
use RuntimeException;

class DatabasusCipherTest extends TestCase
{
    private string $directory;

    protected function setUp(): void
    {
        parent::setUp();
        $this->directory = sys_get_temp_dir().DIRECTORY_SEPARATOR.'databasus-cipher-'.bin2hex(random_bytes(4));
        mkdir($this->directory);
    }

    protected function tearDown(): void
    {
        foreach (glob($this->directory.DIRECTORY_SEPARATOR.'*') ?: [] as $file) {
            if (is_file($file)) {
                unlink($file);
            }
        }
        @rmdir($this->directory);
        parent::tearDown();
    }

    public function test_round_trip_of_multiple_chunks_matches_databasus_layout(): void
    {
        $cipher = new DatabasusCipher;
        $source = $this->directory.DIRECTORY_SEPARATOR.'plain.bin';
        $encrypted = $this->directory.DIRECTORY_SEPARATOR.'backup.bin';
        $restored = $this->directory.DIRECTORY_SEPARATOR.'restored.bin';
        $plain = random_bytes(DatabasusCipher::CHUNK_SIZE + 100);
        file_put_contents($source, $plain);

        $masterKey = 'test-master-key';
        $metadata = $cipher->encrypt($source, $encrypted, $masterKey);

        $raw = file_get_contents($encrypted);
        $this->assertIsString($raw);
        $this->assertSame(DatabasusCipher::MAGIC, substr($raw, 0, 8));
        $this->assertSame(str_repeat("\0", 56), substr($raw, 8, 56));
        $this->assertSame('ENCRYPTED', $metadata['encryption']);
        $this->assertFileExists($encrypted.'.metadata');

        $stored = json_decode((string) file_get_contents($encrypted.'.metadata'), true);
        $this->assertSame($metadata, $stored);

        $length = unpack('N', substr($raw, 64, 4))[1];
        $payload = substr($raw, 68, $length);
        $salt = base64_decode($metadata['encryptionSalt'], true);
        $iv = base64_decode($metadata['encryptionIV'], true);
        $key = hash_pbkdf2(
            'sha256',
            $masterKey.$metadata['backupId'],
            $salt,
            DatabasusCipher::PBKDF2_ITERATIONS,
            32,
            true
        );
        $first = openssl_decrypt(
            substr($payload, 0, -16),
            'aes-256-gcm',
            $key,
            OPENSSL_RAW_DATA,
            substr($iv, 0, 4).pack('J', 0),
            substr($payload, -16),
            ''
        );

        $this->assertSame(substr($plain, 0, DatabasusCipher::CHUNK_SIZE), $first);

        $cipher->decrypt($encrypted, $encrypted.'.metadata', $restored, $masterKey);
        $this->assertSame($plain, file_get_contents($restored));
    }

    public function test_tampered_ciphertext_is_rejected(): void
    {
        $cipher = new DatabasusCipher;
        $source = $this->directory.DIRECTORY_SEPARATOR.'plain.bin';
        $encrypted = $this->directory.DIRECTORY_SEPARATOR.'backup.bin';
        file_put_contents($source, 'hospital-backup');
        $cipher->encrypt($source, $encrypted, 'test-master-key');

        $raw = file_get_contents($encrypted);
        $raw[80] = $raw[80] === 'A' ? 'B' : 'A';
        file_put_contents($encrypted, $raw);

        $this->expectException(RuntimeException::class);
        $cipher->decrypt(
            $encrypted,
            $encrypted.'.metadata',
            $this->directory.DIRECTORY_SEPARATOR.'restored.bin',
            'test-master-key'
        );
    }

    public function test_wrong_master_key_is_rejected(): void
    {
        $cipher = new DatabasusCipher;
        $source = $this->directory.DIRECTORY_SEPARATOR.'plain.bin';
        $encrypted = $this->directory.DIRECTORY_SEPARATOR.'backup.bin';
        file_put_contents($source, 'hospital-backup');
        $cipher->encrypt($source, $encrypted, 'test-master-key');

        $this->expectException(RuntimeException::class);
        $cipher->decrypt(
            $encrypted,
            $encrypted.'.metadata',
            $this->directory.DIRECTORY_SEPARATOR.'restored.bin',
            'other-master-key'
        );
    }
}
