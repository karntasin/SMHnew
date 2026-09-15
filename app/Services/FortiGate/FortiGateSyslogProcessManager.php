<?php

namespace App\Services\FortiGate;

use Illuminate\Support\Facades\File;
use Throwable;

class FortiGateSyslogProcessManager
{
    public function pidPath(): string
    {
        return storage_path('app/fortigate-syslog.pid');
    }

    public function logPath(): string
    {
        return storage_path('logs/fortigate-syslog-listen.log');
    }

    public function statusPath(): string
    {
        return storage_path('app/fortigate-syslog-status.json');
    }

    /** @return array<string, mixed> */
    public function status(): array
    {
        $pid = $this->readPid();
        $running = $pid !== null && $this->isProcessRunning($pid);
        if (! $running && $pid !== null) {
            $this->clearPid();
            $pid = null;
        }

        $heartbeat = $this->readHeartbeat();
        $host = (string) config('fortigate.syslog.listen_host', '0.0.0.0');
        $port = (int) config('fortigate.syslog.listen_port', 5514);

        return [
            'enabled' => (bool) config('fortigate.syslog.enabled', true),
            'running' => $running,
            'pid' => $pid,
            'listen_host' => $host,
            'listen_port' => $port,
            'traffic_mode' => (string) config('fortigate.syslog.traffic_mode', 'all'),
            'php_binary' => $this->phpBinary(),
            'log_file' => $this->logPath(),
            'started_at' => $heartbeat['started_at'] ?? null,
            'last_heartbeat_at' => $heartbeat['last_heartbeat_at'] ?? null,
            'stats' => [
                'recv' => (int) ($heartbeat['recv'] ?? 0),
                'stored' => (int) ($heartbeat['stored'] ?? 0),
                'dup' => (int) ($heartbeat['dup'] ?? 0),
                'skip' => (int) ($heartbeat['skip'] ?? 0),
                'err' => (int) ($heartbeat['err'] ?? 0),
                'last_from' => $heartbeat['last_from'] ?? null,
            ],
            'recent_log' => $this->tailLog(12),
            'message' => $running
                ? "ตัวรับ Syslog ทำงานอยู่ (UDP {$host}:{$port})"
                : 'ตัวรับ Syslog ยังไม่ทำงาน — กดเปิดเพื่อเริ่มรับ log จาก FortiGate',
        ];
    }

    /** @return array<string, mixed> */
    public function start(): array
    {
        if (! config('fortigate.syslog.enabled', true)) {
            return ['ok' => false, 'message' => 'FORTIGATE_SYSLOG_ENABLED=false', 'status' => $this->status()];
        }

        $current = $this->status();
        if ($current['running']) {
            return ['ok' => true, 'message' => 'ตัวรับทำงานอยู่แล้ว', 'status' => $current];
        }

        if (! function_exists('socket_create')) {
            return ['ok' => false, 'message' => 'PHP ยังไม่เปิด extension=sockets', 'status' => $this->status()];
        }

        File::ensureDirectoryExists(dirname($this->pidPath()));
        File::ensureDirectoryExists(dirname($this->logPath()));

        try {
            $pid = $this->spawnListener();
            if ($pid === null || $pid <= 0) {
                return ['ok' => false, 'message' => 'เริ่มตัวรับไม่สำเร็จ (ไม่ได้รับ PID)', 'status' => $this->status()];
            }

            File::put($this->pidPath(), (string) $pid);
            usleep(400000);

            $status = $this->status();
            if (! $status['running']) {
                return [
                    'ok' => false,
                    'message' => 'เริ่มแล้วแต่โปรเซสหยุดทันที — ดู log ที่ storage/logs/fortigate-syslog-listen.log (พอร์ตถูกใช้อยู่หรือสิทธิ์ไม่พอ)',
                    'status' => $status,
                ];
            }

            return ['ok' => true, 'message' => 'เปิดตัวรับ Syslog แล้ว (PID '.$pid.')', 'status' => $status];
        } catch (Throwable $e) {
            return ['ok' => false, 'message' => $e->getMessage(), 'status' => $this->status()];
        }
    }

