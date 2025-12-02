<?php

namespace App\Models\Ic;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class IcDeviceDay extends Model
{
    protected $fillable = [
        'record_date',
        'ward_name',
        'patient_days',
        'urinary_catheter_days',
        'central_line_days',
        'ventilator_days',
        'peripheral_iv_days',
        'ng_tube_days',
        'notes',
        'reporter_id',
    ];

    protected $casts = [
        'record_date' => 'date',
    ];

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    // Calculate device utilization ratios
    public function getCatheterUtilizationRatioAttribute()
    {
        if ($this->patient_days === 0) return 0;
        return round(($this->urinary_catheter_days / $this->patient_days) * 100, 2);
    }

    public function getCentralLineUtilizationRatioAttribute()
    {
        if ($this->patient_days === 0) return 0;
        return round(($this->central_line_days / $this->patient_days) * 100, 2);
    }

    public function getVentilatorUtilizationRatioAttribute()
    {
        if ($this->patient_days === 0) return 0;
        return round(($this->ventilator_days / $this->patient_days) * 100, 2);
    }
}
