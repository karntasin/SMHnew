<?php

namespace App\Models\Hosxp;

use Illuminate\Database\Eloquent\Model;

/**
 * Model สำหรับตาราง opdscreen
 * ข้อมูลการซักประวัติ/สัญญาณชีพ OPD
 */
class OpdScreen extends Model
{
    protected $connection = 'hosxp';
    protected $table = 'opdscreen';
    protected $primaryKey = 'vn';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $casts = [
        // โรงพยาบาลส่วนใหญ่ใช้ bps/bpd; บางเวอร์ชันใช้ bpsys/bpdia
        'bps' => 'integer',
        'bpd' => 'integer',
        'bpsys' => 'integer',
        'bpdia' => 'integer',
        'pulse' => 'integer',
        'hr' => 'integer',
        'temperature' => 'float',
        'bw' => 'float',
        'height' => 'float',
        'bmi' => 'float',
        'rr' => 'integer',
    ];

    /**
     * Get the visit for this screen.
     */
    public function visit()
    {
        return $this->belongsTo(Ovst::class, 'vn', 'vn');
    }

    /**
     * Get vital signs as array
     */
    public function getVitalSignsAttribute()
    {
        return [
            'bp_systolic' => $this->bps ?? $this->bpsys,
            'bp_diastolic' => $this->bpd ?? $this->bpdia,
            'pulse' => $this->pulse ?? $this->hr,
            'temperature' => $this->temperature,
            'respiratory_rate' => $this->rr,
            'weight' => $this->bw,
            'height' => $this->height,
            'bmi' => $this->bmi,
        ];
    }

    // Read-only protection
    public function save(array $options = [])
    {
        throw new \Exception("This model is read-only. Modifications to HOSxP database are forbidden.");
    }

    public function update(array $attributes = [], array $options = [])
    {
        throw new \Exception("This model is read-only. Modifications to HOSxP database are forbidden.");
    }

    public function delete()
    {
        throw new \Exception("This model is read-only. Modifications to HOSxP database are forbidden.");
    }

    public static function create(array $attributes = [])
    {
        throw new \Exception("This model is read-only. Modifications to HOSxP database are forbidden.");
    }
}
