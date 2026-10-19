<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdCompetency extends Model
{
    protected $fillable = ['name', 'description', 'type'];

    public function courses()
    {
        return $this->belongsToMany(HrdCourse::class, 'hrd_course_competencies', 'competency_id', 'course_id')
                    ->withPivot('score_weight');
    }

    public function indicators()
    {
        return $this->hasMany(HrdCompetencyIndicator::class, 'competency_id')->orderBy('level');
    }
}
