<?php

namespace App\Console\Commands;

use App\Services\ThreatIntel\ThreatIntelSyncService;
use Illuminate\Console\Command;

class SyncThreatIntelFeeds extends Command
{
    protected $signature = 'threat-intel:sync
                            {--feed=* : Sync only these feed keys}
                            {--prune : Also prune stale remote indicators}';

    protected $description = 'Fetch open-source threat intelligence feeds into the local database';

    public function handle(ThreatIntelSyncService $service): int
    {
        if (! config('threat_intel.enabled', true)) {
            $this->warn('Threat intel disabled (THREAT_INTEL_ENABLED=false)');

            return self::SUCCESS;
        }

        $only = $this->option('feed');
        $only = is_array($only) && count($only) > 0 ? $only : null;

        $this->info('Syncing threat intelligence feeds...');
        $results = $service->syncAll($only);

        foreach ($results as $feed => $result) {
            $this->line(sprintf(
                '  [%s] %s — fetched=%d upserted=%d%s',
                $feed,
                $result['status'],
                $result['fetched'],
                $result['upserted'],
                $result['message'] ? ' ('.$result['message'].')' : ''
            ));
        }

        if ($this->option('prune')) {
            $deleted = $service->pruneExpired();
            $this->info("Pruned {$deleted} stale indicators");
        }

        return self::SUCCESS;
    }
}
