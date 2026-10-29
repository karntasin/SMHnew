<?php

namespace App\Services\Backup;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class GoogleDriveBackupUploader
{
    private const UPLOAD_CHUNK = 8388608;

    private GoogleDriveTokenStore $tokens;

    /** @var array<string, mixed>|null */
    private ?array $token = null;

    private ?string $folderId = null;

    private bool $refreshed = false;

    public function __construct(?GoogleDriveTokenStore $tokens = null)
    {
        $this->tokens = $tokens ?? new GoogleDriveTokenStore;
    }

    public function ensureFolder(string $name): string
    {
        if ($this->folderId !== null) {
            return $this->folderId;
        }

        $name = trim($name);
        if ($name === '') {
            throw new RuntimeException('ไม่ได้ตั้งชื่อโฟลเดอร์บน Google Drive');
        }

        $response = $this->get('https://www.googleapis.com/drive/v3/files', [
            'q' => "name = '".$this->escapeQuery($name)."' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
            'fields' => 'files(id,name)',
            'pageSize' => 10,
            'spaces' => 'drive',
        ]);
        $this->assertOk($response, 'ค้นหาโฟลเดอร์บน Google Drive');

        $existing = $response->json('files.0.id');
        if (is_string($existing) && $existing !== '') {
            return $this->folderId = $existing;
        }

        $created = $this->post('https://www.googleapis.com/drive/v3/files', [
            'name' => $name,
            'mimeType' => 'application/vnd.google-apps.folder',
        ]);
        $this->assertOk($created, 'สร้างโฟลเดอร์บน Google Drive');

        $id = $created->json('id');
        if (! is_string($id) || $id === '') {
            throw new RuntimeException('Google Drive ไม่คืนรหัสโฟลเดอร์');
        }

        return $this->folderId = $id;
    }

    public function upload(string $path, string $name, string $folderId, string $mime = 'application/octet-stream'): string
    {
        if (! is_file($path)) {
            throw new RuntimeException('ไม่พบไฟล์ที่จะอัปโหลด');
        }

        $size = (int) filesize($path);
        $session = $this->startSession($name, $folderId, $mime, $size);
        $input = fopen($path, 'rb');
        if ($input === false) {
            throw new RuntimeException('เปิดไฟล์ที่จะอัปโหลดไม่ได้');
        }

        try {
            if ($size === 0) {
                $response = $this->putChunk($session, '', 0, 0, 0);
                $id = $response->json('id');
                if (! is_string($id) || $id === '') {
                    throw new RuntimeException('อัปโหลดไฟล์ว่างไม่สำเร็จ');
                }

                return $id;
            }

            $offset = 0;
            while ($offset < $size) {
                $length = min(self::UPLOAD_CHUNK, $size - $offset);
                $data = $this->readExact($input, $length);
                $end = $offset + $length - 1;
                $attempt = 0;

                while (true) {
                    $response = $this->putChunk($session, $data, $offset, $end, $size);
                    $status = $response->status();
                    if (in_array($status, [200, 201], true)) {
                        $id = $response->json('id');
                        if (! is_string($id) || $id === '') {
                            throw new RuntimeException('Google Drive ไม่คืนรหัสไฟล์หลังอัปโหลด');
                        }

                        return $id;
                    }
                    if ($status === 308) {
                        $offset += $length;
                        break;
                    }
                    if (in_array($status, [500, 502, 503, 504], true) && $attempt < 3) {
                        $attempt++;
                        sleep($attempt);

                        continue;
                    }

                    $this->fail($response, 'อัปโหลด '.$name);
                }
            }
        } finally {
            fclose($input);
        }

        throw new RuntimeException('อัปโหลด '.$name.' ไม่จบ');
    }

    public function delete(string $fileId): void
    {
        $response = $this->deleteRequest('https://www.googleapis.com/drive/v3/files/'.$fileId);
        if (in_array($response->status(), [200, 204, 404], true)) {
            return;
        }

        $this->fail($response, 'ลบไฟล์บน Google Drive');
    }

