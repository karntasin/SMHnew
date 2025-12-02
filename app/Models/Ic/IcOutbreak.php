<?php

namespace App\Models\Ic;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class IcOutbreak extends Model
{
    protected $fillable = [
        'outbreak_name',
        'detection_date',
        'resolved_date',
        'pathogen',
        'affected_area',
        'total_cases',
        'staff_cases',
        'patient_cases',
        'status',
        'severity',
        'source_investigation',
        'control_measures',
        'lessons_learned',
        'reported_by',
    ];

    protected $casts = [
        'detection_date' => 'date',
        'resolved_date' => 'date',
    ];

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function cases()
    {
        return $this->hasMany(IcOutbreakCase::class, 'outbreak_id');
    }

    // Calculate outbreak duration
    public function getDurationDaysAttribute()
    {
        $endDate = $this->resolved_date ?? now();
        return $endDate->diffInDays($this->detection_date);
    }
}
