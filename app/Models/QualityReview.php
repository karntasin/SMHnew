<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QualityReview extends Model
{
    protected $fillable = [
        'topic',
        'review_type',
        'schedule_date',
        'reviewer',
        'status',
        'findings',
    ];

    protected $casts = [
        'schedule_date' => 'date',
    ];
}
