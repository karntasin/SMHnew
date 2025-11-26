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
        'organism',
        'status',
        'notes',
        'reporter_id',
    ];

    protected $casts = [
        'admit_date' => 'date',
        'infection_date' => 'date',
    ];

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }
}
