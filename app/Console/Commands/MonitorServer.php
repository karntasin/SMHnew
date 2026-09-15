<?php

namespace App\Console\Commands;

use App\Services\ServerMonitorService;
use Illuminate\Console\Command;

class MonitorServer extends Command
{
    protected $signature = 'server:monitor {--no-notify : Skip admin notifications}';

    protected $description = 'Check configured servers (ping, ports, MySQL) and store metrics';

    public function handle(ServerMonitorService $service): int
    {
        $results = $service->runAllChecks(! $this->option('no-notify'));

        foreach ($results as $r) {
            $this->line(sprintf(
                '[%s] %s — %s (%s)',
                strtoupper($r['status']),
                $r['name'] ?? $r['host'],
                $r['message'],
                $r['checked_at']->format('Y-m-d H:i:s')
            ));
        }

        if ($results === []) {
            $this->warn('No servers configured in config/server_monitor.php');

            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
