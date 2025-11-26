<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdModule extends Model
{
    protected $fillable = ['course_id', 'title', 'description', 'order'];

    public function course()
    {
        return $this->belongsTo(HrdCourse::class, 'course_id');
    }

    public function lessons()
    {
        return $this->hasMany(HrdLesson::class, 'module_id')->orderBy('order');
    }
}
