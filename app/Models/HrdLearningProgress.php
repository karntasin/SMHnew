<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdLearningProgress extends Model
{
    protected $table = 'hrd_learning_progress';

    protected $fillable = [
        'user_id', 'course_id', 'lesson_id', 'status', 'completed_at'
    ];

    protected $casts = [
        'completed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function lesson()
    {
        return $this->belongsTo(HrdLesson::class, 'lesson_id');
    }
}
