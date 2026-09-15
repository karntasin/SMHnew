<?php

namespace App\Models\Pharmacy;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PharmacyLot extends Model
{
    protected $fillable = [
        'item_id', 'location_id', 'lot_no', 'received_at', 'expires_at',
        'qty_received', 'qty_remaining', 'supplier', 'invoice_no', 'qr_token',
        'status', 'received_by', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'received_at' => 'date',
            'expires_at' => 'date',
            'qty_received' => 'decimal:2',
            'qty_remaining' => 'decimal:2',
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(PharmacyItem::class, 'item_id');
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(PharmacyLocation::class, 'location_id');
    }

    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(PharmacyStockMovement::class, 'lot_id');
    }

    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    public function qrPayload(): string
    {
        return 'PHARMLOT:'.$this->qr_token;
    }
}