    /** @return array<string, mixed> */
    public function stop(): array
    {
        $pid = $this->readPid();
        if ($pid === null) {
            return ['ok' => true, 'message' => 'ตัวรับไม่ได้ทำงานอยู่', 'status' => $this->status()];
        }

        $killed = $this->killProcess($pid);
        $this->clearPid();

        // Clear stale heartbeat running flag
        $heartbeat = $this->readHeartbeat();
        $heartbeat['running'] = false;
        $heartbeat['stopped_at'] = now()->toDateTimeString();
        File::put($this->statusPath(), json_encode($heartbeat, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

        return [
            'ok' => $killed,
            'message' => $killed ? 'หยุดตัวรับ Syslog แล้ว' : 'พยายามหยุดแล้ว แต่โปรเซสอาจยังค้าง',
            'status' => $this->status(),
        ];
    }

    public function writeHeartbeat(array $stats): void
    {
        $existing = $this->readHeartbeat();
        $payload = array_merge($existing, $stats, [
            'running' => true,
            'last_heartbeat_at' => now()->toDateTimeString(),
            'pid' => getmypid(),
            'listen_host' => (string) config('fortigate.syslog.listen_host', '0.0.0.0'),
            'listen_port' => (int) config('fortigate.syslog.listen_port', 5514),
        ]);
        if (empty($payload['started_at'])) {
            $payload['started_at'] = now()->toDateTimeString();
        }

        File::ensureDirectoryExists(dirname($this->statusPath()));
        File::put($this->statusPath(), json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    }

    private function spawnListener(): ?int
    {
        $php = $this->phpBinary();
        $artisan = base_path('artisan');
        $log = $this->logPath();
        $cwd = base_path();

        if (PHP_OS_FAMILY === 'Windows') {
            // Avoid Start-Process -RedirectStandard* — PowerShell often waits until the
            // long-running listener exits, which hangs PHP exec()/Apache requests.
            $commandLine = '"'.$php.'" "'.$artisan.'" fortigate:syslog-listen';

            if (class_exists('COM')) {
                try {
                    $wmi = new \COM('winmgmts:{impersonationLevel=impersonate}!\\\\.\\root\\cimv2');
                    $process = $wmi->Get('Win32_Process');
                    $pidVar = new \VARIANT(0, VT_I4);
                    $result = $process->Create($commandLine, $cwd, null, $pidVar);
                    if ((int) $result === 0) {
                        $pid = (int) $pidVar;
                        if ($pid > 0) {
                            return $pid;
                        }
                    }
                } catch (Throwable) {
                    // fall through to PowerShell WMI
                }
            }

            $ps = sprintf(
                '$r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine=%s; CurrentDirectory=%s}; if ($null -ne $r -and $r.ReturnValue -eq 0) { Write-Output $r.ProcessId } else { Write-Output 0; exit 1 }',
                $this->psSingleQuoted($commandLine),
                $this->psSingleQuoted($cwd)
            );
            $cmd = 'powershell -NoProfile -ExecutionPolicy Bypass -Command '.$this->psDoubleQuoted($ps);
            $output = [];
            $code = 0;
            exec($cmd, $output, $code);
            foreach ($output as $line) {
                $line = trim((string) $line);
                if ($line !== '' && ctype_digit($line) && (int) $line > 0) {
                    return (int) $line;
                }
            }

            // Last resort: fire-and-forget, then discover PID
            $launch = 'cmd /c start "" /B '.$commandLine;
            exec($launch);
            usleep(500000);

            return $this->findListenerPid();
        }

        $cmd = sprintf(
            'nohup %s %s fortigate:syslog-listen >> %s 2>&1 & echo $!',
            escapeshellarg($php),
            escapeshellarg($artisan),
            escapeshellarg($log)
        );
        $output = [];
        exec($cmd, $output);
        $pid = isset($output[0]) ? (int) trim($output[0]) : 0;

        return $pid > 0 ? $pid : null;
    }

    private function psSingleQuoted(string $value): string
    {
        return "'".str_replace("'", "''", $value)."'";
    }

    private function psDoubleQuoted(string $value): string
    {
        // Safe for cmd.exe: wrap in double quotes, escape embedded quotes.
        return '"'.str_replace(['\\', '"'], ['\\\\', '\\"'], $value).'"';
    }

    private function findListenerPid(): ?int
    {
        $output = [];
        exec('wmic process where "name=\'php.exe\'" get ProcessId,CommandLine /FORMAT:LIST', $output);
        $pid = null;
        $cmd = '';
        foreach ($output as $line) {
            $line = trim((string) $line);
            if (stripos($line, 'CommandLine=') === 0) {
                $cmd = substr($line, strlen('CommandLine='));
            } elseif (stripos($line, 'ProcessId=') === 0) {
                $candidate = (int) substr($line, strlen('ProcessId='));
                if ($candidate > 0 && stripos($cmd, 'fortigate:syslog-listen') !== false) {
                    $pid = $candidate;
                }
                $cmd = '';
            }
        }

        return $pid;
    }

    private function phpBinary(): string
    {
        $candidates = [
            base_path('.php82/php.exe'),
            base_path('.php82/php'),
            PHP_BINARY,
        ];
        foreach ($candidates as $path) {
            if (is_string($path) && $path !== '' && is_file($path)) {
                return $path;
            }
        }

        return PHP_BINARY ?: 'php';
    }

    private function readPid(): ?int
    {
        if (! is_file($this->pidPath())) {
            return null;
        }
        $pid = (int) trim((string) File::get($this->pidPath()));

        return $pid > 0 ? $pid : null;
    }

    private function clearPid(): void
    {
        if (is_file($this->pidPath())) {
            @unlink($this->pidPath());
        }
    }

    private function isProcessRunning(int $pid): bool
    {
        if ($pid <= 0) {
            return false;
        }

        if (PHP_OS_FAMILY === 'Windows') {
            $output = [];
            exec('tasklist /FI "PID eq '.$pid.'" /NH', $output);
            $text = implode(' ', $output);

            return str_contains($text, (string) $pid);
        }

        return function_exists('posix_kill') ? @posix_kill($pid, 0) : is_dir('/proc/'.$pid);
    }

    private function killProcess(int $pid): bool
    {
        if (PHP_OS_FAMILY === 'Windows') {
            $code = 0;
            exec('taskkill /PID '.$pid.' /F', $out, $code);

            return $code === 0 || ! $this->isProcessRunning($pid);
        }

        if (function_exists('posix_kill')) {
            @posix_kill($pid, SIGTERM);
            usleep(200000);
            if ($this->isProcessRunning($pid)) {
                @posix_kill($pid, SIGKILL);
            }
        } else {
            exec('kill '.$pid);
        }

        return ! $this->isProcessRunning($pid);
    }

    /** @return array<string, mixed> */
    private function readHeartbeat(): array
    {
        if (! is_file($this->statusPath())) {
            return [];
        }
        try {
            $json = json_decode((string) File::get($this->statusPath()), true);

            return is_array($json) ? $json : [];
        } catch (Throwable) {
            return [];
        }
    }

    /** @return list<string> */
    private function tailLog(int $lines = 12): array
    {
        if (! is_file($this->logPath())) {
            return [];
        }
        try {
            $content = File::get($this->logPath());
            $parts = preg_split("/\r\n|\n|\r/", trim($content)) ?: [];

            return array_values(array_slice($parts, -$lines));
        } catch (Throwable) {
            return [];
        }
    }
}
