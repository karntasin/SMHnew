<?php

namespace App\Services\Tunnel;

use App\Support\LineUrls;
use App\Support\PublicHost;
use App\Support\TunnelEnv;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CloudflareTunnelService
{
    public function binary(): string
    {
        $configured = (string) config('ngrok.cloudflared_bin');
        if ($configured !== '' && is_file($configured)) {
            return $configured;
        }

        return base_path('cloudflared.exe');
    }

    /**
     * @return array{running: bool, public_url: ?string, callback_url: string, webhook_url: string, pid: ?int, binary: string, binary_exists: bool, driver: string, skips_interstitial: bool, error?: string, message?: string}
     */
    public function status(): array
    {
        if (PublicHost::isNamedTunnelMode()) {
            return $this->namedTunnelStatus();
        }

        $public = $this->discoverPublicUrl() ?: $this->configuredCloudflareUrl();

        return $this->baseStatus($public);
    }

    /**
     * @return array{running: bool, public_url: ?string, callback_url: string, webhook_url: string, pid: ?int, binary: string, binary_exists: bool, driver: string, skips_interstitial: bool, error?: string, message?: string, addr?: string, mode?: string}
     */
    private function namedTunnelStatus(): array
    {
        $public = PublicHost::publicHttpsBase();
        $running = $this->isNamedServiceRunning();

        return $this->baseStatus($public) + [
            'running' => $running,
            'mode' => 'named',
            'message' => $running
                ? 'Named Tunnel (subdomain ถาวร) — รันผ่าน Windows Service'
                : 'ตั้ง CLOUDFLARE_PUBLIC_HOSTNAME แล้ว แต่ยังไม่พบ cloudflared service — รัน deploy\\scripts\\install-cloudflared-service.ps1',
        ];
    }

    /**
     * @return array{running: bool, public_url: ?string, callback_url: string, webhook_url: string, pid: ?int, binary: string, binary_exists: bool, driver: string, skips_interstitial: bool, addr: string}
     */
    private function baseStatus(?string $public): array
    {
        return [
            'running' => $this->isRunning(),
            'public_url' => $public,
            'callback_url' => $public
                ? rtrim($public, '/').LineUrls::tunnelAppPath().'/auth/line/callback'
                : LineUrls::callback(),
            'webhook_url' => $public
                ? rtrim($public, '/').LineUrls::tunnelAppPath().'/line/webhook'
                : LineUrls::webhook(),
            'pid' => $this->findPid(),
            'binary' => $this->binary(),
            'binary_exists' => is_file($this->binary()),
            'driver' => 'cloudflare',
            'skips_interstitial' => true,
            'addr' => (string) config('ngrok.addr', '8081'),
            'mode' => PublicHost::isNamedTunnelMode() ? 'named' : 'quick',
        ];
    }

    public function isRunning(): bool
    {
        if (PublicHost::isNamedTunnelMode()) {
            return $this->isNamedServiceRunning();
        }

        return $this->findPid() !== null;
    }

    private function isNamedServiceRunning(): bool
    {
        if (PHP_OS_FAMILY === 'Windows') {
            exec('sc query cloudflared 2>NUL', $out);
            $text = implode("\n", $out);

            return str_contains($text, 'RUNNING') || $this->findPid() !== null;
        }

        return $this->findPid() !== null;
    }

    public function start(): array
    {
        if (PublicHost::isNamedTunnelMode()) {
            $public = PublicHost::publicHttpsBase();
            if ($public) {
                TunnelEnv::syncNamedTunnel($public);
            }

            $status = $this->namedTunnelStatus();

            return $status + [
                'message' => $status['running']
                    ? 'Named Tunnel พร้อมใช้งานที่ '.$public
                    : 'โหมด named: ติดตั้ง service ด้วย deploy\\scripts\\install-cloudflared-service.ps1 (Administrator)',
            ];
        }

        if ($this->isRunning()) {
            $status = $this->status();
            if ($status['public_url']) {
                TunnelEnv::persistPublicUrl($status['public_url'], 'cloudflare');
            }

            return $status + ['message' => 'Cloudflare Tunnel ทำงานอยู่แล้ว'];
        }

        set_time_limit(180);

        $bin = $this->ensureBinary();
        if (! $bin) {
            return $this->status() + ['error' => 'ดาวน์โหลด cloudflared ไม่สำเร็จ กรุณาโหลดจาก GitHub แล้ววางเป็น cloudflared.exe ที่โฟลเดอร์โปรเจกต์'];
        }

        $addr = (string) config('ngrok.addr', '8081');
        $log = $this->logFile();
        @file_put_contents($log, '['.now()->toDateTimeString()."] starting cloudflared tunnel http://127.0.0.1:{$addr}\n");

        try {
            $pid = $this->spawn($bin, $addr, $log);
            if ($pid) {
                $this->writePid($pid);
            }
        } catch (\Throwable $e) {
            Log::error('cloudflared start failed: '.$e->getMessage());

            return $this->status() + ['error' => 'เปิด Cloudflare Tunnel ไม่สำเร็จ: '.$e->getMessage()];
        }

        $public = $this->waitForPublicUrl(25);
        if (! $public) {
            return $this->status() + ['error' => 'เปิดอุโมงค์แล้วแต่ยังไม่ได้ URL สาธารณะ ตรวจว่า Apache เปิดพอร์ต '.$addr.' อยู่'];
        }

        TunnelEnv::persistPublicUrl($public, 'cloudflare');

        return $this->status() + ['message' => 'เปิด Cloudflare Tunnel แล้ว ไม่มีหน้า Visit Site'];
    }

    public function killProcess(): void
    {
        if (PublicHost::isNamedTunnelMode()) {
            return;
        }

        $pid = $this->readPid() ?: $this->findPid();
        if (PHP_OS_FAMILY === 'Windows') {
            if ($pid) {
                exec('taskkill /PID '.(int) $pid.' /F 2>NUL');
            }
            exec('taskkill /IM cloudflared.exe /F 2>NUL');
        } elseif ($pid) {
            exec('kill '.(int) $pid.' 2>/dev/null');
        }

        @unlink($this->pidFile());
    }

    public function ensureBinary(): ?string
    {
        $bin = $this->binary();
        if (is_file($bin) && filesize($bin) > 1_000_000) {
            return $bin;
        }

        $url = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe';
        $tmp = $bin.'.download';

        try {
            $response = Http::timeout(180)
                ->sink($tmp)
                ->get($url);

            $magic = is_file($tmp) ? (string) file_get_contents($tmp, false, null, 0, 2) : '';
            if (! $response->successful() || $magic !== 'MZ' || filesize($tmp) < 1_000_000) {
                @unlink($tmp);

                return is_file($bin) ? $bin : null;
            }

            @unlink($bin);
            rename($tmp, $bin);

            return $bin;
        } catch (\Throwable $e) {
            Log::error('cloudflared download failed: '.$e->getMessage());
            @unlink($tmp);

            return is_file($bin) ? $bin : null;
        }
    }

    private function spawn(string $bin, string $addr, string $log): ?int
    {
        $bin = str_replace('/', DIRECTORY_SEPARATOR, $bin);
        $target = 'http://127.0.0.1:'.$addr;

        if (PHP_OS_FAMILY !== 'Windows') {
            $cmd = escapeshellarg($bin).' tunnel --url '.escapeshellarg($target).' --no-autoupdate --logfile '.escapeshellarg($log).' --loglevel info > /dev/null 2>&1 & echo $!';
            exec($cmd, $out);

            return isset($out[0]) ? (int) $out[0] : null;
        }

        $cmd = 'cmd /c start "smh-cloudflared" /MIN '.escapeshellarg($bin)
            .' tunnel --url '.$target
            .' --no-autoupdate --logfile '.escapeshellarg($log)
            .' --loglevel info';
        pclose(popen($cmd, 'r'));
        usleep(800000);

        return $this->findPid();
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
        $log = $this->logFile();
        if (! is_file($log)) {
            return null;
        }

        $contents = (string) file_get_contents($log);
        if (preg_match('~https://[a-z0-9-]+\.trycloudflare\.com~i', $contents, $matches)) {
            return rtrim($matches[0], '/');
        }

        return null;
    }

    private function configuredCloudflareUrl(): ?string
    {
        if ($named = PublicHost::publicHttpsBase()) {
            return $named;
        }

        $public = rtrim((string) config('ngrok.public_url'), '/');
        if ($public !== '' && PublicHost::isEphemeralTunnelHost(parse_url($public, PHP_URL_HOST))) {
            return $public;
        }

        return null;
    }

    private function findPid(): ?int
    {
        if (PHP_OS_FAMILY !== 'Windows') {
            $pid = $this->readPid();
            if ($pid && function_exists('posix_kill') && posix_kill($pid, 0)) {
                return $pid;
            }

            return null;
        }

        exec('powershell -NoProfile -Command "(Get-Process cloudflared -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Id)"', $out);
        $pid = isset($out[0]) ? (int) trim($out[0]) : 0;

        return $pid > 0 ? $pid : null;
    }

    private function logFile(): string
    {
        return storage_path('logs/cloudflared.log');
    }

    private function pidFile(): string
    {
        return storage_path('app/cloudflared.pid');
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
