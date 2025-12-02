<?php

namespace App\Models\Ic;

use Illuminate\Database\Eloquent\Model;

class IcOutbreakCase extends Model
{
    protected $fillable = [
        'outbreak_id',
        'case_type',
        'hn',
        'patient_name',
        'staff_name',
        'symptom_onset_date',
        'symptoms',
        'outcome',
        'is_index_case',
        'notes',
    ];

    protected $casts = [
        'symptom_onset_date' => 'date',
        'is_index_case' => 'boolean',
    ];

    public function outbreak()
    {
        return $this->belongsTo(IcOutbreak::class, 'outbreak_id');
    }
}
