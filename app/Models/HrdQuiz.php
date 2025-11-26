<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdQuiz extends Model
{
    protected $fillable = [
        'course_id', 'lesson_id', 'title', 'description', 
        'passing_score', 'time_limit_minutes', 'randomize_questions'
    ];

    protected $casts = [
        'randomize_questions' => 'boolean',
    ];

    public function course()
    {
        return $this->belongsTo(HrdCourse::class, 'course_id');
    }

    public function lesson()
    {
        return $this->belongsTo(HrdLesson::class, 'lesson_id');
    }

    public function questions()
    {
        return $this->hasMany(HrdQuestion::class, 'quiz_id')->orderBy('order');
    }

    public function attempts()
    {
        return $this->hasMany(HrdQuizAttempt::class, 'quiz_id');
    }
}
