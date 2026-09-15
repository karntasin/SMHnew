<?php

namespace App\Services\FortiGate;

class FortiGateSyslogIngestService
{
    public function __construct(
        protected readonly FortiGateSyslogParser $parser,
        protected readonly FortiGateMonitorService $monitor,
    ) {}

    /**
     * @return array{accepted:bool,stored:bool,type:?string,reason:?string}
     */
    public function ingestRaw(string $raw, bool $notify = true): array
    {
        $parsed = $this->parser->parse($raw);
        if ($parsed === null) {
            return ['accepted' => false, 'stored' => false, 'type' => null, 'reason' => 'parse_failed'];
        }

        $type = $parsed['type'];
        $row = $parsed['row'];

        if (! $this->isAcceptedType($type)) {
            return ['accepted' => false, 'stored' => false, 'type' => $type, 'reason' => 'type_filtered'];
        }

        if ($type === 'traffic' && ! $this->shouldStoreTraffic($row)) {
            return ['accepted' => false, 'stored' => false, 'type' => $type, 'reason' => 'traffic_filtered'];
        }

        $stored = $this->monitor->ingestLogRow($type, $row, $notify);

        return [
            'accepted' => true,
            'stored' => $stored,
            'type' => $type,
            'reason' => $stored ? null : 'duplicate',
        ];
    }

    private function isAcceptedType(string $type): bool
    {
        $allowed = config('fortigate.syslog.accept_types', []);
        if (! is_array($allowed) || $allowed === []) {
            return true;
        }

        return in_array($type, $allowed, true) || in_array('*', $allowed, true);
    }

    /** @param array<string, mixed> $row */
    private function shouldStoreTraffic(array $row): bool
    {
        $mode = strtolower((string) config('fortigate.syslog.traffic_mode', 'interesting'));

        if ($mode === 'all') {
            return true;
        }

        if ($mode === 'denied') {
            return $this->isDeniedAction($row);
        }

        // interesting (default): denied, has app/url/hostname, or risky dst port
        if ($this->isDeniedAction($row)) {
            return true;
        }
        if (! empty($row['app']) || ! empty($row['hostname']) || ! empty($row['url'])) {
            return true;
        }

        $dstPort = isset($row['dstport']) && is_numeric($row['dstport']) ? (int) $row['dstport'] : null;
        if ($dstPort !== null && array_key_exists($dstPort, config('threat_intel.risky_ports', []))) {
            return true;
        }

        return false;
    }

    /** @param array<string, mixed> $row */
    private function isDeniedAction(array $row): bool
    {
        $action = mb_strtolower((string) ($row['action'] ?? ''));

        return in_array($action, [
            'deny', 'blocked', 'blocked-url', 'timeout', 'close', 'reject', 'drop', 'client-rst', 'server-rst',
        ], true)
            || str_contains($action, 'deny')
            || str_contains($action, 'block');
    }
}
