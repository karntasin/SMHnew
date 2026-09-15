<?php

namespace App\Models\Pharmacy;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PharmacyLocation extends Model
{
    protected $fillable = [
        'code', 'name', 'type', 'is_active', 'sort_order', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function balances(): HasMany
    {
        return $this->hasMany(PharmacyStockBalance::class, 'location_id');
    }

    public function lots(): HasMany
    {
        return $this->hasMany(PharmacyLot::class, 'location_id');
    }

    public function isWarehouse(): bool
    {
        return $this->type === 'warehouse';
    }

    public function isPharmacyRoom(): bool
    {
        return $this->type === 'pharmacy';
    }
}
