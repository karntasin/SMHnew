<?php

namespace App\Models\Im;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetSpec extends Model
{
    protected $table = 'im_asset_specs';

    protected $fillable = [
        'asset_id',
        'machine_guid',
        'hostname',
        'brand',
        'model',
        'serial_number',
        'ip_address',
        'subnet_mask',
        'gateway',
        'mac_address',
        'remote_id',
        'os_name',
        'os_build',
        'ram_total_gb',
        'ram_slots_summary',
        'cpu_name',
        'cpu_details',
        'memory_details',
        'motherboard_details',
        'disk_details',
        'gpu_details',
        'network_details',
        'logged_user',
        'agent_version',
        'last_seen_at',
    ];

    protected $casts = [
        'ram_total_gb' => 'float',
        'cpu_details' => 'array',
        'memory_details' => 'array',
        'motherboard_details' => 'array',
        'disk_details' => 'array',
        'gpu_details' => 'array',
        'network_details' => 'array',
        'last_seen_at' => 'datetime',
    ];

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class, 'asset_id');
    }
}
