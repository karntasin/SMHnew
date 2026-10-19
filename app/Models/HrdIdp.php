<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdIdp extends Model
{
    protected $fillable = [
        'user_id', 'competency_id', 'fiscal_year', 'method', 'course_id',
        'title', 'status', 'due_date', 'completed_at',
    ];

    protected $casts = [
        'due_date' => 'date',
        'completed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function competency()
    {
        return $this->belongsTo(HrdCompetency::class, 'competency_id');
    }

    public function course()
    {
        return $this->belongsTo(HrdCourse::class, 'course_id');
    }
}
