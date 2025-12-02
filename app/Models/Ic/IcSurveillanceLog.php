<?php

namespace App\Models\Ic;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class IcSurveillanceLog extends Model
{
    protected $fillable = [
        'hn',
        'vn',
        'an',
        'patient_name',
        'admit_date',
        'infection_date',
        'ward_name',
        'infection_type',
        'device_related',
        'organism',
        'culture_date',
        'sensitivity_pattern',
        'status',
        'onset_type',
        'days_after_admission',
        'outcome',
        'notes',
        'reporter_id',
    ];

    protected $casts = [
        'admit_date' => 'date',
        'infection_date' => 'date',
        'culture_date' => 'date',
    ];

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    // Calculate days after admission
    public function calculateDaysAfterAdmission()
    {
        if (!$this->admit_date || !$this->infection_date) {
            return null;
        }
        return $this->infection_date->diffInDays($this->admit_date);
    }

    // Determine if HAI (Hospital Acquired Infection)
    public function getIsHaiAttribute()
    {
        $days = $this->calculateDaysAfterAdmission();
        return $days !== null && $days >= 2; // HAI = onset > 48 hours after admission
    }
}
