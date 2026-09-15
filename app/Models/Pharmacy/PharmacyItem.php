<?php

namespace App\Models\Pharmacy;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PharmacyItem extends Model
{
    protected $fillable = [
        'icode', 'name', 'strength', 'unit', 'drug_group', 'is_active', 'meta',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'meta' => 'array',
        ];
    }

    public function balances(): HasMany
    {
        return $this->hasMany(PharmacyStockBalance::class, 'item_id');
    }

    public function lots(): HasMany
    {
        return $this->hasMany(PharmacyLot::class, 'item_id');
    }
}
