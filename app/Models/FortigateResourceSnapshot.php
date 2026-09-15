<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FortigateResourceSnapshot extends Model
{
    protected $fillable = [
        'cpu_percent',
        'memory_percent',
        'disk_percent',
        'session_count',
        'session6_count',
        'setup_rate',
        'hostname',
        'model',
        'version',
        'serial',
        'health',
        'raw_meta',
        'checked_at',
    ];

    protected $casts = [
        'raw_meta' => 'array',
        'checked_at' => 'datetime',
    ];
}
