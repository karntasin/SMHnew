<?php

namespace App\Models\Pharmacy;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PharmacyDispenseSync extends Model
{
    protected $fillable = [
        'hosxp_key', 'hn', 'vn', 'an', 'patient_name', 'icode', 'vstdate', 'qty',
        'status', 'movement_id', 'message', 'cancel_reason', 'cancelled_at',
        'cancelled_by', 'fulfilled_at', 'fulfilled_by', 'reversed_at', 'reversed_by',
        'reverse_movement_id',
    ];

    protected function casts(): array
    {
        return [
            'qty' => 'decimal:2',
            'vstdate' => 'date',
            'cancelled_at' => 'datetime',
            'fulfilled_at' => 'datetime',
            'reversed_at' => 'datetime',
        ];
    }

    public function movement(): BelongsTo
    {
        return $this->belongsTo(PharmacyStockMovement::class, 'movement_id');
    }

    public function reverseMovement(): BelongsTo
    {
        return $this->belongsTo(PharmacyStockMovement::class, 'reverse_movement_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(PharmacyItem::class, 'icode', 'icode');
    }

    public function cancelledByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    public function fulfilledByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'fulfilled_by');
    }

    public function reversedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reversed_by');
    }
}
