<?php

namespace App\Models\Pharmacy;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PharmacyStockBalance extends Model
{
    protected $fillable = [
        'location_id', 'item_id', 'qty_on_hand', 'qty_reserved', 'reorder_level', 'min_level',
    ];

    protected function casts(): array
    {
        return [
            'qty_on_hand' => 'decimal:2',
            'qty_reserved' => 'decimal:2',
            'reorder_level' => 'decimal:2',
            'min_level' => 'decimal:2',
        ];
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(PharmacyLocation::class, 'location_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(PharmacyItem::class, 'item_id');
    }

    public function available(): float
    {
        return max(0, (float) $this->qty_on_hand - (float) $this->qty_reserved);
    }

    public function isLow(): bool
    {
        $threshold = max((float) $this->min_level, (float) $this->reorder_level);

        return $threshold > 0 && $this->available() <= $threshold;
    }

    public function isEmpty(): bool
    {
        return $this->available() <= 0;
    }
}
