<?php

namespace App\Models\Pharmacy;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PharmacyStockMovement extends Model
{
    protected $fillable = [
        'type', 'item_id', 'lot_id', 'from_location_id', 'to_location_id',
        'qty', 'balance_after', 'reference_type', 'reference_id',
        'hn', 'vn', 'vstdate', 'user_id', 'note',
    ];

    protected function casts(): array
    {
        return [
            'qty' => 'decimal:2',
            'balance_after' => 'decimal:2',
            'vstdate' => 'date',
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(PharmacyItem::class, 'item_id');
    }

    public function lot(): BelongsTo
    {
        return $this->belongsTo(PharmacyLot::class, 'lot_id');
    }

    public function fromLocation(): BelongsTo
    {
        return $this->belongsTo(PharmacyLocation::class, 'from_location_id');
    }

    public function toLocation(): BelongsTo
    {
        return $this->belongsTo(PharmacyLocation::class, 'to_location_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
