<?php

namespace App\Console\Commands;

use App\Services\FortiGate\FortiGateMonitorService;
use Illuminate\Console\Command;

class PruneFortiGateLogs extends Command
{
    protected $signature = 'fortigate:prune
                            {--optimize : Run OPTIMIZE TABLE after prune to reclaim disk (can be slow)}';

    protected $description = 'Prune FortiGate logs older than retention days, or when storage exceeds max GB';

    public function handle(FortiGateMonitorService $service): int
    {
        $result = $service->prune((bool) $this->option('optimize'));

        $before = $this->formatBytes((int) ($result['storage_before']['disk_bytes'] ?? 0));
        $after = $this->formatBytes((int) ($result['storage_after']['disk_bytes'] ?? 0));
        $max = $this->formatBytes((int) ($result['max_bytes'] ?? 0));
        $days = (int) ($result['retention_days'] ?? 90);

        $this->info(sprintf(
            'Pruned %d row(s): age=%d (>%d days), size=%d (budget %s). Disk %s → %s%s',
            (int) $result['deleted'],
            (int) $result['deleted_by_age'],
            $days,
            (int) $result['deleted_by_size'],
            $max,
            $before,
            $after,
            ! empty($result['optimized']) ? ' · OPTIMIZE done' : ''
        ));

        $live = $this->formatBytes((int) ($result['storage_after']['live_bytes'] ?? 0));
        $this->line("Estimated live data after prune: {$live}");

        return self::SUCCESS;
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes < 1024) {
            return $bytes.' B';
        }
        $units = ['KB', 'MB', 'GB', 'TB'];
        $value = (float) $bytes;
        foreach ($units as $unit) {
            $value /= 1024;
            if ($value < 1024) {
                return round($value, 2).' '.$unit;
            }
        }

        return round($value, 2).' PB';
    }
}
