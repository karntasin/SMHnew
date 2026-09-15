<?php

namespace App\Console\Commands;

use App\Services\FortiGate\FortiGateMonitorService;
use Illuminate\Console\Command;

class PollFortiGate extends Command
{
    protected $signature = 'fortigate:poll {--no-notify : Skip FSHH Chat alerts}';

    protected $description = 'Poll FortiGate F100 resources, interfaces, and security logs';

    public function handle(FortiGateMonitorService $service): int
    {
        $result = $service->poll(! $this->option('no-notify'));

        if (! ($result['ok'] ?? false)) {
            $this->error($result['message'] ?? 'FortiGate poll failed');

            return self::FAILURE;
        }

        $resource = $result['resource'] ?? [];
        $this->info(sprintf(
            'Resource: CPU %s%% | MEM %s%% | Sessions %s | health=%s',
            $resource['cpu_percent'] ?? '-',
            $resource['memory_percent'] ?? '-',
            $resource['session_count'] ?? '-',
            $resource['health'] ?? '-'
        ));
        $this->line('Interfaces stored: '.($result['interfaces'] ?? 0));

        foreach (($result['logs'] ?? []) as $type => $count) {
            $this->line("Logs [{$type}] new={$count}");
        }

        $traffic = $result['traffic_log'] ?? [];
        $this->line(sprintf(
            'Traffic log endpoint: available=%s status=%s — %s',
            ! empty($traffic['available']) ? 'yes' : 'no',
            $traffic['status'] ?? '-',
            $traffic['message'] ?? ''
        ));

        return self::SUCCESS;
    }
}
