<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class HrdCourse extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'code', 'title', 'description', 'type', 'start_date', 'end_date',
        'location', 'hours', 'capacity', 'instructor', 'cost', 'created_by', 'is_active',
        'cover_image', 'is_mandatory', 'expiration_days', 'status', 'allow_guest', 'category_id'
    ];

    protected $casts = [
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'is_active' => 'boolean',
        'is_mandatory' => 'boolean',
        'allow_guest' => 'boolean',
    ];

    public function category()
    {
        return $this->belongsTo(HrdCourseCategory::class, 'category_id');
    }

    public function modules()
    {
        return $this->hasMany(HrdModule::class, 'course_id')->orderBy('order');
    }

    public function assignments()
    {
        return $this->hasMany(HrdCourseAssignment::class, 'course_id');
    }

    public function quizzes()
    {
        return $this->hasMany(HrdQuiz::class, 'course_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function enrollments()
    {
        return $this->hasMany(HrdEnrollment::class, 'course_id');
    }

    public function competencies()
    {
        return $this->belongsToMany(HrdCompetency::class, 'hrd_course_competencies', 'course_id', 'competency_id')
                    ->withPivot('score_weight');
    }
}
