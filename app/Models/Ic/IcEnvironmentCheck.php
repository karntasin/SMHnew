<?php

namespace App\Models\Ic;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class IcEnvironmentCheck extends Model
{
    protected $fillable = [
        'check_date',
        'area_name',
        'check_type',
        'sampling_site',
        'organism_found',
        'result',
        'cfu_count',
        'equipment_name',
        'sterilization_method',
        'indicator_passed',
        'corrective_action',
        'notes',
        'reporter_id',
    ];

    protected $casts = [
        'check_date' => 'date',
        'indicator_passed' => 'boolean',
        'cfu_count' => 'decimal:2',
    ];

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }
}
