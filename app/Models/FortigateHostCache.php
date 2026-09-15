<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FortigateHostCache extends Model
{
    protected $table = 'fortigate_host_cache';

    protected $fillable = [
        'ip',
        'hostname',
        'mac',
        'source',
        'seen_at',
    ];

    protected $casts = [
        'seen_at' => 'datetime',
    ];
}
