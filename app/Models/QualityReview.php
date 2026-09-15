<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QualityReview extends Model
{
    protected $fillable = [
        'subject_type',
        'quality_indicator_id',
        'topic',
        'review_type',
        'schedule_date',
        'reviewer',
        'status',
        'findings',
        'recommendations',
    ];

    protected $casts = [
        'schedule_date' => 'date',
    ];

    public function indicator(): BelongsTo
    {
        return $this->belongsTo(QualityIndicator::class, 'quality_indicator_id');
    }

    public function isIndicatorReview(): bool
    {
        return $this->subject_type === 'indicator';
    }
}
