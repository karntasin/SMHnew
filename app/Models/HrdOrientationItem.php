<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdOrientationItem extends Model
{
    protected $fillable = ['scope', 'department_id', 'title', 'course_id', 'is_required', 'sort'];

    protected $casts = [
        'is_required' => 'boolean',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function course()
    {
        return $this->belongsTo(HrdCourse::class, 'course_id');
    }
}
