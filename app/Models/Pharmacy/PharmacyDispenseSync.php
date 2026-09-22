<?php

namespace App\Models\Pharmacy;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PharmacyDispenseSync extends Model
{
    protected $fillable = [
        'hosxp_key', 'hn', 'vn', 'icode', 'vstdate', 'qty', 'status', 'movement_id', 'message',
    ];

    protected function casts(): array
    {
        return [
            'qty' => 'decimal:2',
            'vstdate' => 'date',
        ];
    }

    public function movement(): BelongsTo
    {
        return $this->belongsTo(PharmacyStockMovement::class, 'movement_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(PharmacyItem::class, 'icode', 'icode');
    }
}
