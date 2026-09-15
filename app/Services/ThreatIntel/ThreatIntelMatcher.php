<?php

namespace App\Services\ThreatIntel;

use App\Models\ThreatIntelIndicator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class ThreatIntelMatcher
{
    /** @var array{ips:array<string,array>,domains:array<string,array>,urls:array<string,array>,cidrs:list<array>,ports:array<int,array>}|null */
    private ?array $index = null;

    /**
     * Match log fields against threat intel + risky ports.
     *
     * @param  array<string, mixed>  $row
     * @return array{
     *   is_ti_hit:bool,
     *   is_risky_port:bool,
     *   ti_feed:?string,
     *   ti_indicator:?string,
     *   ti_threat_type:?string,
     *   risky_port:?int,
     *   risky_port_name:?string
     * }
     */
    public function match(array $row): array
    {
        $index = $this->getIndex();

        $srcip = strtolower(trim((string) ($row['srcip'] ?? '')));
        $dstip = strtolower(trim((string) ($row['dstip'] ?? '')));
        $hostname = strtolower(trim((string) ($row['hostname'] ?? '')));
        $url = strtolower(trim((string) ($row['url'] ?? '')));
        $dstPort = $this->extractPort($row);

        $hit = null;

        foreach ([$dstip, $srcip] as $ip) {
            if ($ip !== '' && isset($index['ips'][$ip])) {
                $hit = $index['ips'][$ip];
                break;
            }
        }

        if (! $hit && $hostname !== '') {
            $hit = $this->matchDomain($hostname, $index['domains']);
        }

        if (! $hit && $url !== '') {
            if (isset($index['urls'][$url])) {
                $hit = $index['urls'][$url];
            } else {
                $hostFromUrl = $this->hostFromUrl($url);
                if ($hostFromUrl) {
                    $hit = $this->matchDomain($hostFromUrl, $index['domains']);
                }
                if (! $hit) {
                    foreach ($index['urls'] as $indicatorUrl => $meta) {
                        if (str_contains($url, $indicatorUrl) || str_contains($indicatorUrl, $url)) {
                            $hit = $meta;
                            break;
                        }
                    }
                }
            }
        }

        if (! $hit) {
            foreach ([$dstip, $srcip] as $ip) {
                if ($ip === '') {
                    continue;
                }
                $cidrHit = $this->matchCidr($ip, $index['cidrs']);
                if ($cidrHit) {
                    $hit = $cidrHit;
                    break;
                }
            }
        }

        $risky = null;
        $riskyName = null;
        $isRisky = false;
        if ($dstPort !== null && isset($index['ports'][$dstPort])) {
            $isRisky = true;
            $risky = $dstPort;
            $riskyName = $index['ports'][$dstPort]['name'] ?? (string) $dstPort;
        }

        return [
            'is_ti_hit' => $hit !== null,
            'is_risky_port' => $isRisky,
            'ti_feed' => $hit['feed'] ?? null,
            'ti_indicator' => $hit['value'] ?? null,
            'ti_threat_type' => $hit['threat_type'] ?? null,
            'risky_port' => $risky,
            'risky_port_name' => $riskyName,
        ];
    }

    public function flushIndex(): void
    {
        $this->index = null;
        Cache::store('file')->forget('threat_intel.match_index');
        Cache::forget('threat_intel.match_index');
    }

    /** @return array{ips:array,domains:array,urls:array,cidrs:list,ports:array} */
    private function getIndex(): array
    {
        if ($this->index !== null) {
            return $this->index;
        }

        $this->index = Cache::store('file')->remember('threat_intel.match_index', 600, function () {
            $ips = [];
            $domains = [];
            $urls = [];
            $cidrs = [];

            ThreatIntelIndicator::query()
                ->where('is_active', true)
                ->where(function ($q) {
                    $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
                })
                ->orderByDesc('id')
                ->limit(200000)
                ->get(['feed', 'indicator_type', 'value', 'threat_type'])
                ->each(function (ThreatIntelIndicator $row) use (&$ips, &$domains, &$urls, &$cidrs) {
                    $meta = [
                        'feed' => $row->feed,
                        'value' => $row->value,
                        'threat_type' => $row->threat_type,
                    ];
                    $value = strtolower(trim($row->value));
                    match ($row->indicator_type) {
                        'ip' => $ips[$value] = $meta,
                        'domain' => $domains[$value] = $meta,
                        'url' => $urls[$value] = $meta,
                        'cidr' => $cidrs[] = array_merge($meta, ['cidr' => $value]),
                        default => null,
                    };
                });

            $ports = [];
            foreach (config('threat_intel.risky_ports', []) as $port => $info) {
                $ports[(int) $port] = [
                    'name' => $info['name'] ?? (string) $port,
                    'risk' => $info['risk'] ?? 'high',
                    'note' => $info['note'] ?? null,
                ];
            }

            return compact('ips', 'domains', 'urls', 'cidrs', 'ports');
        });

        return $this->index;
    }

    /** @param array<string, array> $domains */
    private function matchDomain(string $host, array $domains): ?array
    {
        $host = strtolower(rtrim($host, '.'));
        if (isset($domains[$host])) {
            return $domains[$host];
        }

        foreach ($domains as $domain => $meta) {
            if ($host === $domain || Str::endsWith($host, '.'.$domain)) {
                return $meta;
            }
        }

        return null;
    }

    /** @param list<array{cidr:string,feed:string,value:string,threat_type:?string}> $cidrs */
    private function matchCidr(string $ip, array $cidrs): ?array
    {
        if (! filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            return null;
        }
        $ipLong = ip2long($ip);
        if ($ipLong === false) {
            return null;
        }

        foreach ($cidrs as $row) {
            $cidr = $row['cidr'] ?? '';
            if (! str_contains($cidr, '/')) {
                continue;
            }
            [$subnet, $mask] = explode('/', $cidr, 2);
            $mask = (int) $mask;
            $subnetLong = ip2long($subnet);
            if ($subnetLong === false || $mask < 0 || $mask > 32) {
                continue;
            }
            $maskLong = $mask === 0 ? 0 : (~((1 << (32 - $mask)) - 1) & 0xFFFFFFFF);
            if ((($ipLong & $maskLong) === ($subnetLong & $maskLong))) {
                return $row;
            }
        }

        return null;
    }

    /** @param array<string, mixed> $row */
    private function extractPort(array $row): ?int
    {
        if (isset($row['dstport']) && is_numeric($row['dstport'])) {
            return (int) $row['dstport'];
        }

        $service = (string) ($row['service'] ?? '');
        if (preg_match('/(?:^|\/|:)(\d{1,5})$/', $service, $m)) {
            $port = (int) $m[1];
            if ($port > 0 && $port <= 65535) {
                return $port;
            }
        }

        return null;
    }

    private function hostFromUrl(string $url): ?string
    {
        if (! str_contains($url, '://')) {
            $url = 'http://'.$url;
        }
        $host = parse_url($url, PHP_URL_HOST);

        return is_string($host) && $host !== '' ? strtolower($host) : null;
    }
}
