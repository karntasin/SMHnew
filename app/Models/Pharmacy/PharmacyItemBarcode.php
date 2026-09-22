<?php

namespace App\Models\Pharmacy;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PharmacyItemBarcode extends Model
{
    protected $fillable = [
        'item_id', 'unit_id', 'barcode', 'symbology', 'label', 'is_primary', 'is_active',
    ];

    protected function casts(): array
    {
        return ['is_primary' => 'boolean', 'is_active' => 'boolean'];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(PharmacyItem::class, 'item_id');
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(PharmacyItemUnit::class, 'unit_id');
    }
}
