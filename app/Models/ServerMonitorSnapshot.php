<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServerMonitorSnapshot extends Model
{
    protected $fillable = [
        'server_key',
        'host',
        'status',
        'ping_ok',
        'ping_ms',
        'mysql_ok',
        'mysql_ms',
        'snmp_ok',
        'cpu_percent',
        'memory_percent',
        'disk_percent',
        'snmp_uptime_seconds',
        'snmp_sys_name',
        'ports',
        'message',
        'checked_at',
    ];

    protected $casts = [
        'ping_ok' => 'boolean',
        'mysql_ok' => 'boolean',
        'snmp_ok' => 'boolean',
        'ports' => 'array',
        'checked_at' => 'datetime',
    ];
}
