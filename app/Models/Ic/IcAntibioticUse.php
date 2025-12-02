<?php

namespace App\Models\Ic;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class IcAntibioticUse extends Model
{
    protected $fillable = [
        'hn',
        'an',
        'patient_name',
        'ward_name',
        'start_date',
        'end_date',
        'antibiotic_name',
        'antibiotic_class',
        'route',
        'dose',
        'frequency',
        'indication',
        'culture_site',
        'organism',
        'sensitivity_pattern',
        'appropriateness',
        'reviewed_by',
        'recommendation',
        'notes',
        'reporter_id',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    // Calculate days of therapy (DOT)
    public function getDaysOfTherapyAttribute()
    {
        if (!$this->end_date) {
            return now()->diffInDays($this->start_date) + 1;
        }
        return $this->end_date->diffInDays($this->start_date) + 1;
    }
}
