<?php

return [
    /*
    |--------------------------------------------------------------------------
    | FortiGate REST API
    |--------------------------------------------------------------------------
    | Token เก็บเฉพาะใน .env (FORTIGATE_API_TOKEN) — ห้าม hardcode ในโค้ด
    */
    'enabled' => filter_var(env('FORTIGATE_ENABLED', true), FILTER_VALIDATE_BOOLEAN),

    'host' => rtrim((string) env('FORTIGATE_HOST', 'https://192.168.100.99'), '/'),

    'api_token' => (string) env('FORTIGATE_API_TOKEN', ''),

    'verify_ssl' => filter_var(env('FORTIGATE_VERIFY_SSL', false), FILTER_VALIDATE_BOOLEAN),

    'timeout_seconds' => (int) env('FORTIGATE_TIMEOUT', 20),

    'retention_days' => (int) env('FORTIGATE_LOG_RETENTION_DAYS', 90),

    /*
    | Max on-disk budget for fortigate_* tables (GB). When exceeded, oldest
    | security log rows are deleted until estimated usage is under ~90% of this.
    */
    'max_storage_gb' => (float) env('FORTIGATE_LOG_MAX_GB', 35),

    'prune_batch_size' => (int) env('FORTIGATE_PRUNE_BATCH', 10000),

    'dashboard_refresh_seconds' => (int) env('FORTIGATE_DASHBOARD_REFRESH', 30),

    'notify_chat' => filter_var(env('FORTIGATE_NOTIFY_CHAT', true), FILTER_VALIDATE_BOOLEAN),

    'alert_cooldown_minutes' => (int) env('FORTIGATE_ALERT_COOLDOWN', 30),

    /*
    |--------------------------------------------------------------------------
    | Ignored source IPs (no chat alerts / no noisy dashboard scopes)
    |--------------------------------------------------------------------------
    | Comma-separated. Example: CSOC log collectors that generate high volume.
    | Logs are still stored under "all", but alert flags are not set and the IP
    | is excluded from top_devices / web-watch / threats / ti-hits / risky-ports.
    */
    'ignore_ips' => array_values(array_filter(array_map('trim', explode(',', (string) env(
        'FORTIGATE_IGNORE_IPS',
        '192.168.77.100'
    ))))),

    /*
    |--------------------------------------------------------------------------
    | API paths (FortiOS 7.4 / FG100F probed 2026-09-08)
    |--------------------------------------------------------------------------
    | traffic memory/disk: 404 on this device (log disk not available).
    | Use webfilter + app-ctrl + virus/ips for activity & threats instead.
    */
    'endpoints' => [
        'resource_usage' => '/api/v2/monitor/system/resource/usage',
        'interfaces' => '/api/v2/monitor/system/interface',
        'system_status' => '/api/v2/monitor/system/status',
        'firewall_session' => '/api/v2/monitor/firewall/session',
        'log_device_state' => '/api/v2/monitor/log/device/state',
        'dhcp' => '/api/v2/monitor/system/dhcp',
        // FortiOS 7.x device inventory (MAC + IP). /user/device alone often 404.
        'user_device' => '/api/v2/monitor/user/device/query',
        'user_device_fallback' => '/api/v2/monitor/user/device',
        // Traffic log — expected 404 when no local log disk / memory traffic store
        'traffic_memory' => '/api/v2/log/memory/traffic',
        'logs' => [
            'webfilter' => '/api/v2/log/memory/webfilter',
            'virus' => '/api/v2/log/memory/virus',
            'ips' => '/api/v2/log/memory/ips',
            'anomaly' => '/api/v2/log/memory/anomaly',
            'app-ctrl' => '/api/v2/log/memory/app-ctrl',
            'dns' => '/api/v2/log/memory/dns',
            'ssl' => '/api/v2/log/memory/ssl',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Undesirable web usage — deny / watch lists
    |--------------------------------------------------------------------------
    | matched against webfilter hostname, url, msg, and category text (case-insensitive)
    */
    'web_deny_patterns' => array_values(array_filter(array_map('trim', explode(',', (string) env(
        'FORTIGATE_WEB_DENY_PATTERNS',
        'porn,gambling,malware,phishing,proxy avoidance,anonymizer,adult,torrent,cryptocurrency mining'
    ))))),

    'web_watch_patterns' => array_values(array_filter(array_map('trim', explode(',', (string) env(
        'FORTIGATE_WEB_WATCH_PATTERNS',
        'social media,streaming media,games,file sharing'
    ))))),

    'web_deny_actions' => ['blocked', 'blocked-url', 'deny', 'banned'],

    /*
    |--------------------------------------------------------------------------
    | Threat log types that trigger chat alerts
    |--------------------------------------------------------------------------
    */
    'threat_log_types' => ['virus', 'ips', 'anomaly'],

    'health' => [
        'cpu_warn_percent' => (int) env('FORTIGATE_CPU_WARN', 80),
        'mem_warn_percent' => (int) env('FORTIGATE_MEM_WARN', 85),
        'session_warn' => (int) env('FORTIGATE_SESSION_WARN', 50000),
    ],

    /*
    |--------------------------------------------------------------------------
    | Syslog receiver (FortiGate → this web app)
    |--------------------------------------------------------------------------
    | Run on the machine that should receive logs (e.g. 192.168.1.214):
    |   php artisan fortigate:syslog-listen
    | Point FortiGate syslogd2 to that IP + listen_port (default 5514).
    | traffic_mode: interesting | denied | all
    */
    'syslog' => [
        'enabled' => filter_var(env('FORTIGATE_SYSLOG_ENABLED', true), FILTER_VALIDATE_BOOLEAN),
        'listen_host' => (string) env('FORTIGATE_SYSLOG_LISTEN_HOST', '0.0.0.0'),
        'listen_port' => (int) env('FORTIGATE_SYSLOG_LISTEN_PORT', 5514),
        'notify' => filter_var(env('FORTIGATE_SYSLOG_NOTIFY', true), FILTER_VALIDATE_BOOLEAN),
        'traffic_mode' => (string) env('FORTIGATE_SYSLOG_TRAFFIC_MODE', 'all'),
        'accept_types' => array_values(array_filter(array_map('trim', explode(',', (string) env(
            'FORTIGATE_SYSLOG_ACCEPT_TYPES',
            'traffic,webfilter,app-ctrl,virus,ips,anomaly,dns,ssl,event,utm'
        ))))),
    ],

    /*
    |--------------------------------------------------------------------------
    | Static IP → hostname map (fallback when DHCP/log has no name)
    |--------------------------------------------------------------------------
    | Format in .env: FORTIGATE_HOST_MAP=192.168.1.10:PC-OPD,192.168.1.11:Nurse-Station
    */
    'host_static_map' => (static function (): array {
        $raw = (string) env('FORTIGATE_HOST_MAP', '');
        $map = [];
        foreach (array_filter(array_map('trim', explode(',', $raw))) as $pair) {
            if (! str_contains($pair, ':')) {
                continue;
            }
            [$ip, $name] = explode(':', $pair, 2);
            $ip = trim($ip);
            $name = trim($name);
            if ($ip !== '' && $name !== '') {
                $map[$ip] = $name;
            }
        }

        return $map;
    })(),
];
