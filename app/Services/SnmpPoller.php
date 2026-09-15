<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

/**
 * SNMP v2c poller via snmpget CLI (Net-SNMP).
 * ติดตั้งบนเครื่อง Laravel: https://sourceforge.net/projects/net-snmp/
 */
class SnmpPoller
{
    /** @return array{ok: bool, sys_name: ?string, cpu_percent: ?int, memory_percent: ?int, disk_percent: ?int, uptime_seconds: ?int, error: ?string} */
    public function poll(string $host, ?string $community = null): array
    {
        $community = $community ?? config('server_monitor.snmp.community');
        if (! $community) {
            return $this->fail('SNMP community not configured');
        }

        $binary = config('server_monitor.snmp.snmpget_path', 'snmpget');
        if (! $this->canRunSnmpget($binary)) {
            return $this->fail('snmpget not found — install Net-SNMP on app server (192.168.1.214)');
        }

        $timeout = (int) config('server_monitor.snmp.timeout_seconds', 3);
        $retries = (int) config('server_monitor.snmp.retries', 1);
        $opts = sprintf('-v2c -t %d -r %d -Oqv', $timeout, $retries);
        $timetickOpts = sprintf('-v2c -t %d -r %d -Oqv -Ot', $timeout, $retries);

        $sysName = $this->get($binary, $opts, $community, $host, '1.3.6.1.2.1.1.5.0');
        if ($sysName === null) {
            return $this->fail('SNMP no response (check community / firewall / rocommunity 192.168.1.214)');
        }

        $uptimeTicks = $this->getNumeric($binary, $timetickOpts, $community, $host, '1.3.6.1.2.1.1.3.0');
        $uptimeSeconds = $uptimeTicks !== null ? (int) floor($uptimeTicks / 100) : null;

        // memTotalReal + memAvailReal (OID .4.6 is swap, not RAM)
        $memTotal = $this->getNumeric($binary, $opts, $community, $host, '1.3.6.1.4.1.2021.4.5.0');
        $memAvail = $this->getNumeric($binary, $opts, $community, $host, '1.3.6.1.4.1.2021.4.11.0');
        $memPercent = null;
        if ($memTotal > 0 && $memAvail !== null) {
            $memPercent = (int) round(($memTotal - $memAvail) / $memTotal * 100);
            $memPercent = max(0, min(100, $memPercent));
        }

        $cpuIdle = $this->getNumeric($binary, $opts, $community, $host, '1.3.6.1.4.1.2021.11.11.0');
        $cpuPercent = $cpuIdle !== null ? max(0, min(100, (int) round(100 - $cpuIdle))) : null;

        $diskPercent = $this->pollRootDiskPercent($binary, $opts, $community, $host);

        return [
            'ok' => true,
            'sys_name' => $sysName,
            'cpu_percent' => $cpuPercent,
            'memory_percent' => $memPercent,
            'disk_percent' => $diskPercent,
            'uptime_seconds' => $uptimeSeconds,
            'error' => null,
        ];
    }

    private function pollRootDiskPercent(string $binary, string $opts, string $community, string $host): ?int
    {
        $index = $this->resolveStorageIndex($binary, $opts, $community, $host);
        if ($index === null) {
            return null;
        }

        $size = $this->getNumeric($binary, $opts, $community, $host, "1.3.6.1.2.1.25.2.3.1.5.{$index}");
        $used = $this->getNumeric($binary, $opts, $community, $host, "1.3.6.1.2.1.25.2.3.1.6.{$index}");
        if ($size <= 0 || $used === null) {
            return null;
        }

        return max(0, min(100, (int) round($used / $size * 100)));
    }

    private function resolveStorageIndex(string $binary, string $opts, string $community, string $host): ?int
    {
        $mount = (string) config('server_monitor.snmp.disk_mount', '/');
        $walkBinary = $this->companionBinary($binary, 'snmpwalk');
        if (! is_file($walkBinary)) {
            return null;
        }

        $timeout = (int) config('server_monitor.snmp.timeout_seconds', 3);
        $retries = (int) config('server_monitor.snmp.retries', 1);
        $cmd = sprintf(
            '%s -v2c -t %d -r %d -c %s %s 1.3.6.1.2.1.25.2.3.1.3 2>&1',
            escapeshellcmd($walkBinary),
            $timeout,
            $retries,
            escapeshellarg($community),
            escapeshellarg($host)
        );

        $output = shell_exec($cmd);
        if ($output === null || trim($output) === '') {
            return null;
        }

        if (preg_match_all('/hrStorageDescr\.(\d+)\s*=\s*STRING:\s*(.+)$/mi', $output, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $match) {
                if (trim($match[2], "\" \t") === $mount) {
                    return (int) $match[1];
                }
            }
        }

        return null;
    }

    private function companionBinary(string $binary, string $name): string
    {
        if (str_contains($binary, '/') || str_contains($binary, '\\')) {
            $dir = dirname($binary);
            $exe = PHP_OS_FAMILY === 'Windows' ? '.exe' : '';

            return $dir.DIRECTORY_SEPARATOR.$name.$exe;
        }

        return $name;
    }

    private function canRunSnmpget(string $binary): bool
    {
        if (str_contains($binary, '/') || str_contains($binary, '\\')) {
            return is_file($binary);
        }

        $cmd = PHP_OS_FAMILY === 'Windows'
            ? 'where '.escapeshellarg($binary).' 2>nul'
            : 'command -v '.escapeshellarg($binary).' 2>/dev/null';

        return trim(shell_exec($cmd) ?? '') !== '';
    }

    private function get(string $binary, string $opts, string $community, string $host, string $oid): ?string
    {
        $cmd = sprintf(
            '%s %s -c %s %s %s 2>&1',
            escapeshellcmd($binary),
            $opts,
            escapeshellarg($community),
            escapeshellarg($host),
            escapeshellarg($oid)
        );

        $output = shell_exec($cmd);
        if ($output === null || $output === '') {
            return null;
        }

        $line = trim($output);
        if ($line === '' || stripos($line, 'Timeout') !== false || stripos($line, 'No Such') !== false) {
            Log::debug('SNMP get failed', ['host' => $host, 'oid' => $oid, 'output' => $line]);

            return null;
        }

        return trim($line, '"');
    }

    private function getNumeric(string $binary, string $opts, string $community, string $host, string $oid): ?float
    {
        $val = $this->get($binary, $opts, $community, $host, $oid);
        if ($val === null) {
            return null;
        }

        if (preg_match('/-?\d+(?:\.\d+)?/', $val, $m)) {
            return (float) $m[0];
        }

        return null;
    }

    /** @return array{ok: bool, sys_name: ?string, cpu_percent: ?int, memory_percent: ?int, disk_percent: ?int, uptime_seconds: ?int, error: ?string} */
    private function fail(string $message): array
    {
        return [
            'ok' => false,
            'sys_name' => null,
            'cpu_percent' => null,
            'memory_percent' => null,
            'disk_percent' => null,
            'uptime_seconds' => null,
            'error' => $message,
        ];
    }
}
