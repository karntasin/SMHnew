<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FortigateInterfaceSnapshot extends Model
{
    protected $fillable = [
        'interface_name',
        'alias',
        'ip',
        'link',
        'speed_mbps',
        'rx_bytes',
        'tx_bytes',
        'rx_packets',
        'tx_packets',
        'rx_bps',
        'tx_bps',
        'checked_at',
    ];

    protected $casts = [
        'link' => 'boolean',
        'checked_at' => 'datetime',
    ];
}
