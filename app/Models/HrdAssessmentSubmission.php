<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdAssessmentSubmission extends Model
{
    protected $fillable = [
        'form_id', 'user_id', 'fiscal_year', 'department_id', 'submitted_at',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
    ];

    public function form()
    {
        return $this->belongsTo(HrdAssessmentForm::class, 'form_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
