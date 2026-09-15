<?php

namespace App\Services\Ngrok;

use App\Support\LineUrls;
use App\Support\TunnelEnv;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NgrokTunnelService
{
    public function binary(): string
    {
        $configured = (string) config('ngrok.bin');
        if ($configured !== '' && is_file($configured)) {
            return $configured;
        }

        $local = base_path('ngrok.exe');
        if (is_file($local)) {
            return $local;
        }

        return 'ngrok';
    }

    public function binaryExists(): bool
    {
        $bin = $this->binary();

        return is_file($bin) || $bin === 'ngrok';
    }

    /**
     * @return array{running: bool, public_url: ?string, callback_url: string, webhook_url: string, pid: ?int, error?: string}
     */
    public function status(): array
    {
        $public = $this->discoverPublicUrl() ?: (config('ngrok.public_url') ?: null);

        return [
            'running' => $this->isApiUp(),
            'public_url' => $public,
            'callback_url' => $public
                ? rtrim($public, '/').LineUrls::tunnelAppPath().'/auth/line/callback'
                : LineUrls::callback(),
            'webhook_url' => $public
                ? rtrim($public, '/').LineUrls::tunnelAppPath().'/line/webhook'
                : LineUrls::webhook(),
            'pid' => $this->readPid(),
            'binary' => $this->binary(),
            'binary_exists' => is_file($this->binary()) || $this->binary() === 'ngrok',
            'addr' => (string) config('ngrok.addr', '80'),
            'has_authtoken' => filled(config('ngrok.authtoken')),
        ];
    }

    public function isApiUp(): bool
    {
        try {
            return Http::timeout(1)->get(rtrim((string) config('ngrok.api'), '/').'/api/tunnels')->successful();
        } catch (\Throwable) {
            return false;
        }
    }

    public function start(): array
    {
        if ($this->isApiUp()) {
            $status = $this->status();
            TunnelEnv::persistPublicUrl($status['public_url'] ?? null, 'ngrok');

            return $status + ['message' => 'ngrok ทำงานอยู่แล้ว'];
        }

        $bin = $this->binary();
        if (! is_file($bin) && $bin !== 'ngrok') {
            return $this->status() + ['error' => 'ไม่พบ ngrok.exe'];
        }

        $addr = (string) config('ngrok.addr', '80');
        $log = storage_path('logs/ngrok.log');
        $token = (string) config('ngrok.authtoken');

        if ($token === '') {
            return $this->status() + ['error' => 'ยังไม่มี NGROK_AUTHTOKEN กรอกในแท็บ ngrok แล้วกดบันทึกก่อน'];
        }

        @file_put_contents($log, '['.now()->toDateTimeString()."] starting ngrok http {$addr}\n", FILE_APPEND);

        try {
            $pid = $this->spawn($bin, $addr, $token, $log);
            if ($pid) {
                $this->writePid($pid);
            }
        } catch (\Throwable $e) {
            Log::error('ngrok start failed: '.$e->getMessage());

            return $this->status() + ['error' => 'เปิด ngrok ไม่สำเร็จ: '.$e->getMessage()];
        }

        $public = $this->waitForPublicUrl(20);
        if (! $public) {
            $hint = $this->lastLogHint($log);

            return $this->status() + [
                'error' => 'เปิด ngrok แล้วแต่ยังไม่ได้ URL สาธารณะ'.($hint !== '' ? ' · '.$hint : ' · ตรวจ authtoken หรือว่าพอร์ต 80 ถูกใช้งาน'),
            ];
        }

        TunnelEnv::persistPublicUrl($public, 'ngrok');
        $status = $this->status();

        return $status + ['message' => 'เปิด ngrok แล้ว'];
    }

    public function killProcess(): void
    {
        $pid = $this->readPid();
        if (PHP_OS_FAMILY === 'Windows') {
            if ($pid) {
                exec('taskkill /PID '.(int) $pid.' /F 2>NUL');
            }
            exec('taskkill /IM ngrok.exe /F 2>NUL');
        } elseif ($pid) {
            exec('kill '.(int) $pid.' 2>/dev/null');
        }

        @unlink($this->pidFile());
    }

    public function stop(): array
    {
        $this->killProcess();
        TunnelEnv::clear();

        return $this->status() + ['message' => 'ปิด ngrok แล้ว'];
    }

    public function persistPublicUrl(?string $public): void
    {
        TunnelEnv::persistPublicUrl($public, 'ngrok');
    }

    private function spawn(string $bin, string $addr, string $token, string $log): ?int
    {
        $bin = str_replace('/', DIRECTORY_SEPARATOR, $bin);
        $web = '127.0.0.1:4040';
        putenv('NGROK_AUTHTOKEN='.$token);

        if (PHP_OS_FAMILY !== 'Windows') {
            $cmd = escapeshellarg($bin).' http '.escapeshellarg($addr).' --web-addr='.escapeshellarg($web).' >> '.escapeshellarg($log).' 2>&1 & echo $!';
            exec($cmd, $out);

            return isset($out[0]) ? (int) $out[0] : null;
        }

        $cmd = 'cmd /c start "smh-ngrok" /MIN '.escapeshellarg($bin).' http '.$addr.' --authtoken='.escapeshellarg($token).' --web-addr='.$web;
        pclose(popen($cmd, 'r'));

        usleep(800000);

        return $this->findNgrokPid();
    }

    private function findNgrokPid(): ?int
    {
        if (PHP_OS_FAMILY !== 'Windows') {
            return $this->readPid();
        }

        exec('powershell -NoProfile -Command "(Get-Process ngrok -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Id)"', $out);
        $pid = isset($out[0]) ? (int) trim($out[0]) : 0;

        return $pid > 0 ? $pid : null;
    }

    private function lastLogHint(string $log): string
    {
        if (! is_file($log)) {
            return '';
        }

        $tail = trim((string) substr((string) file_get_contents($log), -800));
        $tail = preg_replace('/[A-Za-z0-9_\-]{20,}/', '[redacted]', $tail) ?? $tail;

        return mb_substr(preg_replace('/\s+/', ' ', $tail) ?? '', -240);
    }

    private function waitForPublicUrl(int $seconds): ?string
    {
        $deadline = time() + $seconds;
        do {
            $url = $this->discoverPublicUrl();
            if ($url) {
                return $url;
            }
            usleep(400000);
        } while (time() < $deadline);

        return null;
    }

    private function discoverPublicUrl(): ?string
    {
        try {
            $response = Http::timeout(2)->get(rtrim((string) config('ngrok.api'), '/').'/api/tunnels');
            if (! $response->successful()) {
                return null;
            }
            foreach ($response->json('tunnels') ?? [] as $tunnel) {
                $url = (string) ($tunnel['public_url'] ?? '');
                if (str_starts_with($url, 'https://')) {
                    return $url;
                }
            }
        } catch (\Throwable) {
            return null;
        }

        return null;
    }

    private function pidFile(): string
    {
        return storage_path('app/ngrok.pid');
    }

    private function readPid(): ?int
    {
        $file = $this->pidFile();
        if (! is_file($file)) {
            return null;
        }
        $pid = (int) trim((string) file_get_contents($file));

        return $pid > 0 ? $pid : null;
    }

    private function writePid(int $pid): void
    {
        file_put_contents($this->pidFile(), (string) $pid);
    }
}
