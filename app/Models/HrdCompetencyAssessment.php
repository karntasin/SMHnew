<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdCompetencyAssessment extends Model
{
    protected $fillable = [
        'user_id', 'competency_id', 'fiscal_year', 'self_level',
        'supervisor_level', 'supervisor_id', 'confirmed_at',
    ];

    protected $casts = [
        'confirmed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function competency()
    {
        return $this->belongsTo(HrdCompetency::class, 'competency_id');
    }

    public function supervisor()
    {
        return $this->belongsTo(User::class, 'supervisor_id');
    }
}
