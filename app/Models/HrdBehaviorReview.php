<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdBehaviorReview extends Model
{
    protected $fillable = [
        'enrollment_id', 'reviewer_id', 'due_on', 'rating', 'comment', 'status', 'reviewed_at',
    ];

    protected $casts = [
        'due_on' => 'date',
        'reviewed_at' => 'datetime',
    ];

    public function enrollment()
    {
        return $this->belongsTo(HrdEnrollment::class, 'enrollment_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }
}
