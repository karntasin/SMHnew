<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdLesson extends Model
{
    protected $fillable = [
        'module_id', 'title', 'type', 'content', 'video_url', 
        'file_path', 'duration_minutes', 'order'
    ];

    public function module()
    {
        return $this->belongsTo(HrdModule::class, 'module_id');
    }

    public function quiz()
    {
        return $this->hasOne(HrdQuiz::class, 'lesson_id');
    }

    public function progress()
    {
        return $this->hasMany(HrdLearningProgress::class, 'lesson_id');
    }
}
