<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdQuizAttempt extends Model
{
    protected $fillable = [
        'user_id', 'quiz_id', 'score', 'total_questions', 'passed', 'started_at', 'completed_at'
    ];

    protected $casts = [
        'passed' => 'boolean',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function quiz()
    {
        return $this->belongsTo(HrdQuiz::class, 'quiz_id');
    }
}
