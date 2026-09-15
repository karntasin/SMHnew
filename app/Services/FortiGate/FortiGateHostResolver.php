<?php

namespace App\Services\FortiGate;

use App\Models\FortigateHostCache;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

class FortiGateHostResolver
{
    public function __construct(
        protected readonly FortiGateClient $client,
    ) {}

    /**
     * Refresh host map from FortiGate DHCP / device inventory into cache table.
     */
    public function refreshDhcpCache(): int
    {
        if (! $this->client->configured()) {
            return 0;
        }

        $paths = array_values(array_filter([
            (string) config('fortigate.endpoints.user_device', '/api/v2/monitor/user/device/query'),
            (string) config('fortigate.endpoints.user_device_fallback', '/api/v2/monitor/user/device'),
            (string) config('fortigate.endpoints.dhcp', '/api/v2/monitor/system/dhcp'),
        ]));

        $count = 0;
        $now = now();
        $seenIps = [];

        foreach ($paths as $path) {
            try {
                $response = $this->client->get($path);
                if (! ($response['ok'] ?? false)) {
                    continue;
                }

                $results = $response['body']['results'] ?? [];
                if (! is_array($results)) {
                    continue;
                }

                foreach ($results as $row) {
                    if (! is_array($row)) {
                        continue;
                    }
                    $ip = (string) ($row['ip'] ?? $row['ipv4_address'] ?? $row['srcip'] ?? '');
                    if ($ip === '' || ! filter_var($ip, FILTER_VALIDATE_IP)) {
                        continue;
                    }
                    // Prefer device inventory over empty DHCP list; do not overwrite richer rows.
                    if (isset($seenIps[$ip]) && str_contains($path, 'dhcp')) {
                        continue;
                    }

                    $hostname = $this->firstNonEmpty([
                        $row['hostname'] ?? null,
                        $row['host'] ?? null,
                        $row['name'] ?? null,
                        $row['srcname'] ?? null,
                        $row['device_name'] ?? null,
                        $row['mac_firewall_address'] ?? null,
                        is_array($row['host'] ?? null) ? ($row['host']['name'] ?? null) : null,
                    ]);
                    $mac = $this->firstNonEmpty([
                        $row['mac'] ?? null,
                        $row['master_mac'] ?? null,
                        $row['srcmac'] ?? null,
                        $row['mastersrcmac'] ?? null,
                    ]);
                    $mac = $mac ? strtolower($mac) : null;

                    FortigateHostCache::query()->updateOrCreate(
                        ['ip' => $ip],
                        [
                            'hostname' => $hostname ? mb_substr($hostname, 0, 160) : null,
                            'mac' => $mac,
                            'source' => str_contains($path, 'dhcp') ? 'dhcp' : 'device',
                            'seen_at' => $now,
                        ]
                    );
                    $seenIps[$ip] = true;
                    $count++;
                }
            } catch (Throwable $e) {
                Log::warning('FortiGate host cache refresh failed ['.$path.']: '.$e->getMessage());
            }
        }

        if ($count > 0) {
            Cache::forget('fortigate.host_map');
        }

        return $count;
    }

    /**
     * Resolve display device name from log row + DHCP/static maps.
     *
     * @param  array<string, mixed>  $row
     * @return array{device_name:?string,src_user:?string,src_mac:?string}
     */
    public function resolveFromLogRow(array $row): array
    {
        $srcip = (string) ($row['srcip'] ?? '');
        $srcUser = $this->firstNonEmpty([
            $row['user'] ?? null,
            $row['unauthuser'] ?? null,
            $row['srcuser'] ?? null,
        ]);
        $srcMac = null;
        foreach (['srcmac', 'mastersrcmac', 'mac', 'src_mac', 'master_mac'] as $macKey) {
            if (! empty($row[$macKey])) {
                $srcMac = strtolower((string) $row[$macKey]);
                break;
            }
        }

        // Client-side names only. FortiGate traffic logs often set `devname` to the
        // firewall itself (e.g. FortiGate-100F) — never treat that as the endpoint.
        $fromLog = $this->firstNonEmpty([
            $row['srcname'] ?? null,
            $row['src_hostname'] ?? null,
            $row['mac_firewall_address'] ?? null,
        ]);
        $fromLog = $this->sanitizeEndpointName($fromLog);

        $fromCache = $srcip !== '' ? $this->lookupIp($srcip) : null;
        $fromCacheHost = $this->sanitizeEndpointName($fromCache['hostname'] ?? null);

        $deviceName = $this->firstNonEmpty([
            $fromLog,
            $fromCacheHost,
            $srcUser,
        ]);

        if (! $srcMac && isset($fromCache['mac'])) {
            $srcMac = $fromCache['mac'];
        }

        return [
            'device_name' => $deviceName ? mb_substr($deviceName, 0, 160) : null,
            'src_user' => $srcUser ? mb_substr($srcUser, 0, 120) : null,
            'src_mac' => $srcMac ? mb_substr($srcMac, 0, 32) : null,
        ];
    }

    /** Drop firewall/OS labels that are not useful as a client hostname. */
    private function sanitizeEndpointName(?string $name): ?string
    {
        if ($name === null) {
            return null;
        }
        $name = trim($name);
        if ($name === '') {
            return null;
        }

        $lower = mb_strtolower($name);
        if (
            str_starts_with($lower, 'fortigate')
            || str_starts_with($lower, 'forti ')
            || in_array($lower, ['windows', 'linux', 'android', 'ios', 'macos', 'unknown', 'n/a', '-'], true)
        ) {
            return null;
        }

        return $name;
    }

    /** @return array{hostname:?string,mac:?string}|null */
    public function lookupIp(string $ip): ?array
    {
        $map = $this->hostMap();
        if (isset($map[$ip])) {
            return $map[$ip];
        }

        $static = config('fortigate.host_static_map', []);
        if (isset($static[$ip]) && is_string($static[$ip]) && $static[$ip] !== '') {
            return ['hostname' => $static[$ip], 'mac' => null];
        }

        return null;
    }

    /** @return array<string, array{hostname:?string,mac:?string}> */
    private function hostMap(): array
    {
        return Cache::remember('fortigate.host_map', 300, function () {
            return FortigateHostCache::query()
                ->orderByDesc('seen_at')
                ->get(['ip', 'hostname', 'mac'])
                ->mapWithKeys(fn (FortigateHostCache $row) => [
                    $row->ip => [
                        'hostname' => $row->hostname,
                        'mac' => $row->mac,
                    ],
                ])
                ->all();
        });
    }

    /** @param array<int, mixed> $values */
    private function firstNonEmpty(array $values): ?string
    {
        foreach ($values as $value) {
            if ($value === null) {
                continue;
            }
            $s = trim((string) $value);
            if ($s !== '' && strtolower($s) !== 'n/a' && $s !== '-') {
                return $s;
            }
        }

        return null;
    }
}
