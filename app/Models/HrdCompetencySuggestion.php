<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdCompetencySuggestion extends Model
{
    protected $fillable = [
        'user_id', 'competency_id', 'course_id', 'proposed_level', 'status', 'reviewed_by',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function competency()
    {
        return $this->belongsTo(HrdCompetency::class, 'competency_id');
    }

    public function course()
    {
        return $this->belongsTo(HrdCourse::class, 'course_id');
    }
}
