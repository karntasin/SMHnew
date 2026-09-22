<?php

namespace App\Models\Pharmacy;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PharmacyStockCountMember extends Model
{
    protected $fillable = ['stock_count_id', 'user_id', 'name', 'role'];

    public function stockCount(): BelongsTo
    {
        return $this->belongsTo(PharmacyStockCount::class, 'stock_count_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
