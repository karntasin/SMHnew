<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdSatisfactionResponse extends Model
{
    protected $fillable = ['enrollment_id', 'user_id', 'course_id', 'answers', 'score'];

    protected $casts = [
        'answers' => 'array',
        'score' => 'float',
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
