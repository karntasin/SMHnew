<?php

namespace App\Models\Im;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Asset extends Model
{
    protected $table = 'im_assets';

    public const DEVICE_TYPES = [
        'computer' => 'คอมพิวเตอร์',
        'notebook' => 'Notebook',
        'printer' => 'เครื่องพิมพ์',
        'scanner' => 'สแกนเนอร์',
        'network_device' => 'อุปกรณ์เครือข่าย',
        'server' => 'เซิร์ฟเวอร์',
        'monitor' => 'จอภาพ',
        'ups' => 'UPS',
        'other' => 'อื่นๆ',
    ];

    protected $fillable = [
        'asset_code',
        'name',
        'brand',
        'type',
        'device_type',
        'spec',
        'cpu',
        'os',
        'mac_address',
        'license_status',
        'quantity',
        'capacity',
        'utilization',
        'location',
        'assigned_user',
        'department',
        'status',
        'note',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'utilization' => 'float',
    ];

    public function repairs(): HasMany
    {
        return $this->hasMany(AssetRepair::class, 'asset_id')->latest('reported_at')->latest('id');
    }

    public function openRepair(): HasOne
    {
        return $this->hasOne(AssetRepair::class, 'asset_id')
            ->ofMany(['id' => 'max'], fn ($q) => $q->where('status', 'open'));
    }

    public function disposals(): HasMany
    {
        return $this->hasMany(AssetDisposal::class, 'asset_id')->latest('disposed_at')->latest('id');
    }

    public function latestDisposal(): HasOne
    {
        return $this->hasOne(AssetDisposal::class, 'asset_id')->latestOfMany('id');
    }
}
