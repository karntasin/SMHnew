<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EnvSparePart extends Model
{
    protected $fillable = [
        'code',
        'name',
        'unit',
        'min_stock',
        'on_hand',
        'unit_cost',
        'location',
        'is_active',
    ];

    protected $casts = [
        'min_stock' => 'float',
        'on_hand' => 'float',
        'unit_cost' => 'float',
        'is_active' => 'boolean',
    ];

    public function movements(): HasMany
    {
        return $this->hasMany(EnvSparePartMovement::class, 'spare_part_id');
    }

    public function isBelowMinimum(): bool
    {
        return (float) $this->on_hand < (float) $this->min_stock;
    }
}
