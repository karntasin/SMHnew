<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QualityIndicator extends Model
{
    protected $fillable = [
        'code',
        'name',
        'description',
        'category',
        'unit',
        'target_value',
        'target_operator',
        'frequency',
        'formula_description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'target_value' => 'decimal:2',
    ];

    public function entries(): HasMany
    {
        return $this->hasMany(QualityIndicatorEntry::class);
    }
}
