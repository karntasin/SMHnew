<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdEnrollment extends Model
{
    protected $fillable = [
        'user_id', 'course_id', 'status', 'pre_test_score', 'post_test_score',
        'satisfaction_score', 'certificate_path', 'notes'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function course()
    {
        return $this->belongsTo(HrdCourse::class, 'course_id');
    }
}
