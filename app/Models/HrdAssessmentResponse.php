<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdAssessmentResponse extends Model
{
    protected $fillable = [
        'form_id', 'fiscal_year', 'department_id', 'user_id',
        'total_score', 'band', 'band_label', 'interpretation', 'section_scores',
    ];

    protected $casts = [
        'total_score' => 'float',
        'section_scores' => 'array',
    ];

    public function form()
    {
        return $this->belongsTo(HrdAssessmentForm::class, 'form_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function answers()
    {
        return $this->hasMany(HrdAssessmentAnswer::class, 'response_id');
    }
}
