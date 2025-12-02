<?php

namespace App\Models\Ic;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class IcIncident extends Model
{
    protected $fillable = [
        'reporter_id',
        'incident_date',
        'location',
        'incident_type',
        'source_patient_hn',
        'source_patient_status',
        'description',
        'severity',
        'status',
        'action_taken',
        'follow_up_date',
        'pep_given',
        'baseline_labs',
        'outcome',
    ];

    protected $casts = [
        'incident_date' => 'datetime',
        'follow_up_date' => 'date',
        'pep_given' => 'boolean',
    ];

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    // Check if follow-up is overdue
    public function getIsFollowUpOverdueAttribute()
    {
        if (!$this->follow_up_date || $this->outcome) {
            return false;
        }
        return $this->follow_up_date->isPast();
    }
}
