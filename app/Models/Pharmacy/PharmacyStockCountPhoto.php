<?php

namespace App\Models\Pharmacy;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PharmacyStockCountPhoto extends Model
{
    protected $fillable = ['stock_count_id', 'path', 'original_name', 'mime_type', 'size', 'uploaded_by'];

    public function stockCount(): BelongsTo
    {
        return $this->belongsTo(PharmacyStockCount::class, 'stock_count_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function getUrlAttribute(): string
    {
        return asset('storage/'.$this->path);
    }
}
