<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Servers to monitor
    |--------------------------------------------------------------------------
    | host: IP or hostname
    | name: display label
    | ports: TCP ports to check (e.g. MySQL 3306)
    | check_mysql: test HOSxP connection latency (only for HOSxP host)
    */
    'servers' => [
        [
            'key' => 'hosxp',
            'host' => env('SERVER_MONITOR_HOST', env('HOSXP_BACKUP_DB_HOST', '192.168.1.191')),
            'name' => env('SERVER_MONITOR_NAME', 'HOSxP Server'),
            'ports' => [
                ['port' => (int) env('HOSXP_BACKUP_DB_PORT', env('HOSXP_DB_PORT', 3306)), 'label' => 'MySQL'],
            ],
            'check_mysql' => true,
            'mysql_connection' => 'hosxp_backup',
            'snmp' => true,
        ],
    ],

    'retention_days' => (int) env('SERVER_MONITOR_RETENTION_DAYS', 7),

    'poll_interval_seconds' => 60,

    'dashboard_refresh_seconds' => 10,

    'snmp' => [
        'enabled' => env('SERVER_MONITOR_SNMP_ENABLED', true),
        'community' => env('SERVER_MONITOR_SNMP_COMMUNITY', 'smh_monitor_read'),
        'snmpget_path' => env('SERVER_MONITOR_SNMPGET', 'snmpget'),
        'timeout_seconds' => (int) env('SERVER_MONITOR_SNMP_TIMEOUT', 3),
        'retries' => (int) env('SERVER_MONITOR_SNMP_RETRIES', 1),
        'disk_mount' => env('SERVER_MONITOR_SNMP_DISK_MOUNT', '/'),
    ],
];
