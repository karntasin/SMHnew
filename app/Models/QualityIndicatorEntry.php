<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QualityIndicatorEntry extends Model
{
    protected $fillable = [
        'quality_indicator_id',
        'period_date',
        'numerator',
        'denominator',
        'result_value',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'period_date' => 'date',
        'numerator' => 'decimal:2',
        'denominator' => 'decimal:2',
        'result_value' => 'decimal:2',
    ];

    public function indicator(): BelongsTo
    {
        return $this->belongsTo(QualityIndicator::class, 'quality_indicator_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
