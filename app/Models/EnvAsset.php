<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EnvAsset extends Model
{
    protected $fillable = [
        'name',
        'model',
        'serial_number',
        'price',
        'location',
        'owner',
        'risk_level',
        'status',
        'purchase_date',
        'warranty_expiry',
    ];

    protected $casts = [
        'purchase_date' => 'date',
        'warranty_expiry' => 'date',
    ];

    public function schedule(): HasOne
    {
        return $this->hasOne(EnvPmSchedule::class, 'asset_id');
    }

    public function records(): HasMany
    {
        return $this->hasMany(EnvPmRecord::class, 'asset_id');
    }
}