    /**
     * @return array{deleted:list<string>,failed:list<string>}
     */
    public function prune(int $keep): array
    {
        $keep = max(1, $keep);
        $folderId = $this->ensureFolder((string) config('drive_backup.folder_name'));
        $files = $this->listFolder($folderId);
        $groups = ['hosxp' => [], 'appdb' => [], 'env' => []];

        foreach ($files as $file) {
            $name = (string) ($file['name'] ?? '');
            if ($name === '' || str_ends_with($name, '.metadata')) {
                continue;
            }
            $kind = $this->kindFromName($name);
            if ($kind !== null) {
                $groups[$kind][] = $file;
            }
        }

        $deleted = [];
        $failed = [];
        $kept = [];
        $dataNames = [];
        foreach ($files as $file) {
            $name = (string) ($file['name'] ?? '');
            if ($name !== '' && ! str_ends_with($name, '.metadata')) {
                $dataNames[$name] = true;
            }
        }

        foreach ($groups as $group) {
            usort($group, function (array $a, array $b): int {
                $time = strcmp((string) ($b['createdTime'] ?? ''), (string) ($a['createdTime'] ?? ''));
                if ($time !== 0) {
                    return $time;
                }

                return strcmp((string) ($b['name'] ?? ''), (string) ($a['name'] ?? ''));
            });

            foreach (array_slice($group, 0, $keep) as $file) {
                $kept[(string) $file['name']] = true;
            }
            foreach (array_slice($group, $keep) as $file) {
                $this->deleteNamed($file, $files, $deleted, $failed);
                if (in_array((string) ($file['name'] ?? ''), $deleted, true)) {
                    unset($dataNames[(string) $file['name']]);
                }
            }
        }

        foreach ($files as $file) {
            $name = (string) ($file['name'] ?? '');
            if (! str_ends_with($name, '.metadata')) {
                continue;
            }
            $base = substr($name, 0, -strlen('.metadata'));
            $kind = $this->kindFromName($base);
            if ($kind === null || isset($kept[$base]) || isset($dataNames[$base])) {
                continue;
            }
            if (in_array($name, $deleted, true) || in_array($name, $failed, true)) {
                continue;
            }
            $this->deleteNamed($file, $files, $deleted, $failed);
        }

        return ['deleted' => $deleted, 'failed' => $failed];
    }

