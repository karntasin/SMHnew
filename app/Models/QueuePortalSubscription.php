<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QueuePortalSubscription extends Model
{
    protected $connection = 'mysql';

    protected $fillable = [
        'endpoint',
        'p256dh',
        'auth_token',
        'oqueue',
        'visit_date',
        'notified_soon_at',
        'notified_called_at',
    ];

    protected $casts = [
        'visit_date' => 'date',
        'notified_soon_at' => 'datetime',
        'notified_called_at' => 'datetime',
    ];
}
