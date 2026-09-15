<?php

namespace App\Console\Commands;

use App\Services\FortiGate\FortiGateSyslogIngestService;
use Illuminate\Console\Command;
use Throwable;

class ListenFortiGateSyslog extends Command
{
    protected $signature = 'fortigate:syslog-listen
                            {--host= : Bind address (default from config)}
                            {--port= : UDP port (default from config)}
                            {--no-notify : Do not send FSHH Chat alerts}';

    protected $description = 'Receive FortiGate syslog (UDP) and store usage/security logs into the web app database';

    public function handle(FortiGateSyslogIngestService $ingest): int
    {
        if (! config('fortigate.syslog.enabled', true)) {
            $this->error('FortiGate syslog receiver disabled (FORTIGATE_SYSLOG_ENABLED=false)');

            return self::FAILURE;
        }

        $host = (string) ($this->option('host') ?: config('fortigate.syslog.listen_host', '0.0.0.0'));
        $port = (int) ($this->option('port') ?: config('fortigate.syslog.listen_port', 5514));
        $notify = ! $this->option('no-notify') && (bool) config('fortigate.syslog.notify', true);

        if (! function_exists('socket_create')) {
            $this->error('PHP sockets extension is required (enable extension=sockets in php.ini)');

            return self::FAILURE;
        }

        $socket = @socket_create(AF_INET, SOCK_DGRAM, SOL_UDP);
        if ($socket === false) {
            $this->error('socket_create failed: '.socket_strerror(socket_last_error()));

            return self::FAILURE;
        }

        socket_set_option($socket, SOL_SOCKET, SO_REUSEADDR, 1);
        socket_set_nonblock($socket);

        if (! @socket_bind($socket, $host, $port)) {
            $this->error("Cannot bind UDP {$host}:{$port} — ".socket_strerror(socket_last_error($socket)));
            $this->line('Tip: on Windows, port 514 needs Administrator. Use 5514 (default) instead.');
            socket_close($socket);

            return self::FAILURE;
        }

        $this->info("Listening FortiGate syslog on udp://{$host}:{$port}");
        $this->line('Point FortiGate syslogd2 server to this machine IP + port, then watch counts below.');
        $this->line('Press Ctrl+C to stop.');

        $stats = [
            'recv' => 0,
            'stored' => 0,
            'dup' => 0,
            'skip' => 0,
            'err' => 0,
        ];
        $lastReport = time();
        $lastFrom = '';
        $manager = app(\App\Services\FortiGate\FortiGateSyslogProcessManager::class);
        $manager->writeHeartbeat([
            'recv' => 0,
            'stored' => 0,
            'dup' => 0,
            'skip' => 0,
            'err' => 0,
            'last_from' => null,
            'started_at' => now()->toDateTimeString(),
        ]);

        while (true) {
            $buf = '';
            $from = '';
            $fromPort = 0;
            $bytes = @socket_recvfrom($socket, $buf, 65535, 0, $from, $fromPort);
            if ($bytes === false || $buf === '') {
                if (time() - $lastReport >= 10) {
                    $manager->writeHeartbeat([
                        'recv' => $stats['recv'],
                        'stored' => $stats['stored'],
                        'dup' => $stats['dup'],
                        'skip' => $stats['skip'],
                        'err' => $stats['err'],
                        'last_from' => $lastFrom !== '' ? $lastFrom : null,
                    ]);
                    $this->line(sprintf(
                        '[%s] recv=%d stored=%d dup=%d skip=%d err=%d last_from=%s',
                        now()->format('H:i:s'),
                        $stats['recv'],
                        $stats['stored'],
                        $stats['dup'],
                        $stats['skip'],
                        $stats['err'],
                        $lastFrom !== '' ? $lastFrom : '-'
                    ));
                    $lastReport = time();
                }
                usleep(20000);
                continue;
            }

            $stats['recv']++;
            $lastFrom = $from !== '' ? $from.':'.$fromPort : '';
            try {
                $result = $ingest->ingestRaw($buf, $notify);
                if ($result['stored']) {
                    $stats['stored']++;
                } elseif (($result['reason'] ?? '') === 'duplicate') {
                    $stats['dup']++;
                } else {
                    $stats['skip']++;
                }
            } catch (Throwable $e) {
                $stats['err']++;
                if ($stats['err'] <= 5 || $stats['err'] % 50 === 0) {
                    $this->warn('ingest error: '.$e->getMessage());
                }
            }

            if (time() - $lastReport >= 10) {
                $manager->writeHeartbeat([
                    'recv' => $stats['recv'],
                    'stored' => $stats['stored'],
                    'dup' => $stats['dup'],
                    'skip' => $stats['skip'],
                    'err' => $stats['err'],
                    'last_from' => $lastFrom !== '' ? $lastFrom : null,
                ]);
                $this->line(sprintf(
                    '[%s] recv=%d stored=%d dup=%d skip=%d err=%d last_from=%s',
                    now()->format('H:i:s'),
                    $stats['recv'],
                    $stats['stored'],
                    $stats['dup'],
                    $stats['skip'],
                    $stats['err'],
                    $lastFrom !== '' ? $lastFrom : '-'
                ));
                $lastReport = time();
            }
        }
    }
}
