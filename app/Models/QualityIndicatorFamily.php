<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QualityIndicatorFamily extends Model
{
    protected $fillable = [
        'key',
        'master_indicator_id',
    ];

    public function master(): BelongsTo
    {
        return $this->belongsTo(QualityIndicator::class, 'master_indicator_id');
    }

    public function indicators(): HasMany
    {
        return $this->hasMany(QualityIndicator::class, 'family_id');
    }
}
