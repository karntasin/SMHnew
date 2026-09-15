<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FortigateSecurityLog extends Model
{
    protected $fillable = [
        'log_type',
        'dedupe_key',
        'eventtime',
        'log_date',
        'log_time',
        'logged_at',
        'level',
        'action',
        'subtype',
        'eventtype',
        'srcip',
        'device_name',
        'src_user',
        'src_mac',
        'src_port',
        'dst_port',
        'dstip',
        'service',
        'hostname',
        'url',
        'app',
        'appcat',
        'virus',
        'attack',
        'catdesc',
        'msg',
        'is_denied_web',
        'is_watch_web',
        'is_threat',
        'is_ti_hit',
        'is_risky_port',
        'ti_feed',
        'ti_indicator',
        'ti_threat_type',
        'alerted',
        'payload',
    ];

    protected $casts = [
        'log_date' => 'date',
        'logged_at' => 'datetime',
        'is_denied_web' => 'boolean',
        'is_watch_web' => 'boolean',
        'is_threat' => 'boolean',
        'is_ti_hit' => 'boolean',
        'is_risky_port' => 'boolean',
        'alerted' => 'boolean',
        'payload' => 'array',
    ];
}
