<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdCourseAssignment extends Model
{
    protected $fillable = [
        'course_id', 'user_id', 'department_id', 'assigned_by', 'due_date', 'status'
    ];

    protected $casts = [
        'due_date' => 'date',
    ];

    public function course()
    {
        return $this->belongsTo(HrdCourse::class, 'course_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function assigner()
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}
