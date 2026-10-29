<?php

namespace App\Console\Commands;

use App\Services\Backup\GoogleDriveTokenStore;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

class AuthorizeGoogleDriveBackup extends Command
{
    protected $signature = 'backup:drive-auth
                            {--client-id= : OAuth client id ชนิด Desktop}
                            {--client-secret= : OAuth client secret}';

    protected $description = 'ล็อกอิน Google Drive ครั้งเดียว แล้วเก็บ refresh token ไว้นอกโปรเจกต์';

    public function handle(GoogleDriveTokenStore $tokens): int
    {
        if ($tokens->path() === '') {
            $this->error('ตั้ง BACKUP_DRIVE_TOKEN_FILE เป็น path นอกโปรเจกต์ก่อน');

            return self::FAILURE;
        }

        if (! config()->has('drive_backup')) {
            $this->error('config ถูก cache ไว้ก่อนหน้านี้ ให้รัน php artisan config:clear แล้วลองใหม่');

            return self::FAILURE;
        }

        $this->line('ใช้ OAuth Client ชนิด Desktop ใน Google Cloud แล้วเปิด Drive API');
        $this->line('ไม่ต้องลงทะเบียน redirect URI คงที่ เพราะใช้ลูปแบ็กบนเครื่องนี้');

        try {
            [$clientId, $clientSecret] = $this->credentials($tokens);
            $granted = $this->authorize($clientId, $clientSecret);
        } catch (Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $tokens->write([
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'refresh_token' => $granted['refresh_token'],
            'access_token' => $granted['access_token'],
            'expires_at' => $granted['expires_at'],
        ]);

        $this->info('บันทึก token แล้วที่ '.$tokens->path());
        $keyFile = trim((string) config('drive_backup.key_file'));
        if ($keyFile === '' || ! is_file($keyFile)) {
            $this->warn('ยังไม่มีไฟล์คีย์ สร้างแล้วเก็บนอกโปรเจกต์ และห้ามอัปโหลดไฟล์นี้');
            $this->line('php -r "echo bin2hex(random_bytes(32));"');
        }

        return self::SUCCESS;
    }

    /**
     * @return array{0:string,1:string}
     */
    private function credentials(GoogleDriveTokenStore $tokens): array
    {
        $existing = [];
        if (is_file($tokens->path())) {
            try {
                $existing = $tokens->read();
            } catch (Throwable) {
                $existing = [];
            }
        }

        $clientId = trim((string) $this->option('client-id'));
        $clientSecret = (string) $this->option('client-secret');
        if ($clientId !== '' && $clientSecret !== '') {
            return [$clientId, $clientSecret];
        }

        if (($existing['client_id'] ?? '') !== '' && ($existing['client_secret'] ?? '') !== '' && $this->confirm('ใช้ OAuth client เดิมหรือไม่', true)) {
            return [(string) $existing['client_id'], (string) $existing['client_secret']];
        }

        $clientId = trim((string) $this->ask('OAuth client id (ชนิด Desktop)'));
        $clientSecret = (string) $this->secret('OAuth client secret');
        if ($clientId === '' || $clientSecret === '') {
            throw new RuntimeException('ต้องมีทั้ง client id และ client secret');
        }

        return [$clientId, $clientSecret];
    }

    /**
     * @return array{refresh_token:string,access_token:string,expires_at:int}
     */
    private function authorize(string $clientId, string $clientSecret): array
    {
        $errno = 0;
        $errstr = '';
        $server = stream_socket_server('tcp://127.0.0.1:0', $errno, $errstr);
        if ($server === false) {
            throw new RuntimeException('เปิดพอร์ตลูปแบ็กไม่ได้: '.$errstr);
        }

        try {
            $name = stream_socket_get_name($server, false);
            $port = (int) substr((string) strrchr((string) $name, ':'), 1);
            $redirect = 'http://127.0.0.1:'.$port;
            $state = bin2hex(random_bytes(16));
            $verifier = $this->codeVerifier();
            $url = 'https://accounts.google.com/o/oauth2/v2/auth?'.http_build_query([
                'client_id' => $clientId,
                'redirect_uri' => $redirect,
                'response_type' => 'code',
                'scope' => 'https://www.googleapis.com/auth/drive.file',
                'access_type' => 'offline',
                'prompt' => 'consent',
                'state' => $state,
                'code_challenge' => $this->codeChallenge($verifier),
                'code_challenge_method' => 'S256',
            ], '', '&', PHP_QUERY_RFC3986);

            $this->line('เปิดลิงก์นี้ถ้าเบราว์เซอร์ไม่ขึ้นเอง แล้วรอไม่เกิน 3 นาที');
            $this->line($url);
            $this->openBrowser($url);

            $code = $this->waitForCode($server, $state);
        } finally {
            fclose($server);
        }

        $response = Http::asForm()
            ->connectTimeout(15)
            ->timeout(30)
            ->post('https://oauth2.googleapis.com/token', [
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'code' => $code,
                'redirect_uri' => $redirect,
                'grant_type' => 'authorization_code',
                'code_verifier' => $verifier,
            ]);

        if (! $response->successful()) {
            $message = (string) ($response->json('error_description') ?: $response->json('error') ?: '');
            throw new RuntimeException('แลก refresh token ไม่สำเร็จ '.mb_substr($message, 0, 300));
        }

        $refresh = $response->json('refresh_token');
        $access = $response->json('access_token');
        if (! is_string($refresh) || $refresh === '' || ! is_string($access) || $access === '') {
            throw new RuntimeException('Google ไม่คืน refresh token ให้ถอนสิทธิ์แอปแล้วล็อกอินใหม่');
        }

        return [
            'refresh_token' => $refresh,
            'access_token' => $access,
            'expires_at' => time() + (int) $response->json('expires_in', 3600),
        ];
    }

    /**
     * @param  resource  $server
     */
    private function waitForCode($server, string $state): string
    {
        $deadline = time() + 180;
        while (time() < $deadline) {
            $connection = @stream_socket_accept($server, max(1, $deadline - time()));
            if ($connection === false) {
                continue;
            }

            stream_set_timeout($connection, 10);
            $raw = '';
            while (! str_contains($raw, "\r\n\r\n") && strlen($raw) < 16384) {
                $chunk = fread($connection, 1024);
                if ($chunk === false || $chunk === '') {
                    break;
                }
                $raw .= $chunk;
            }

            $query = $this->queryFromRequest($raw);
            $path = (string) ($query['path'] ?? '');
            if ($path === '/favicon.ico') {
                fwrite($connection, "HTTP/1.1 404 Not Found\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
                fclose($connection);

                continue;
            }

            $code = (string) ($query['code'] ?? '');
            $body = '<!doctype html><meta charset="utf-8"><title>Google Drive</title><p>เชื่อม Google Drive แล้ว ปิดหน้านี้ได้</p>';
            if ($code !== '' && ! hash_equals($state, (string) ($query['state'] ?? ''))) {
                $body = '<!doctype html><meta charset="utf-8"><title>Google Drive</title><p>state ไม่ตรง ปิดหน้านี้แล้วรันคำสั่งใหม่</p>';
            }
            fwrite($connection, "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: ".strlen($body)."\r\nConnection: close\r\n\r\n".$body);
            fclose($connection);

            if (($query['error'] ?? '') !== '') {
                throw new RuntimeException('Google ปฏิเสธการล็อกอิน: '.$query['error']);
            }
            if (($query['code'] ?? '') !== '') {
                if (! hash_equals($state, (string) ($query['state'] ?? ''))) {
                    throw new RuntimeException('state ของการล็อกอินไม่ตรง');
                }

                return (string) $query['code'];
            }
        }

        throw new RuntimeException('หมดเวลารอล็อกอิน Google');
    }

    /**
     * @return array{path:string,code?:string,state?:string,error?:string}
     */
    private function queryFromRequest(string $raw): array
    {
        $line = strtok($raw, "\r\n") ?: '';
        if (! preg_match('/^GET\s+(\S+)\s+HTTP/i', $line, $matches)) {
            return ['path' => ''];
        }

        $parts = parse_url($matches[1]);
        $params = [];
        parse_str((string) ($parts['query'] ?? ''), $params);

        return [
            'path' => (string) ($parts['path'] ?? ''),
            'code' => isset($params['code']) ? (string) $params['code'] : '',
            'state' => isset($params['state']) ? (string) $params['state'] : '',
            'error' => isset($params['error']) ? (string) $params['error'] : '',
        ];
    }

    private function codeVerifier(): string
    {
        return rtrim(strtr(base64_encode(random_bytes(64)), '+/', '-_'), '=');
    }

    private function codeChallenge(string $verifier): string
    {
        return rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '=');
    }

    private function openBrowser(string $url): void
    {
        if (PHP_OS_FAMILY !== 'Windows') {
            return;
        }

        pclose(popen('cmd /c start "" '.escapeshellarg($url), 'r'));
    }
}
