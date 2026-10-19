<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdAnnualPlan extends Model
{
    protected $fillable = [
        'fiscal_year', 'title', 'target_group', 'quarter',
        'target_hours', 'target_pass_rate', 'budget', 'course_id',
    ];

    public function course()
    {
        return $this->belongsTo(HrdCourse::class, 'course_id');
    }
}
