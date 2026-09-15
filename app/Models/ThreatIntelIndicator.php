<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ThreatIntelIndicator extends Model
{
    protected $fillable = [
        'feed',
        'indicator_type',
        'value',
        'threat_type',
        'confidence',
        'country',
        'meta',
        'is_active',
        'first_seen_at',
        'last_seen_at',
        'expires_at',
    ];

    protected $casts = [
        'meta' => 'array',
        'is_active' => 'boolean',
        'first_seen_at' => 'datetime',
        'last_seen_at' => 'datetime',
        'expires_at' => 'datetime',
    ];
}
