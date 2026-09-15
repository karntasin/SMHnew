<?php

namespace App\Services\FortiGate;

use App\Models\FortigateInterfaceSnapshot;
use App\Models\FortigateResourceSnapshot;
use App\Models\FortigateSecurityLog;
use App\Services\FshhChat\FshhChatSyncService;
use App\Services\Im\AssetMacLookup;
use App\Services\ThreatIntel\ThreatIntelMatcher;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class FortiGateMonitorService
{
    public function __construct(
        protected readonly FortiGateClient $client,
        protected readonly FshhChatSyncService $chat,
        protected readonly FortiGateHostResolver $hosts,
        protected readonly ThreatIntelMatcher $threatIntel,
    ) {}

    /** @return array<string, mixed> */
    public function poll(bool $notify = true): array
    {
        if (! $this->client->configured()) {
            return [
                'ok' => false,
                'message' => 'FortiGate not configured',
                'resource' => null,
                'interfaces' => 0,
                'logs' => [],
                'traffic_log' => ['available' => false, 'status' => null, 'message' => 'not configured'],
            ];
        }

        $resource = $this->pollResource();
        $interfaces = $this->pollInterfaces($resource['checked_at']);
        $dhcpHosts = $this->hosts->refreshDhcpCache();
        $trafficProbe = $this->probeTrafficLog();
        $logs = $this->pollSecurityLogs($notify);

        return [
            'ok' => true,
            'message' => 'polled',
            'resource' => $resource,
            'interfaces' => $interfaces,
            'dhcp_hosts' => $dhcpHosts,
            'logs' => $logs,
            'traffic_log' => $trafficProbe,
        ];
    }

    /** @return array<string, mixed> */
    private function pollResource(): array
    {
        $usage = $this->client->get((string) config('fortigate.endpoints.resource_usage'));
        $results = $usage['body']['results'] ?? [];

        $statusBody = [];
        try {
            $status = $this->client->get((string) config('fortigate.endpoints.system_status'));
            $statusBody = $status['body']['results'] ?? [];
        } catch (Throwable $e) {
            Log::warning('FortiGate status probe failed: '.$e->getMessage());
        }

        $cpu = $this->currentMetric($results['cpu'] ?? null);
        $mem = $this->currentMetric($results['mem'] ?? null);
        $disk = $this->currentMetric($results['disk'] ?? null);
        $sessions = $this->currentMetric($results['session'] ?? null);
        $sessions6 = $this->currentMetric($results['session6'] ?? null);
        $setupRate = $this->currentMetric($results['setuprate'] ?? null);

        $health = $this->resolveHealth($cpu, $mem, $sessions);
        $checkedAt = now();

        $snapshot = FortigateResourceSnapshot::create([
            'cpu_percent' => $cpu,
            'memory_percent' => $mem,
            'disk_percent' => $disk,
            'session_count' => $sessions,
            'session6_count' => $sessions6,
            'setup_rate' => $setupRate,
            'hostname' => $statusBody['hostname'] ?? null,
            'model' => $statusBody['model'] ?? ($statusBody['model_number'] ?? null),
            'version' => $usage['body']['version'] ?? null,
            'serial' => $usage['body']['serial'] ?? null,
            'health' => $health,
            'raw_meta' => [
                'log_disk_status' => $statusBody['log_disk_status'] ?? null,
                'model_name' => $statusBody['model_name'] ?? null,
            ],
            'checked_at' => $checkedAt,
        ]);

        return [
            'id' => $snapshot->id,
            'cpu_percent' => $cpu,
            'memory_percent' => $mem,
            'session_count' => $sessions,
            'health' => $health,
            'checked_at' => $checkedAt,
        ];
    }

    private function pollInterfaces(Carbon $checkedAt): int
    {
        $response = $this->client->get((string) config('fortigate.endpoints.interfaces'));
        $results = $response['body']['results'] ?? [];
        if (! is_array($results)) {
            return 0;
        }

        $count = 0;
        foreach ($results as $name => $iface) {
            if (! is_array($iface)) {
                continue;
            }

            $ifaceName = (string) ($iface['name'] ?? $name);
            $rx = (int) ($iface['rx_bytes'] ?? 0);
            $tx = (int) ($iface['tx_bytes'] ?? 0);

            $prev = FortigateInterfaceSnapshot::query()
                ->where('interface_name', $ifaceName)
                ->orderByDesc('checked_at')
                ->first();

            $rxBps = null;
            $txBps = null;
            if ($prev && $prev->checked_at) {
                $seconds = max(1, $prev->checked_at->diffInSeconds($checkedAt));
                if ($rx >= (int) $prev->rx_bytes) {
                    $rxBps = (int) floor(($rx - (int) $prev->rx_bytes) * 8 / $seconds);
                }
                if ($tx >= (int) $prev->tx_bytes) {
                    $txBps = (int) floor(($tx - (int) $prev->tx_bytes) * 8 / $seconds);
                }
            }

            FortigateInterfaceSnapshot::create([
                'interface_name' => $ifaceName,
                'alias' => $iface['alias'] ?: null,
                'ip' => $iface['ip'] ?? null,
                'link' => (bool) ($iface['link'] ?? false),
                'speed_mbps' => isset($iface['speed']) ? (float) $iface['speed'] : null,
                'rx_bytes' => $rx,
                'tx_bytes' => $tx,
                'rx_packets' => (int) ($iface['rx_packets'] ?? 0),
                'tx_packets' => (int) ($iface['tx_packets'] ?? 0),
                'rx_bps' => $rxBps,
                'tx_bps' => $txBps,
                'checked_at' => $checkedAt,
            ]);
            $count++;
        }

        return $count;
    }

    /** @return array{available:bool,status:?int,message:string} */
    private function probeTrafficLog(): array
    {
        try {
            $response = $this->client->get((string) config('fortigate.endpoints.traffic_memory'));
            if (! ($response['ok'] ?? false)) {
                return [
                    'available' => false,
                    'status' => $response['status'] ?? 404,
                    'message' => 'GET /api/v2/log/memory/traffic returned 404 on this FortiGate (no local traffic log store). Using webfilter/app-ctrl logs instead.',
                ];
            }

            return [
                'available' => true,
                'status' => 200,
                'message' => 'Traffic memory log available',
            ];
        } catch (Throwable $e) {
            return [
                'available' => false,
                'status' => null,
                'message' => $e->getMessage(),
            ];
        }
    }

    /** @return array<string, int> */
    private function pollSecurityLogs(bool $notify): array
    {
        $counts = [];
        $endpoints = config('fortigate.endpoints.logs', []);

        foreach ($endpoints as $type => $path) {
            try {
                $response = $this->client->get((string) $path);
                if (! ($response['ok'] ?? false)) {
                    $counts[$type] = 0;

                    continue;
                }

                $rows = $response['body']['results'] ?? [];
                if (! is_array($rows)) {
                    $counts[$type] = 0;

                    continue;
                }

                $inserted = 0;
                foreach ($rows as $row) {
                    if (! is_array($row)) {
                        continue;
                    }
                    if ($this->storeSecurityLog((string) $type, $row, $notify)) {
                        $inserted++;
                    }
                }
                $counts[$type] = $inserted;
            } catch (Throwable $e) {
                Log::warning("FortiGate log poll failed [{$type}]: ".$e->getMessage());
                $counts[$type] = 0;
            }
        }

        return $counts;
    }

    /** @param array<string, mixed> $row */
    public function ingestLogRow(string $type, array $row, bool $notify = true): bool
    {
        return $this->storeSecurityLog($type, $row, $notify);
    }

    /** @param array<string, mixed> $row */
    private function storeSecurityLog(string $type, array $row, bool $notify): bool
    {
        $eventtime = isset($row['eventtime']) ? (int) $row['eventtime'] : null;
        $dedupe = hash('sha256', implode('|', [
            $type,
            (string) $eventtime,
            (string) ($row['sessionid'] ?? ''),
            (string) ($row['srcip'] ?? ''),
            (string) ($row['dstip'] ?? ''),
            (string) ($row['url'] ?? $row['hostname'] ?? ''),
            (string) ($row['virus'] ?? $row['attack'] ?? $row['app'] ?? ''),
            (string) ($row['msg'] ?? ''),
        ]));

        if (FortigateSecurityLog::query()->where('dedupe_key', $dedupe)->exists()) {
            return false;
        }

        $loggedAt = $this->resolveLoggedAt($row);
        $flags = $this->classifyWebAndThreat($type, $row);
        $device = $this->hosts->resolveFromLogRow($row);
        $ti = config('threat_intel.enabled', true) ? $this->threatIntel->match($row) : [
            'is_ti_hit' => false,
            'is_risky_port' => false,
            'ti_feed' => null,
            'ti_indicator' => null,
            'ti_threat_type' => null,
            'risky_port' => null,
            'risky_port_name' => null,
        ];

        $dstPort = isset($row['dstport']) && is_numeric($row['dstport'])
            ? (int) $row['dstport']
            : ($ti['risky_port'] ?? null);
        $srcPort = isset($row['srcport']) && is_numeric($row['srcport']) ? (int) $row['srcport'] : null;

        if ($ti['is_ti_hit'] || $ti['is_risky_port']) {
            $flags['is_threat'] = true;
        }

        $srcip = isset($row['srcip']) ? (string) $row['srcip'] : null;
        $ignored = $this->isIgnoredIp($srcip);
        if ($ignored) {
            // Keep raw log in "all", but do not treat as alert-worthy noise.
            $flags['is_denied_web'] = false;
            $flags['is_watch_web'] = false;
            $flags['is_threat'] = false;
            $flags['matched'] = null;
            $ti['is_ti_hit'] = false;
            $ti['is_risky_port'] = false;
        }

        $log = FortigateSecurityLog::create([
            'log_type' => $type,
            'dedupe_key' => $dedupe,
            'eventtime' => $eventtime,
            'log_date' => $row['date'] ?? null,
            'log_time' => $row['time'] ?? null,
            'logged_at' => $loggedAt,
            'level' => $row['level'] ?? null,
            'action' => $row['action'] ?? null,
            'subtype' => $row['subtype'] ?? null,
            'eventtype' => $row['eventtype'] ?? null,
            'srcip' => $srcip,
            'device_name' => $device['device_name'],
            'src_user' => $device['src_user'],
            'src_mac' => $device['src_mac'],
            'src_port' => $srcPort,
            'dst_port' => $dstPort,
            'dstip' => $row['dstip'] ?? null,
            'service' => $row['service'] ?? null,
            'hostname' => isset($row['hostname']) ? mb_substr((string) $row['hostname'], 0, 255) : null,
            'url' => isset($row['url']) ? mb_substr((string) $row['url'], 0, 2000) : null,
            'app' => $row['app'] ?? null,
            'appcat' => $row['appcat'] ?? null,
            'virus' => $row['virus'] ?? null,
            'attack' => $row['attack'] ?? ($row['attackname'] ?? null),
            'catdesc' => $row['catdesc'] ?? null,
            'msg' => isset($row['msg']) ? mb_substr((string) $row['msg'], 0, 2000) : null,
            'is_denied_web' => $flags['is_denied_web'],
            'is_watch_web' => $flags['is_watch_web'],
            'is_threat' => $flags['is_threat'],
            'is_ti_hit' => $ti['is_ti_hit'],
            'is_risky_port' => $ti['is_risky_port'],
            'ti_feed' => $ti['ti_feed'],
            'ti_indicator' => isset($ti['ti_indicator']) ? mb_substr((string) $ti['ti_indicator'], 0, 512) : null,
            'ti_threat_type' => $ti['ti_threat_type'],
            'alerted' => false,
            'payload' => $this->slimPayload($row, $ti),
        ]);

        if ($notify && ! $ignored) {
            $this->maybeAlert($log, $flags, $ti);
        }

        return true;
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array{is_denied_web:bool,is_watch_web:bool,is_threat:bool,matched:?string}
     */
    private function classifyWebAndThreat(string $type, array $row): array
    {
        $haystack = mb_strtolower(implode(' ', array_filter([
            (string) ($row['hostname'] ?? ''),
            (string) ($row['url'] ?? ''),
            (string) ($row['msg'] ?? ''),
            (string) ($row['catdesc'] ?? ''),
            (string) ($row['appcat'] ?? ''),
            (string) ($row['app'] ?? ''),
        ])));

        $matched = null;
        $isDenied = false;
        $isWatch = false;

        if (in_array($type, ['webfilter', 'app-ctrl', 'ssl'], true)) {
            foreach (config('fortigate.web_deny_patterns', []) as $pattern) {
                $pattern = mb_strtolower(trim((string) $pattern));
                if ($pattern !== '' && str_contains($haystack, $pattern)) {
                    $isDenied = true;
                    $matched = $pattern;
                    break;
                }
            }

            if (! $isDenied) {
                foreach (config('fortigate.web_watch_patterns', []) as $pattern) {
                    $pattern = mb_strtolower(trim((string) $pattern));
                    if ($pattern !== '' && str_contains($haystack, $pattern)) {
                        $isWatch = true;
                        $matched = $pattern;
                        break;
                    }
                }
            }

            $action = mb_strtolower((string) ($row['action'] ?? ''));
            $denyActions = array_map('mb_strtolower', config('fortigate.web_deny_actions', []));
            if (in_array($action, $denyActions, true) && ($row['catdesc'] ?? null)) {
                $isDenied = true;
                $matched = $matched ?: (string) $row['catdesc'];
            }
        }

        $isThreat = in_array($type, config('fortigate.threat_log_types', ['virus', 'ips', 'anomaly']), true)
            && ! empty($row);

        if ($type === 'virus' && empty($row['virus']) && empty($row['msg'])) {
            $isThreat = false;
        }

        return [
            'is_denied_web' => $isDenied,
            'is_watch_web' => $isWatch,
            'is_threat' => $isThreat,
            'matched' => $matched,
        ];
    }

    /**
     * @param  array{is_denied_web:bool,is_watch_web:bool,is_threat:bool,matched:?string}  $flags
     * @param  array<string, mixed>  $ti
     */
    private function maybeAlert(FortigateSecurityLog $log, array $flags, array $ti = []): void
    {
        if (! config('fortigate.notify_chat', true)) {
            return;
        }

        if ($this->isIgnoredIp($log->srcip)) {
            return;
        }

        $deviceLabel = $this->deviceLabel($log);

        if (! empty($ti['is_ti_hit']) && config('threat_intel.notify_on_hit', true)) {
            $this->notifyOnce(
                'ti:'.($ti['ti_feed'] ?? '').':'.($log->srcip ?: 'unknown').':'.($ti['ti_indicator'] ?? ''),
                '🎯 ตรง Threat Intelligence (FortiGate)',
                [
                    'เครื่อง' => $deviceLabel,
                    'แหล่ง IP' => (string) ($log->srcip ?: '-'),
                    'Feed' => (string) ($ti['ti_feed'] ?: '-'),
                    'Indicator' => mb_substr((string) ($ti['ti_indicator'] ?: '-'), 0, 180),
                    'ประเภทภัย' => (string) ($ti['ti_threat_type'] ?: '-'),
                    'เป้าหมาย' => mb_substr((string) ($log->hostname ?: $log->dstip ?: $log->url ?: '-'), 0, 180),
                    'เวลา' => optional($log->logged_at)->timezone('Asia/Bangkok')->format('d/m/Y H:i:s') ?? '-',
                ],
                '#DC2626',
                'วิกฤต',
                $log
            );
        }

        if (! empty($ti['is_risky_port']) && empty($ti['is_ti_hit'])) {
            $this->notifyOnce(
                'port:'.($ti['risky_port'] ?? '').':'.($log->srcip ?: 'unknown').':'.($log->dstip ?: ''),
                '⚠️ พอร์ตเสี่ยงถูกใช้งาน (FortiGate)',
                [
                    'เครื่อง' => $deviceLabel,
                    'แหล่ง IP' => (string) ($log->srcip ?: '-'),
                    'พอร์ต' => (string) (($ti['risky_port'] ?? '-').' / '.($ti['risky_port_name'] ?? '')),
                    'ปลายทาง' => (string) ($log->dstip ?: '-'),
                    'บริการ' => (string) ($log->service ?: '-'),
                    'เวลา' => optional($log->logged_at)->timezone('Asia/Bangkok')->format('d/m/Y H:i:s') ?? '-',
                ],
                '#EA580C',
                'เร่งด่วน',
                $log
            );
        }

        if ($flags['is_threat'] && empty($ti['is_ti_hit']) && empty($ti['is_risky_port'])) {
            $this->notifyOnce(
                'threat:'.$log->log_type.':'.($log->srcip ?: 'unknown').':'.($log->virus ?: $log->attack ?: $log->msg),
                '🛡️ แจ้งเตือนภัยคุกคาม FortiGate',
                [
                    'เครื่อง' => $deviceLabel,
                    'ประเภท' => $log->log_type,
                    'ไวรัส/โจมตี' => $log->virus ?: ($log->attack ?: '-'),
                    'แหล่ง' => (string) ($log->srcip ?: '-'),
                    'ปลายทาง' => (string) ($log->dstip ?: '-'),
                    'URL' => mb_substr((string) ($log->url ?: $log->hostname ?: '-'), 0, 180),
                    'การกระทำ' => (string) ($log->action ?: '-'),
                    'ข้อความ' => mb_substr((string) ($log->msg ?: '-'), 0, 180),
                    'เวลา' => optional($log->logged_at)->timezone('Asia/Bangkok')->format('d/m/Y H:i:s') ?? '-',
                ],
                '#EF4444',
                'วิกฤต',
                $log
            );

            return;
        }

        if ($flags['is_denied_web']) {
            $this->notifyOnce(
                'webdeny:'.($log->srcip ?: 'unknown').':'.($flags['matched'] ?: '').':'.($log->hostname ?: $log->url),
                '🚫 การใช้งานเว็บที่ไม่ควรเข้า (FortiGate)',
                [
                    'เครื่อง' => $deviceLabel,
                    'แหล่ง IP' => (string) ($log->srcip ?: '-'),
                    'โฮสต์/URL' => mb_substr((string) ($log->hostname ?: $log->url ?: '-'), 0, 180),
                    'หมวด/คำที่ตรง' => (string) ($flags['matched'] ?: ($log->catdesc ?: '-')),
                    'การกระทำ' => (string) ($log->action ?: '-'),
                    'บริการ' => (string) ($log->service ?: '-'),
                    'เวลา' => optional($log->logged_at)->timezone('Asia/Bangkok')->format('d/m/Y H:i:s') ?? '-',
                ],
                '#F59E0B',
                'เร่งด่วน',
                $log
            );
        }
    }

    private function deviceLabel(FortigateSecurityLog $log): string
    {
        $parts = array_filter([
            $log->device_name,
            $log->src_user,
            $log->srcip,
        ]);

        return $parts ? implode(' · ', $parts) : '-';
    }

    /**
     * @param  array<string, string>  $fields
     */
    private function notifyOnce(
        string $bucket,
        string $title,
        array $fields,
        string $color,
        string $priority,
        FortigateSecurityLog $log,
    ): void {
        $cooldown = max(5, (int) config('fortigate.alert_cooldown_minutes', 30));
        $key = 'fortigate.alert.'.sha1($bucket);
        if (! Cache::add($key, 1, now()->addMinutes($cooldown))) {
            return;
        }

        try {
            $this->chat->notifyCard(
                $this->chat->itDepartment(),
                $title,
                $fields,
                $color,
                $priority,
            );
            $log->update(['alerted' => true]);
        } catch (Throwable $e) {
            Log::warning('FortiGate chat notify failed: '.$e->getMessage());
        }
    }

    /** @return array<string, mixed> */
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

        $latest = FortigateResourceSnapshot::query()->orderByDesc('checked_at')->first();
        $history = FortigateResourceSnapshot::query()
            ->where('checked_at', '>=', $since)
            ->orderBy('checked_at')
            ->get([
                'checked_at', 'cpu_percent', 'memory_percent', 'session_count', 'setup_rate', 'health',
            ]);

        $latestIfaces = [];
        if ($latest) {
            $latestIfaces = FortigateInterfaceSnapshot::query()
                ->where('checked_at', $latest->checked_at)
                ->orderByDesc('link')
                ->orderByDesc('rx_bytes')
                ->get()
                ->map(fn (FortigateInterfaceSnapshot $row) => [
                    'name' => $row->interface_name,
                    'alias' => $row->alias,
                    'ip' => $row->ip,
                    'link' => $row->link,
                    'speed_mbps' => $row->speed_mbps,
                    'rx_bytes' => $row->rx_bytes,
                    'tx_bytes' => $row->tx_bytes,
                    'rx_bps' => $row->rx_bps,
                    'tx_bps' => $row->tx_bps,
                ])
                ->values()
                ->all();
        }

        $ifaceSeries = FortigateInterfaceSnapshot::query()
            ->where('checked_at', '>=', $since)
            ->where('link', true)
            ->orderBy('checked_at')
            ->get(['interface_name', 'checked_at', 'rx_bps', 'tx_bps'])
            ->groupBy('interface_name')
            ->map(function ($rows, $name) {
                return [
                    'name' => $name,
                    'points' => $rows->map(fn ($r) => [
                        'time' => $r->checked_at->format('H:i'),
                        'ts' => $r->checked_at->toIso8601String(),
                        'rx_mbps' => $r->rx_bps !== null ? round($r->rx_bps / 1_000_000, 3) : null,
                        'tx_mbps' => $r->tx_bps !== null ? round($r->tx_bps / 1_000_000, 3) : null,
                    ])->values()->all(),
                ];
            })
            ->values()
            ->all();

        $deniedCount = FortigateSecurityLog::query()
            ->where('is_denied_web', true)
            ->where('logged_at', '>=', $since);
        $this->excludeIgnoredIps($deniedCount);
        $deniedCount = $deniedCount->count();

        $threatCount = FortigateSecurityLog::query()
            ->where('is_threat', true)
            ->where('logged_at', '>=', $since);
        $this->excludeIgnoredIps($threatCount);
        $threatCount = $threatCount->count();

        $tiHitCount = FortigateSecurityLog::query()
            ->where('is_ti_hit', true)
            ->where('logged_at', '>=', $since);
        $this->excludeIgnoredIps($tiHitCount);
        $tiHitCount = $tiHitCount->count();

        $riskyPortCount = FortigateSecurityLog::query()
            ->where('is_risky_port', true)
            ->where('logged_at', '>=', $since);
        $this->excludeIgnoredIps($riskyPortCount);
        $riskyPortCount = $riskyPortCount->count();

        $topDevices = FortigateSecurityLog::query()
            ->where('logged_at', '>=', $since)
            ->where(function ($q) {
                $q->where('is_denied_web', true)
                    ->orWhere('is_threat', true)
                    ->orWhere('is_ti_hit', true)
                    ->orWhere('is_risky_port', true);
            });
        $this->excludeIgnoredIps($topDevices);
        $topDevices = $topDevices
            ->selectRaw('COALESCE(NULLIF(device_name, ""), srcip) as device_key, MAX(device_name) as device_name, MAX(srcip) as srcip, COUNT(*) as total')
            ->groupBy('device_key')
            ->orderByDesc('total')
            ->limit(8)
            ->get()
            ->map(fn ($row) => [
                'device' => $row->device_name ?: ($row->srcip ?: $row->device_key),
                'srcip' => $row->srcip,
                'total' => (int) $row->total,
            ])
            ->values()
            ->all();

        return [
            'configured' => $this->client->configured(),
            'latest' => $latest ? [
                'cpu_percent' => $latest->cpu_percent,
                'memory_percent' => $latest->memory_percent,
                'disk_percent' => $latest->disk_percent,
                'session_count' => $latest->session_count,
                'session6_count' => $latest->session6_count,
                'setup_rate' => $latest->setup_rate,
                'hostname' => $latest->hostname,
                'model' => $latest->model,
                'version' => $latest->version,
                'serial' => $latest->serial,
                'health' => $latest->health,
                'checked_at' => $latest->checked_at?->toDateTimeString(),
                'raw_meta' => $latest->raw_meta,
            ] : null,
            'series' => $history->map(fn ($row) => [
                'time' => $row->checked_at->format('H:i'),
                'ts' => $row->checked_at->toIso8601String(),
                'cpu_percent' => $row->cpu_percent,
                'memory_percent' => $row->memory_percent,
                'session_count' => $row->session_count,
                'setup_rate' => $row->setup_rate,
                'health' => $row->health,
            ])->values()->all(),
            'interfaces' => $latestIfaces,
            'interface_series' => $ifaceSeries,
            'stats' => [
                'denied_web' => $deniedCount,
                'threats' => $threatCount,
                'ti_hits' => $tiHitCount,
                'risky_ports' => $riskyPortCount,
                'samples' => $history->count(),
            ],
            'top_devices' => $topDevices,
            'traffic_log_note' => 'GET /api/v2/log/memory/traffic = 404 บนเครื่องนี้ (ไม่มี local traffic log) — ใช้ webfilter/app-ctrl แทน',
            'refresh_seconds' => (int) config('fortigate.dashboard_refresh_seconds', 30),
        ];
    }

    /** @return array{data: array<int, mixed>, total: int} */
    public function listLogs(string $scope = 'all', int $page = 1, int $perPage = 50): array
    {
        $query = FortigateSecurityLog::query()->orderByDesc('logged_at')->orderByDesc('id');

        match ($scope) {
            'web-deny' => $query->where('is_denied_web', true),
            'web-watch' => $query->where(function ($q) {
                $q->where('is_denied_web', true)->orWhere('is_watch_web', true);
            }),
            'threats' => $query->where('is_threat', true),
            'ti-hits' => $query->where('is_ti_hit', true),
            'risky-ports' => $query->where('is_risky_port', true),
            'webfilter' => $query->where('log_type', 'webfilter'),
            'app-ctrl' => $query->where('log_type', 'app-ctrl'),
            'traffic' => $query->where('log_type', 'traffic'),
            default => null,
        };

        // Alert / noisy scopes hide ignored collectors; "all" and raw type filters keep them.
        if (in_array($scope, ['web-deny', 'web-watch', 'threats', 'ti-hits', 'risky-ports'], true)) {
            $this->excludeIgnoredIps($query);
        }

        $paginator = $query->paginate($perPage, ['*'], 'page', max(1, $page));

        $items = collect($paginator->items());
        $assetByMac = app(AssetMacLookup::class)->mapByMacs(
            $items->pluck('src_mac')->all()
        );

        return [
            'data' => $items->map(function (FortigateSecurityLog $log) use ($assetByMac) {
                $macKey = AssetMacLookup::normalize($log->src_mac);
                $asset = $macKey !== null ? ($assetByMac[$macKey] ?? null) : null;

                return [
                    'id' => $log->id,
                    'log_type' => $log->log_type,
                    'logged_at' => $log->logged_at?->toDateTimeString(),
                    'level' => $log->level,
                    'action' => $log->action,
                    'srcip' => $log->srcip,
                    'device_name' => $log->device_name,
                    'src_user' => $log->src_user,
                    'src_mac' => $log->src_mac,
                    'src_port' => $log->src_port,
                    'dst_port' => $log->dst_port,
                    'dstip' => $log->dstip,
                    'service' => $log->service,
                    'hostname' => $log->hostname,
                    'url' => $log->url,
                    'app' => $log->app,
                    'appcat' => $log->appcat,
                    'virus' => $log->virus,
                    'attack' => $log->attack,
                    'catdesc' => $log->catdesc,
                    'msg' => $log->msg,
                    'is_denied_web' => $log->is_denied_web,
                    'is_watch_web' => $log->is_watch_web,
                    'is_threat' => $log->is_threat,
                    'is_ti_hit' => $log->is_ti_hit,
                    'is_risky_port' => $log->is_risky_port,
                    'ti_feed' => $log->ti_feed,
                    'ti_indicator' => $log->ti_indicator,
                    'ti_threat_type' => $log->ti_threat_type,
                    'alerted' => $log->alerted,
                    'it_asset' => $asset,
                ];
            })->all(),
            'total' => $paginator->total(),
            'page' => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
            'last_page' => $paginator->lastPage(),
        ];
    }

    /**
     * Prune by age (retention_days) then by storage budget (max_storage_gb).
     *
     * @return array{
     *   retention_days: int,
     *   max_bytes: int,
     *   deleted_by_age: int,
     *   deleted_by_size: int,
     *   deleted: int,
     *   age_breakdown: array{logs: int, resources: int, interfaces: int},
     *   storage_before: array{disk_bytes: int, live_bytes: int, tables: array<string, array{disk_bytes: int, rows: int, avg_row_length: int}>},
     *   storage_after: array{disk_bytes: int, live_bytes: int, tables: array<string, array{disk_bytes: int, rows: int, avg_row_length: int}>},
     *   optimized: bool
     * }
     */
    public function prune(bool $optimize = false): array
    {
        $days = max(1, (int) config('fortigate.retention_days', 90));
        $maxGb = max(0.1, (float) config('fortigate.max_storage_gb', 35));
        $maxBytes = (int) round($maxGb * 1024 * 1024 * 1024);
        $cutoff = now()->subDays($days);

        $storageBefore = $this->fortigateStorageStats();

        $deletedLogs = FortigateSecurityLog::query()->where('logged_at', '<', $cutoff)->delete();
        $deletedRes = FortigateResourceSnapshot::query()->where('checked_at', '<', $cutoff)->delete();
        $deletedIf = FortigateInterfaceSnapshot::query()->where('checked_at', '<', $cutoff)->delete();
        $deletedByAge = $deletedLogs + $deletedRes + $deletedIf;

        $deletedBySize = $this->pruneOldestUntilUnderBudget($maxBytes);

        $this->rotateSyslogListenLogIfHuge();

        $optimized = false;
        $storageAfter = $this->fortigateStorageStats();
        if ($optimize && $storageAfter['disk_bytes'] > $maxBytes && $deletedBySize + $deletedByAge > 0) {
            $optimized = $this->optimizeFortigateTables();
            $storageAfter = $this->fortigateStorageStats();
        }

        return [
            'retention_days' => $days,
            'max_bytes' => $maxBytes,
            'deleted_by_age' => $deletedByAge,
            'deleted_by_size' => $deletedBySize,
            'deleted' => $deletedByAge + $deletedBySize,
            'age_breakdown' => [
                'logs' => $deletedLogs,
                'resources' => $deletedRes,
                'interfaces' => $deletedIf,
            ],
            'storage_before' => $storageBefore,
            'storage_after' => $storageAfter,
            'optimized' => $optimized,
        ];
    }

    /**
     * @return array{disk_bytes: int, live_bytes: int, tables: array<string, array{disk_bytes: int, rows: int, avg_row_length: int}>}
     */
    public function fortigateStorageStats(): array
    {
        $names = [
            'fortigate_security_logs',
            'fortigate_resource_snapshots',
            'fortigate_interface_snapshots',
            'fortigate_host_cache',
        ];

        $placeholders = implode(',', array_fill(0, count($names), '?'));
        $rows = DB::select(
            "SELECT TABLE_NAME AS name,
                    COALESCE(DATA_LENGTH, 0) + COALESCE(INDEX_LENGTH, 0) AS disk_bytes,
                    COALESCE(TABLE_ROWS, 0) AS table_rows,
                    COALESCE(AVG_ROW_LENGTH, 0) AS avg_row_length
             FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME IN ({$placeholders})",
            $names
        );

        $tables = [];
        $disk = 0;
        $live = 0;
        foreach ($rows as $row) {
            $name = (string) $row->name;
            $diskBytes = (int) $row->disk_bytes;
            $tableRows = (int) $row->table_rows;
            $avg = (int) $row->avg_row_length;
            $tables[$name] = [
                'disk_bytes' => $diskBytes,
                'rows' => $tableRows,
                'avg_row_length' => $avg,
            ];
            $disk += $diskBytes;
            $live += $tableRows > 0 ? ($avg > 0 ? $tableRows * $avg : $diskBytes) : 0;
        }

        foreach ($names as $name) {
            if (! isset($tables[$name])) {
                $tables[$name] = ['disk_bytes' => 0, 'rows' => 0, 'avg_row_length' => 0];
            }
        }

        return [
            'disk_bytes' => $disk,
            'live_bytes' => $live > 0 ? $live : $disk,
            'tables' => $tables,
        ];
    }

    private function pruneOldestUntilUnderBudget(int $maxBytes): int
    {
        if ($maxBytes <= 0) {
            return 0;
        }

        // Target ~90% so the next ingest burst does not immediately re-trigger.
        $targetBytes = (int) floor($maxBytes * 0.90);
        $stats = $this->fortigateStorageStats();
        $current = max($stats['live_bytes'], $stats['disk_bytes']);
        if ($current <= $maxBytes) {
            return 0;
        }

        $logStats = $stats['tables']['fortigate_security_logs'] ?? null;
        if ($logStats === null || ($logStats['rows'] ?? 0) <= 0) {
            return 0;
        }

        $avgRow = max(256, (int) ($logStats['avg_row_length'] ?: 0));
        if ($avgRow <= 0 && $logStats['rows'] > 0 && $logStats['disk_bytes'] > 0) {
            $avgRow = max(256, (int) floor($logStats['disk_bytes'] / $logStats['rows']));
        }

        $excess = $current - $targetBytes;
        $need = (int) max(1, (int) ceil($excess / $avgRow));
        $batch = max(1000, (int) config('fortigate.prune_batch_size', 10000));
        $deleted = 0;

        while ($deleted < $need) {
            $take = min($batch, $need - $deleted);
            $ids = FortigateSecurityLog::query()
                ->orderBy('logged_at')
                ->orderBy('id')
                ->limit($take)
                ->pluck('id');

            if ($ids->isEmpty()) {
                break;
            }

            FortigateSecurityLog::query()->whereIn('id', $ids)->delete();
            $deleted += $ids->count();

            // Re-estimate from remaining known rows to avoid over-deleting.
            $remainingEstimate = max(0, $current - ($deleted * $avgRow));
            if ($remainingEstimate <= $targetBytes) {
                break;
            }
        }

        return $deleted;
    }

    private function optimizeFortigateTables(): bool
    {
        try {
            DB::statement('OPTIMIZE TABLE fortigate_security_logs');
            DB::statement('OPTIMIZE TABLE fortigate_resource_snapshots');
            DB::statement('OPTIMIZE TABLE fortigate_interface_snapshots');

            return true;
        } catch (Throwable $e) {
            Log::warning('FortiGate OPTIMIZE TABLE failed: '.$e->getMessage());

            return false;
        }
    }

    /** Keep the UDP listener text log from growing without bound. */
    private function rotateSyslogListenLogIfHuge(): void
    {
        $path = storage_path('logs/fortigate-syslog-listen.log');
        $max = 50 * 1024 * 1024; // 50 MB
        if (! is_file($path) || filesize($path) < $max) {
            return;
        }

        $rotated = $path.'.'.now()->format('Ymd_His').'.old';
        @rename($path, $rotated);
        // Keep only the newest rotated copy besides the active file.
        $olds = glob($path.'.*.old') ?: [];
        rsort($olds);
        foreach (array_slice($olds, 2) as $extra) {
            @unlink($extra);
        }
    }

    private function currentMetric(mixed $metric): ?int
    {
        if (is_array($metric)) {
            if (isset($metric['current'])) {
                return (int) $metric['current'];
            }
            if (isset($metric[0]) && is_array($metric[0]) && array_key_exists('current', $metric[0])) {
                return (int) $metric[0]['current'];
            }
        }

        return null;
    }

    /** @return list<string> */
    private function ignoredIps(): array
    {
        return array_values(array_filter(array_map(
            static fn ($ip) => trim((string) $ip),
            config('fortigate.ignore_ips', [])
        )));
    }

    private function isIgnoredIp(?string $ip): bool
    {
        if ($ip === null || $ip === '') {
            return false;
        }

        return in_array(trim($ip), $this->ignoredIps(), true);
    }

    /** @param  \Illuminate\Database\Eloquent\Builder<\App\Models\FortigateSecurityLog>|\Illuminate\Database\Eloquent\Builder  $query */
    private function excludeIgnoredIps($query): void
    {
        $ips = $this->ignoredIps();
        if ($ips === []) {
            return;
        }

        $query->where(function ($q) use ($ips) {
            $q->whereNull('srcip')->orWhereNotIn('srcip', $ips);
        });
    }

    private function resolveHealth(?int $cpu, ?int $mem, ?int $sessions): string
    {
        $cpuWarn = (int) config('fortigate.health.cpu_warn_percent', 80);
        $memWarn = (int) config('fortigate.health.mem_warn_percent', 85);
        $sessWarn = (int) config('fortigate.health.session_warn', 50000);

        if (($cpu !== null && $cpu >= $cpuWarn) || ($mem !== null && $mem >= $memWarn) || ($sessions !== null && $sessions >= $sessWarn)) {
            return 'degraded';
        }

        return 'healthy';
    }

    /** @param array<string, mixed> $row */
    private function resolveLoggedAt(array $row): Carbon
    {
        $date = (string) ($row['date'] ?? '');
        $time = (string) ($row['time'] ?? '');
        if ($date !== '' && $time !== '') {
            try {
                return Carbon::parse($date.' '.$time, 'Asia/Bangkok');
            } catch (Throwable) {
                // fall through
            }
        }

        return now();
    }

    /**
     * @param  array<string, mixed>  $row
     * @param  array<string, mixed>  $ti
     * @return array<string, mixed>
     */
    private function slimPayload(array $row, array $ti = []): array
    {
        $keep = [
            'logid', 'policyid', 'profile', 'srcintf', 'dstintf', 'srcport', 'dstport',
            'direction', 'filename', 'proto', 'vd', 'crscore', 'crlevel',
            'srcname', 'user', 'unauthuser', 'srcmac', 'mastersrcmac', 'osname', 'mac_firewall_address',
        ];
        $out = [];
        foreach ($keep as $key) {
            if (array_key_exists($key, $row)) {
                $out[$key] = $row[$key];
            }
        }
        if (! empty($ti['risky_port_name'])) {
            $out['risky_port_name'] = $ti['risky_port_name'];
        }

        return $out;
    }
}
