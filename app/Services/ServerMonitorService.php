<?php

namespace App\Services;

use App\Models\ServerMonitorSnapshot;
use App\Notifications\HosxpConnectionAlertNotification;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class ServerMonitorService
{
    private const ALERT_KEY = 'server_monitor.alert_sent';

    /** @return array<int, array<string, mixed>> */
    public function serverDefinitions(): array
    {
        return config('server_monitor.servers', []);
    }

    /** @return array<string, mixed> */
    public function checkServer(array $server): array
    {
        $host = $server['host'];
        $ping = $this->pingHost($host);
        $ports = [];
        foreach ($server['ports'] ?? [] as $portDef) {
            $port = (int) ($portDef['port'] ?? 0);
            $open = $port > 0 ? $this->checkPort($host, $port) : false;
            $ports[] = [
                'port' => $port,
                'label' => $portDef['label'] ?? (string) $port,
                'open' => $open,
            ];
        }

        $mysql = null;
        if (! empty($server['check_mysql'])) {
            $mysql = $this->checkMysqlLatency((string) ($server['mysql_connection'] ?? 'hosxp_backup'));
        }

        $snmp = null;
        if (! empty($server['snmp']) && config('server_monitor.snmp.enabled')) {
            $snmp = app(SnmpPoller::class)->poll($host);
        }

        $pingOk = $ping['ok'];
        $mysqlOk = $mysql['ok'] ?? null;
        $snmpOk = $snmp['ok'] ?? null;
        $portsOk = $ports === [] || collect($ports)->every(fn ($p) => $p['open']);

        $status = 'online';
        if (! $pingOk && ! $portsOk) {
            $status = 'offline';
        } elseif (! $pingOk || ! $portsOk || ($mysqlOk === false) || ($snmpOk === false)) {
            $status = 'degraded';
        }

        $message = $this->buildMessage($pingOk, $ports, $mysql, $snmp);

        return [
            'server_key' => $server['key'],
            'host' => $host,
            'name' => $server['name'] ?? $host,
            'status' => $status,
            'ping_ok' => $pingOk,
            'ping_ms' => $ping['ms'],
            'mysql_ok' => $mysqlOk,
            'mysql_ms' => $mysql['ms'] ?? null,
            'snmp_ok' => $snmpOk,
            'cpu_percent' => $snmp['cpu_percent'] ?? null,
            'memory_percent' => $snmp['memory_percent'] ?? null,
            'disk_percent' => $snmp['disk_percent'] ?? null,
            'snmp_uptime_seconds' => $snmp['uptime_seconds'] ?? null,
            'snmp_sys_name' => $snmp['sys_name'] ?? null,
            'ports' => $ports,
            'message' => $message,
            'checked_at' => now(),
        ];
    }

    public function recordSnapshot(array $result): ServerMonitorSnapshot
    {
        return ServerMonitorSnapshot::create([
            'server_key' => $result['server_key'],
            'host' => $result['host'],
            'status' => $result['status'],
            'ping_ok' => $result['ping_ok'],
            'ping_ms' => $result['ping_ms'],
            'mysql_ok' => $result['mysql_ok'],
            'mysql_ms' => $result['mysql_ms'],
            'snmp_ok' => $result['snmp_ok'] ?? null,
            'cpu_percent' => $result['cpu_percent'] ?? null,
            'memory_percent' => $result['memory_percent'] ?? null,
            'disk_percent' => $result['disk_percent'] ?? null,
            'snmp_uptime_seconds' => $result['snmp_uptime_seconds'] ?? null,
            'snmp_sys_name' => $result['snmp_sys_name'] ?? null,
            'ports' => $result['ports'],
            'message' => $result['message'],
            'checked_at' => $result['checked_at'],
        ]);
    }

    public function runAllChecks(bool $notifyOnFailure = true): array
    {
        $results = [];
        foreach ($this->serverDefinitions() as $server) {
            try {
                $result = $this->checkServer($server);
                $this->recordSnapshot($result);
                $results[] = $result;

                if ($notifyOnFailure && in_array($result['status'], ['offline', 'degraded'], true)) {
                    $this->maybeNotifyAdmins($result);
                } elseif ($result['status'] === 'online') {
                    Cache::forget(self::ALERT_KEY.'.'.$result['server_key']);
                }
            } catch (\Throwable $e) {
                Log::error('Server monitor failed: '.$e->getMessage());
            }
        }

        $this->pruneOldSnapshots();

        return $results;
    }

    /** @return array{current: array<int, mixed>, series: array<int, mixed>, summary: array<string, mixed>} */
    public function dashboardData(string $range = '24h'): array
    {
        $hours = match ($range) {
            '1h' => 1,
            '6h' => 6,
            '24h' => 24,
            '7d' => 168,
            default => 24,
        };

        $since = now()->subHours($hours);
        $servers = $this->serverDefinitions();
        $current = [];
        $series = [];
        $summary = [];

        foreach ($servers as $server) {
            $key = $server['key'];
            $latest = ServerMonitorSnapshot::query()
                ->where('server_key', $key)
                ->orderByDesc('checked_at')
                ->first();

            $history = ServerMonitorSnapshot::query()
                ->where('server_key', $key)
                ->where('checked_at', '>=', $since)
                ->orderBy('checked_at')
                ->get(['checked_at', 'status', 'ping_ms', 'mysql_ms', 'ping_ok', 'mysql_ok', 'cpu_percent', 'memory_percent', 'disk_percent', 'snmp_ok']);

            $total = $history->count();
            $online = $history->where('status', 'online')->count();

            $current[] = [
                'key' => $key,
                'name' => $server['name'] ?? $server['host'],
                'host' => $server['host'],
                'latest' => $latest ? [
                    'status' => $latest->status,
                    'ping_ok' => $latest->ping_ok,
                    'ping_ms' => $latest->ping_ms,
                    'mysql_ok' => $latest->mysql_ok,
                    'mysql_ms' => $latest->mysql_ms,
                    'snmp_ok' => $latest->snmp_ok,
                    'cpu_percent' => $latest->cpu_percent,
                    'memory_percent' => $latest->memory_percent,
                    'disk_percent' => $latest->disk_percent,
                    'snmp_uptime_seconds' => $latest->snmp_uptime_seconds,
                    'snmp_sys_name' => $latest->snmp_sys_name,
                    'ports' => $latest->ports,
                    'message' => $latest->message,
                    'checked_at' => $latest->checked_at?->toDateTimeString(),
                ] : null,
            ];

            $series[] = [
                'key' => $key,
                'name' => $server['name'] ?? $server['host'],
                'points' => $history->map(fn ($row) => [
                    'time' => $row->checked_at->format('H:i'),
                    'ts' => $row->checked_at->toIso8601String(),
                    'ping_ms' => $row->ping_ms,
                    'mysql_ms' => $row->mysql_ms,
                    'cpu_percent' => $row->cpu_percent,
                    'memory_percent' => $row->memory_percent,
                    'disk_percent' => $row->disk_percent,
                    'status' => $row->status,
                ])->values()->all(),
            ];

            $summary[] = [
                'key' => $key,
                'name' => $server['name'] ?? $server['host'],
                'uptime_percent' => $total > 0 ? round($online / $total * 100, 1) : null,
                'avg_ping_ms' => $history->whereNotNull('ping_ms')->avg('ping_ms') ? round($history->whereNotNull('ping_ms')->avg('ping_ms')) : null,
                'avg_mysql_ms' => $history->whereNotNull('mysql_ms')->avg('mysql_ms') ? round($history->whereNotNull('mysql_ms')->avg('mysql_ms')) : null,
                'samples' => $total,
            ];
        }

        return [
            'current' => $current,
            'series' => $series,
            'summary' => $summary,
            'refresh_seconds' => config('server_monitor.dashboard_refresh_seconds', 10),
        ];
    }

    /** @return array{ok: bool, ms: ?int} */
    private function pingHost(string $host): array
    {
        if (! $this->isValidHost($host)) {
            return ['ok' => false, 'ms' => null];
        }

        $flag = PHP_OS_FAMILY === 'Windows' ? '-n 1 -w 2000' : '-c 1 -W 2';
        $cmd = 'ping '.$flag.' '.escapeshellarg($host).' 2>&1';

        try {
            $output = shell_exec($cmd) ?? '';
        } catch (\Throwable) {
            return ['ok' => false, 'ms' => null];
        }

        if (preg_match('/(?:time[=<]|เวลา=)\s*(\d+)\s*ms/i', $output, $m)) {
            return ['ok' => true, 'ms' => (int) $m[1]];
        }

        if (stripos($output, 'TTL=') !== false || stripos($output, 'ttl=') !== false) {
            return ['ok' => true, 'ms' => 1];
        }

        return ['ok' => false, 'ms' => null];
    }

    private function checkPort(string $host, int $port): bool
    {
        if (! $this->isValidHost($host)) {
            return false;
        }

        $conn = @fsockopen($host, $port, $errno, $errstr, 2);

        if ($conn) {
            fclose($conn);

            return true;
        }

        return false;
    }

    /** @return array{ok: bool, ms: ?int} */
    private function checkMysqlLatency(string $connection = 'hosxp_backup'): array
    {
        try {
            if (! config('database.connections.'.$connection)) {
                return ['ok' => false, 'ms' => null];
            }

            $start = microtime(true);
            DB::connection($connection)->select('SELECT 1');
            $ms = (int) round((microtime(true) - $start) * 1000);

            return ['ok' => true, 'ms' => $ms];
        } catch (\Throwable $e) {
            Log::warning('Server monitor MySQL check failed: '.$e->getMessage());

            return ['ok' => false, 'ms' => null];
        }
    }

    /** @param array<int, array{label: string, open: bool}> $ports */
    private function buildMessage(bool $pingOk, array $ports, ?array $mysql, ?array $snmp): string
    {
        $parts = [];
        $parts[] = $pingOk ? 'Ping OK' : 'Ping FAIL';
        foreach ($ports as $p) {
            $parts[] = ($p['label'] ?? 'Port').($p['open'] ? ' OK' : ' FAIL');
        }
        if ($mysql !== null) {
            $parts[] = $mysql['ok'] ? 'MySQL '.($mysql['ms'] ?? '-').'ms' : 'MySQL FAIL';
        }
        if ($snmp !== null) {
            if ($snmp['ok']) {
                $parts[] = 'SNMP OK';
                if ($snmp['cpu_percent'] !== null) {
                    $parts[] = 'CPU '.$snmp['cpu_percent'].'%';
                }
                if ($snmp['memory_percent'] !== null) {
                    $parts[] = 'RAM '.$snmp['memory_percent'].'%';
                }
                if ($snmp['disk_percent'] !== null) {
                    $parts[] = 'Disk '.$snmp['disk_percent'].'%';
                }
            } else {
                $parts[] = 'SNMP FAIL';
            }
        }

        return implode(' | ', $parts);
    }

    private function isValidHost(string $host): bool
    {
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            return true;
        }

        return (bool) preg_match('/^[a-zA-Z0-9.\-]+$/', $host);
    }

    private function maybeNotifyAdmins(array $result): void
    {
        $cacheKey = self::ALERT_KEY.'.'.$result['server_key'];
        if (Cache::has($cacheKey)) {
            return;
        }

        $admins = \App\Models\User::role(['admin', 'Admin'])->get();
        if ($admins->isEmpty()) {
            return;
        }

        $msg = ($result['name'] ?? $result['host']).' — '.$result['message'];
        Notification::send($admins, new HosxpConnectionAlertNotification($msg));
        Cache::put($cacheKey, true, now()->addHours(6));
    }

    private function pruneOldSnapshots(): void
    {
        $days = max((int) config('server_monitor.retention_days', 7), 1);
        ServerMonitorSnapshot::query()
            ->where('checked_at', '<', now()->subDays($days))
            ->delete();
    }
}
