<?php

namespace App\Models\Pharmacy;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PharmacyStockCount extends Model
{
    protected $fillable = ['count_no', 'location_id', 'count_date', 'status', 'notes', 'created_by', 'completed_by', 'completed_at'];

    protected function casts(): array
    {
        return ['count_date' => 'date', 'completed_at' => 'datetime'];
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(PharmacyLocation::class, 'location_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function completer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by');
    }

    public function members(): HasMany
    {
        return $this->hasMany(PharmacyStockCountMember::class, 'stock_count_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PharmacyStockCountItem::class, 'stock_count_id');
    }

    public function photos(): HasMany
    {
        return $this->hasMany(PharmacyStockCountPhoto::class, 'stock_count_id');
    }
}
