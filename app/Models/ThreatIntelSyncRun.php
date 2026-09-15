<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ThreatIntelSyncRun extends Model
{
    protected $fillable = [
        'feed',
        'status',
        'fetched',
        'upserted',
        'message',
        'started_at',
        'finished_at',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];
}
