<?php

namespace App\Models\Pharmacy;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PharmacyStockCountItem extends Model
{
    protected $fillable = ['stock_count_id', 'item_id', 'lot_id', 'system_qty', 'counted_qty', 'variance_qty', 'note'];

    protected function casts(): array
    {
        return ['system_qty' => 'decimal:2', 'counted_qty' => 'decimal:2', 'variance_qty' => 'decimal:2'];
    }

    public function stockCount(): BelongsTo
    {
        return $this->belongsTo(PharmacyStockCount::class, 'stock_count_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(PharmacyItem::class, 'item_id');
    }

    public function lot(): BelongsTo
    {
        return $this->belongsTo(PharmacyLot::class, 'lot_id');
    }
}
