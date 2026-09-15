<?php

namespace App\Services\ThreatIntel;

use App\Models\ThreatIntelIndicator;
use App\Models\ThreatIntelSyncRun;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class ThreatIntelSyncService
{
    public function __construct(
        protected readonly ThreatIntelMatcher $matcher,
    ) {}

    /** @return array<string, array{status:string,fetched:int,upserted:int,message:?string}> */
    public function syncAll(?array $onlyFeeds = null): array
    {
        $results = [];
        $results['local'] = $this->syncLocalLists();

        foreach (config('threat_intel.feeds', []) as $key => $feed) {
            if ($onlyFeeds !== null && ! in_array($key, $onlyFeeds, true)) {
                continue;
            }
            if (! ($feed['enabled'] ?? true)) {
                $results[$key] = [
                    'status' => 'skipped',
                    'fetched' => 0,
                    'upserted' => 0,
                    'message' => 'disabled',
                ];

                continue;
            }

            $results[$key] = $this->syncFeed($key, $feed);
        }

        $this->seedRiskyPorts();
        $this->matcher->flushIndex();

        return $results;
    }

    /** @param array<string, mixed> $feed */
    public function syncFeed(string $key, array $feed): array
    {
        $run = ThreatIntelSyncRun::create([
            'feed' => $key,
            'status' => 'running',
            'started_at' => now(),
        ]);

        try {
            if (($feed['requires_auth'] ?? false) === 'abusech' && config('threat_intel.abusech_auth_key') === '') {
                return $this->finishRun($run, 'skipped', 0, 0, 'ต้องตั้ง ABUSECH_AUTH_KEY (ฟรีที่ auth.abuse.ch)');
            }
            if (($feed['requires_auth'] ?? false) === 'phishtank' && config('threat_intel.phishtank_api_key') === '') {
                return $this->finishRun($run, 'skipped', 0, 0, 'ต้องตั้ง PHISHTANK_API_KEY (ตอนนี้สมัครใหม่ปิด — ใช้ OpenPhish แทนได้)');
            }

            $body = $this->fetchFeedBody($key, $feed);
            $items = $this->parseFeed($feed['type'] ?? '', $body, $feed);
            $maxItems = (int) ($feed['max_items'] ?? 0);
            if ($maxItems > 0 && count($items) > $maxItems) {
                $items = array_slice($items, 0, $maxItems);
            }
            $upserted = $this->upsertItems($key, $items, (string) ($feed['threat_type'] ?? 'unknown'));

            return $this->finishRun($run, 'ok', count($items), $upserted, null);
        } catch (Throwable $e) {
            Log::warning("Threat intel sync failed [{$key}]: ".$e->getMessage());

            return $this->finishRun($run, 'error', 0, 0, $e->getMessage());
        }
    }

    /** @return array{status:string,fetched:int,upserted:int,message:?string} */
    public function syncLocalLists(): array
    {
        $run = ThreatIntelSyncRun::create([
            'feed' => 'local',
            'status' => 'running',
            'started_at' => now(),
        ]);

        $items = [];
        foreach (config('threat_intel.thai_domains', []) as $domain) {
            $items[] = ['type' => 'domain', 'value' => strtolower($domain), 'threat_type' => 'thai-advisory', 'feed' => 'thai'];
        }
        foreach (config('threat_intel.custom_domains', []) as $domain) {
            $items[] = ['type' => 'domain', 'value' => strtolower($domain), 'threat_type' => 'custom-blacklist', 'feed' => 'custom'];
        }
        foreach (config('threat_intel.custom_ips', []) as $ip) {
            $items[] = ['type' => 'ip', 'value' => strtolower($ip), 'threat_type' => 'custom-blacklist', 'feed' => 'custom'];
        }

        $upserted = 0;
        foreach ($items as $item) {
            $upserted += $this->upsertOne(
                $item['feed'],
                $item['type'],
                $item['value'],
                $item['threat_type'],
                90
            ) ? 1 : 0;
        }

        return $this->finishRun($run, 'ok', count($items), $upserted, 'thai + custom lists');
    }

    public function addCustomIndicator(string $type, string $value, ?string $threatType = 'custom-blacklist'): ThreatIntelIndicator
    {
        $type = in_array($type, ['ip', 'domain', 'url', 'cidr'], true) ? $type : 'domain';
        $value = strtolower(trim($value));
        $this->upsertOne('custom', $type, $value, $threatType ?: 'custom-blacklist', 95);
        $this->matcher->flushIndex();

        return ThreatIntelIndicator::query()
            ->where('feed', 'custom')
            ->where('indicator_type', $type)
            ->where('value', $value)
            ->firstOrFail();
    }

    public function dashboard(): array
    {
        $byFeed = ThreatIntelIndicator::query()
            ->where('is_active', true)
            ->selectRaw('feed, indicator_type, count(*) as total')
            ->groupBy('feed', 'indicator_type')
            ->get()
            ->groupBy('feed')
            ->map(fn ($rows) => $rows->mapWithKeys(fn ($r) => [$r->indicator_type => (int) $r->total]))
            ->all();

        $latestRuns = ThreatIntelSyncRun::query()
            ->orderByDesc('id')
            ->limit(20)
            ->get()
            ->map(fn (ThreatIntelSyncRun $run) => [
                'feed' => $run->feed,
                'status' => $run->status,
                'fetched' => $run->fetched,
                'upserted' => $run->upserted,
                'message' => $run->message,
                'started_at' => $run->started_at?->toDateTimeString(),
                'finished_at' => $run->finished_at?->toDateTimeString(),
            ])
            ->all();

        $custom = ThreatIntelIndicator::query()
            ->whereIn('feed', ['custom', 'thai'])
            ->where('is_active', true)
            ->orderByDesc('updated_at')
            ->limit(100)
            ->get(['id', 'feed', 'indicator_type', 'value', 'threat_type', 'updated_at'])
            ->map(fn (ThreatIntelIndicator $i) => [
                'id' => $i->id,
                'feed' => $i->feed,
                'type' => $i->indicator_type,
                'value' => $i->value,
                'threat_type' => $i->threat_type,
                'updated_at' => $i->updated_at?->toDateTimeString(),
            ])
            ->all();

        return [
            'enabled' => (bool) config('threat_intel.enabled', true),
            'abusech_configured' => config('threat_intel.abusech_auth_key') !== '',
            'phishtank_configured' => config('threat_intel.phishtank_api_key') !== '',
            'totals' => [
                'indicators' => ThreatIntelIndicator::query()->where('is_active', true)->count(),
                'by_feed' => $byFeed,
            ],
            'risky_ports' => collect(config('threat_intel.risky_ports', []))->map(fn ($info, $port) => [
                'port' => (int) $port,
                'name' => $info['name'] ?? (string) $port,
                'risk' => $info['risk'] ?? 'high',
                'note' => $info['note'] ?? null,
            ])->values()->all(),
            'latest_runs' => $latestRuns,
            'custom_indicators' => $custom,
            'feeds' => collect(config('threat_intel.feeds', []))->map(fn ($f, $key) => [
                'key' => $key,
                'label' => $f['label'] ?? $key,
                'enabled' => (bool) ($f['enabled'] ?? true),
                'requires_auth' => $f['requires_auth'] ?? false,
            ])->values()->all(),
        ];
    }

    public function pruneExpired(): int
    {
        $days = max(7, (int) config('threat_intel.retention_days', 30));
        $cutoff = now()->subDays($days);

        return ThreatIntelIndicator::query()
            ->whereNotIn('feed', ['custom', 'thai', 'risky-ports'])
            ->where('last_seen_at', '<', $cutoff)
            ->delete();
    }

    private function seedRiskyPorts(): void
    {
        foreach (config('threat_intel.risky_ports', []) as $port => $info) {
            $this->upsertOne(
                'risky-ports',
                'port',
                (string) $port,
                ($info['risk'] ?? 'high').':'.($info['name'] ?? $port),
                100,
                ['note' => $info['note'] ?? null, 'name' => $info['name'] ?? null]
            );
        }
    }

    /** @param array<string, mixed> $feed */
    private function fetchFeedBody(string $key, array $feed): string
    {
        $url = (string) ($feed['url'] ?? '');
        $method = strtolower((string) ($feed['method'] ?? 'get'));

        if ($key === 'phishtank') {
            $ptKey = (string) config('threat_intel.phishtank_api_key');
            if ($ptKey !== '' && ! empty($feed['url_with_key'])) {
                $url = sprintf((string) $feed['url_with_key'], rawurlencode($ptKey));
            }
        }

        $request = Http::timeout(180)
            ->withHeaders([
                'User-Agent' => 'Mozilla/5.0 (compatible; SMH-ThreatIntel/1.0; +hospital-soc)',
                'Accept' => '*/*',
            ]);

        if (($feed['requires_auth'] ?? false) === 'abusech') {
            $request = $request->withHeaders(['Auth-Key' => (string) config('threat_intel.abusech_auth_key')]);
        }

        $response = $method === 'post'
            ? (
                ($feed['as_json'] ?? false)
                    ? $request->asJson()->post($url, $feed['body'] ?? [])
                    : $request->asForm()->post($url, $feed['body'] ?? [])
            )
            : $request->get($url);

        if (! $response->successful()) {
            throw new \RuntimeException('HTTP '.$response->status().' for '.$url.' body='.mb_substr($response->body(), 0, 180));
        }

        $body = $response->body();
        if (($feed['gzip'] ?? false) || str_ends_with(strtolower(parse_url($url, PHP_URL_PATH) ?: ''), '.gz')) {
            $decoded = @gzdecode($body);
            if ($decoded === false) {
                throw new \RuntimeException('Failed to gunzip feed: '.$url);
            }
            $body = $decoded;
        }

        return $body;
    }

    /**
     * @param  array<string, mixed>  $feed
     * @return list<array{type:string,value:string,threat_type:?string}>
     */
    private function parseFeed(string $type, string $body, array $feed): array
    {
        return match ($type) {
            'ip_lines' => $this->parseIpLines($body, (string) ($feed['threat_type'] ?? 'malicious-ip')),
            'url_lines' => $this->parseUrlLines($body, (string) ($feed['threat_type'] ?? 'phishing')),
            'spamhaus_drop' => $this->parseSpamhausDrop($body),
            'urlhaus_json' => $this->parseUrlhaus($body),
            'threatfox_json' => $this->parseThreatFox($body),
            'phishtank_csv' => $this->parsePhishTankCsv($body),
            default => [],
        };
    }

    /** @return list<array{type:string,value:string,threat_type:?string}> */
    private function parseIpLines(string $body, string $threatType): array
    {
        $items = [];
        foreach (preg_split("/\r\n|\n|\r/", $body) ?: [] as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }
            if (filter_var($line, FILTER_VALIDATE_IP)) {
                $items[] = ['type' => 'ip', 'value' => strtolower($line), 'threat_type' => $threatType];
            }
        }

        return $items;
    }

    /** @return list<array{type:string,value:string,threat_type:?string}> */
    private function parseUrlLines(string $body, string $threatType): array
    {
        $items = [];
        foreach (preg_split("/\r\n|\n|\r/", $body) ?: [] as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }
            $items[] = ['type' => 'url', 'value' => strtolower($line), 'threat_type' => $threatType];
            $host = parse_url(str_contains($line, '://') ? $line : 'http://'.$line, PHP_URL_HOST);
            if (is_string($host) && $host !== '') {
                $items[] = ['type' => 'domain', 'value' => strtolower($host), 'threat_type' => $threatType];
            }
        }

        return $items;
    }

    /** @return list<array{type:string,value:string,threat_type:?string}> */
    private function parseSpamhausDrop(string $body): array
    {
        $items = [];
        foreach (preg_split("/\r\n|\n|\r/", $body) ?: [] as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, ';')) {
                continue;
            }
            $cidr = strtok($line, ';');
            $cidr = trim((string) $cidr);
            if ($cidr !== '' && str_contains($cidr, '/')) {
                $items[] = ['type' => 'cidr', 'value' => strtolower($cidr), 'threat_type' => 'drop-netblock'];
            }
        }

        return $items;
    }

    /** @return list<array{type:string,value:string,threat_type:?string}> */
    private function parseUrlhaus(string $body): array
    {
        $json = json_decode($body, true);
        $rows = $json['urls'] ?? $json['data'] ?? (is_array($json) ? $json : []);
        if (! is_array($rows)) {
            return [];
        }

        $items = [];
        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }
            $url = strtolower((string) ($row['url'] ?? ''));
            if ($url === '') {
                continue;
            }
            $threat = (string) ($row['threat'] ?? $row['tags'][0] ?? 'malware-url');
            $items[] = ['type' => 'url', 'value' => $url, 'threat_type' => $threat];
            $host = (string) ($row['host'] ?? parse_url($url, PHP_URL_HOST) ?? '');
            if ($host !== '') {
                $items[] = ['type' => 'domain', 'value' => strtolower($host), 'threat_type' => $threat];
            }
        }

        return $items;
    }

    /** @return list<array{type:string,value:string,threat_type:?string}> */
    private function parseThreatFox(string $body): array
    {
        $json = json_decode($body, true);
        if (! is_array($json)) {
            throw new \RuntimeException('ThreatFox non-JSON: '.mb_substr($body, 0, 200));
        }

        $status = $json['query_status'] ?? null;
        $rows = $json['data'] ?? null;

        // ThreatFox sometimes returns data as associative map of id => row
        if (is_array($rows) && $rows !== [] && ! array_is_list($rows)) {
            $rows = array_values($rows);
        }

        if (! is_array($rows)) {
            throw new \RuntimeException('ThreatFox status='.(string) $status.' body='.mb_substr($body, 0, 200));
        }

        $items = [];
        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }
            $ioc = strtolower(trim((string) ($row['ioc'] ?? '')));
            $iocType = strtolower((string) ($row['ioc_type'] ?? ''));
            $threat = (string) ($row['threat_type'] ?? $row['malware'] ?? 'c2');
            if ($ioc === '') {
                continue;
            }

            $type = match (true) {
                str_contains($iocType, 'ip') => 'ip',
                str_contains($iocType, 'domain') => 'domain',
                str_contains($iocType, 'url') => 'url',
                default => filter_var($ioc, FILTER_VALIDATE_IP) ? 'ip' : (str_contains($ioc, '://') ? 'url' : 'domain'),
            };

            if ($type === 'ip' && str_contains($ioc, ':') && ! str_contains($ioc, '://')) {
                $ioc = explode(':', $ioc)[0];
            }

            $items[] = ['type' => $type, 'value' => $ioc, 'threat_type' => $threat];
        }

        return $items;
    }

    /** @return list<array{type:string,value:string,threat_type:?string}> */
    private function parsePhishTankCsv(string $body): array
    {
        $items = [];
        $seenDomains = [];
        $lines = preg_split("/\r\n|\n|\r/", $body) ?: [];
        $header = null;
        foreach ($lines as $i => $line) {
            if ($i === 0) {
                $header = str_getcsv($line);
                continue;
            }
            $cols = str_getcsv($line);
            if (! $header || count($cols) < 2) {
                continue;
            }
            $row = @array_combine($header, $cols);
            if (! is_array($row)) {
                continue;
            }
            $url = strtolower(trim((string) ($row['url'] ?? $cols[1] ?? '')));
            if ($url === '') {
                continue;
            }
            $host = parse_url(str_contains($url, '://') ? $url : 'http://'.$url, PHP_URL_HOST);
            if (! is_string($host) || $host === '') {
                continue;
            }
            $host = strtolower($host);
            if (isset($seenDomains[$host])) {
                continue;
            }
            $seenDomains[$host] = true;
            // Prefer domain IOCs for matching FortiGate hostname/url logs (faster + smaller)
            $items[] = ['type' => 'domain', 'value' => $host, 'threat_type' => 'phishing'];
        }

        return $items;
    }

    /**
     * @param  list<array{type:string,value:string,threat_type:?string}>  $items
     */
    private function upsertItems(string $feed, array $items, string $defaultThreat): int
    {
        if ($items === []) {
            return 0;
        }

        $now = now();
        $expires = now()->addDays(max(7, (int) config('threat_intel.retention_days', 30)));
        $rows = [];
        foreach ($items as $item) {
            $value = mb_substr(strtolower(trim((string) ($item['value'] ?? ''))), 0, 512);
            if ($value === '') {
                continue;
            }
            $rows[] = [
                'feed' => $feed,
                'indicator_type' => $item['type'],
                'value' => $value,
                'threat_type' => $item['threat_type'] ?: $defaultThreat,
                'confidence' => 75,
                'is_active' => true,
                'first_seen_at' => $now,
                'last_seen_at' => $now,
                'expires_at' => $expires,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        $count = 0;
        foreach (array_chunk($rows, 500) as $chunk) {
            ThreatIntelIndicator::query()->upsert(
                $chunk,
                ['feed', 'indicator_type', 'value'],
                ['threat_type', 'confidence', 'is_active', 'last_seen_at', 'expires_at', 'updated_at']
            );
            $count += count($chunk);
        }

        return $count;
    }

    /** @param array<string, mixed>|null $meta */
    private function upsertOne(
        string $feed,
        string $type,
        string $value,
        string $threatType,
        int $confidence = 70,
        ?array $meta = null,
    ): bool {
        $value = mb_substr(strtolower(trim($value)), 0, 512);
        if ($value === '') {
            return false;
        }

        $existing = ThreatIntelIndicator::query()
            ->where('feed', $feed)
            ->where('indicator_type', $type)
            ->where('value', $value)
            ->first();

        if ($existing) {
            $existing->update([
                'threat_type' => $threatType,
                'confidence' => $confidence,
                'meta' => $meta ?? $existing->meta,
                'is_active' => true,
                'last_seen_at' => now(),
                'expires_at' => now()->addDays(max(7, (int) config('threat_intel.retention_days', 30))),
            ]);

            return true;
        }

        ThreatIntelIndicator::create([
            'feed' => $feed,
            'indicator_type' => $type,
            'value' => $value,
            'threat_type' => $threatType,
            'confidence' => $confidence,
            'meta' => $meta,
            'is_active' => true,
            'first_seen_at' => now(),
            'last_seen_at' => now(),
            'expires_at' => now()->addDays(max(7, (int) config('threat_intel.retention_days', 30))),
        ]);

        return true;
    }

    /** @return array{status:string,fetched:int,upserted:int,message:?string} */
    private function finishRun(ThreatIntelSyncRun $run, string $status, int $fetched, int $upserted, ?string $message): array
    {
        $run->update([
            'status' => $status,
            'fetched' => $fetched,
            'upserted' => $upserted,
            'message' => $message ? mb_substr($message, 0, 2000) : null,
            'finished_at' => now(),
        ]);

        return [
            'status' => $status,
            'fetched' => $fetched,
            'upserted' => $upserted,
            'message' => $message,
        ];
    }
}
