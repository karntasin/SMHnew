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
        'description',
        'severity',
        'status',
        'action_taken',
    ];

    protected $casts = [
        'incident_date' => 'datetime',
    ];

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }
}
