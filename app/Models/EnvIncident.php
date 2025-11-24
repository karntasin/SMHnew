<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EnvIncident extends Model
{
    protected $fillable = [
        'reporter_id',
        'incident_type',
        'location',
        'severity',
        'description',
        'status',
        'assigned_to',
        'action_taken',
        'start_time',
        'end_time',
        'resolution_notes',
        'satisfaction_rating',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
    ];

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }
}