    public function kindFromName(string $name): ?string
    {
        $base = str_ends_with($name, '.metadata') ? substr($name, 0, -strlen('.metadata')) : $name;
        foreach (['hosxp', 'appdb', 'env'] as $kind) {
            if ($base === $kind || str_starts_with($base, $kind.'-')) {
                return $kind;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $file
     * @param  list<array<string, mixed>>  $files
     * @param  list<string>  $deleted
     * @param  list<string>  $failed
     */
    private function deleteNamed(array $file, array $files, array &$deleted, array &$failed): void
    {
        $name = (string) ($file['name'] ?? '');
        $id = (string) ($file['id'] ?? '');
        if ($id === '') {
            $failed[] = $name;

            return;
        }

        try {
            $this->delete($id);
            $deleted[] = $name;
        } catch (RuntimeException) {
            $failed[] = $name;

            return;
        }

        if (str_ends_with($name, '.metadata')) {
            return;
        }

        foreach ($files as $companion) {
            if ((string) ($companion['name'] ?? '') !== $name.'.metadata') {
                continue;
            }
            $companionId = (string) ($companion['id'] ?? '');
            if ($companionId === '') {
                $failed[] = $name.'.metadata';
                break;
            }
            try {
                $this->delete($companionId);
                $deleted[] = $name.'.metadata';
            } catch (RuntimeException) {
                $failed[] = $name.'.metadata';
            }
            break;
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function listFolder(string $folderId): array
    {
        $files = [];
        $pageToken = null;

        do {
            $query = [
                'q' => "'".$this->escapeQuery($folderId)."' in parents and trashed = false",
                'fields' => 'nextPageToken,files(id,name,createdTime)',
                'pageSize' => 1000,
                'spaces' => 'drive',
            ];
            if (is_string($pageToken) && $pageToken !== '') {
                $query['pageToken'] = $pageToken;
            }

            $response = $this->get('https://www.googleapis.com/drive/v3/files', $query);
            $this->assertOk($response, 'อ่านรายการไฟล์บน Google Drive');
            foreach ($response->json('files') ?? [] as $file) {
                if (is_array($file)) {
                    $files[] = $file;
                }
            }
            $pageToken = $response->json('nextPageToken');
        } while (is_string($pageToken) && $pageToken !== '');

        return $files;
    }

    private function startSession(string $name, string $folderId, string $mime, int $size): string
    {
        $body = json_encode([
            'name' => $name,
            'parents' => [$folderId],
        ], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

        $response = Http::withToken($this->accessToken())
            ->connectTimeout(15)
            ->timeout(60)
            ->withHeaders([
                'X-Upload-Content-Type' => $mime,
                'X-Upload-Content-Length' => (string) $size,
            ])
            ->withBody($body, 'application/json; charset=UTF-8')
            ->post('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable');

        if ($response->status() === 401 && ! $this->refreshed) {
            $this->accessToken(true);
            $response = Http::withToken($this->accessToken())
                ->connectTimeout(15)
                ->timeout(60)
                ->withHeaders([
                    'X-Upload-Content-Type' => $mime,
                    'X-Upload-Content-Length' => (string) $size,
                ])
                ->withBody($body, 'application/json; charset=UTF-8')
                ->post('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable');
        }

        $this->assertOk($response, 'เริ่มอัปโหลด '.$name);
        $location = $response->header('Location');
        if (! is_string($location) || $location === '') {
            throw new RuntimeException('Google Drive ไม่คืนที่อยู่อัปโหลดของ '.$name);
        }

        return $location;
    }

    private function putChunk(string $session, string $data, int $offset, int $end, int $size): Response
    {
        $range = $size === 0
            ? 'bytes */0'
            : 'bytes '.$offset.'-'.$end.'/'.$size;

        return Http::connectTimeout(15)
            ->timeout(300)
            ->withHeaders(['Content-Range' => $range])
            ->withBody($data, 'application/octet-stream')
            ->send('PUT', $session);
    }

    /**
     * @param  array<string, mixed>  $query
     */
    private function get(string $url, array $query): Response
    {
        $response = Http::withToken($this->accessToken())
            ->acceptJson()
            ->connectTimeout(15)
            ->timeout(60)
            ->get($url, $query);

        if ($response->status() === 401 && ! $this->refreshed) {
            $this->accessToken(true);

            return Http::withToken($this->accessToken())
                ->acceptJson()
                ->connectTimeout(15)
                ->timeout(60)
                ->get($url, $query);
        }

        return $response;
    }

    /**
     * @param  array<string, mixed>  $json
     */
    private function post(string $url, array $json): Response
    {
        $response = Http::withToken($this->accessToken())
            ->acceptJson()
            ->connectTimeout(15)
            ->timeout(60)
            ->post($url, $json);

        if ($response->status() === 401 && ! $this->refreshed) {
            $this->accessToken(true);

            return Http::withToken($this->accessToken())
                ->acceptJson()
                ->connectTimeout(15)
                ->timeout(60)
                ->post($url, $json);
        }

        return $response;
    }

    private function deleteRequest(string $url): Response
    {
        $response = Http::withToken($this->accessToken())
            ->acceptJson()
            ->connectTimeout(15)
            ->timeout(60)
            ->delete($url);

        if ($response->status() === 401 && ! $this->refreshed) {
            $this->accessToken(true);

            return Http::withToken($this->accessToken())
                ->acceptJson()
                ->connectTimeout(15)
                ->timeout(60)
                ->delete($url);
        }

        return $response;
    }

    private function accessToken(bool $force = false): string
    {
        $token = $this->token ??= $this->tokens->read();
        $expiresAt = (int) ($token['expires_at'] ?? 0);
        $current = (string) ($token['access_token'] ?? '');
        if (! $force && $current !== '' && $expiresAt > time() + 60) {
            return $current;
        }

        if ($force) {
            $this->refreshed = true;
        }

        $response = Http::asForm()
            ->connectTimeout(15)
            ->timeout(30)
            ->post('https://oauth2.googleapis.com/token', [
                'client_id' => (string) ($token['client_id'] ?? ''),
                'client_secret' => (string) ($token['client_secret'] ?? ''),
                'refresh_token' => (string) ($token['refresh_token'] ?? ''),
                'grant_type' => 'refresh_token',
            ]);

        if (! $response->successful()) {
            $this->fail($response, 'ขอ access token');
        }

        $access = $response->json('access_token');
        if (! is_string($access) || $access === '') {
            throw new RuntimeException('Google ไม่คืน access token');
        }

        $token['access_token'] = $access;
        $token['expires_at'] = time() + (int) $response->json('expires_in', 3600);
        $this->token = $token;
        $this->tokens->put([
            'access_token' => $token['access_token'],
            'expires_at' => $token['expires_at'],
        ]);

        return $access;
    }

    private function assertOk(Response $response, string $action): void
    {
        if (! $response->successful()) {
            $this->fail($response, $action);
        }
    }

    private function fail(Response $response, string $action): void
    {
        $message = $response->json('error.message')
            ?? $response->json('error_description')
            ?? $response->json('error')
            ?? '';
        if (is_array($message)) {
            $message = (string) ($message['message'] ?? '');
        }

        throw new RuntimeException(trim($action.' ไม่สำเร็จ (HTTP '.$response->status().') '.mb_substr((string) $message, 0, 300)));
    }

    private function escapeQuery(string $value): string
    {
        return str_replace("'", "\\'", $value);
    }

    /**
     * @param  resource  $handle
     */
    private function readExact($handle, int $length): string
    {
        $data = '';
        while (strlen($data) < $length) {
            $chunk = fread($handle, $length - strlen($data));
            if ($chunk === false || $chunk === '') {
                break;
            }
            $data .= $chunk;
        }

        if (strlen($data) !== $length) {
            throw new RuntimeException('อ่านไฟล์ที่จะอัปโหลดไม่ครบ');
        }

        return $data;
    }
}
