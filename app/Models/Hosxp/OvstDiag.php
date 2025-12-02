<?php

namespace App\Models\Hosxp;

use Illuminate\Database\Eloquent\Model;

/**
 * Model สำหรับตาราง ovstdiag
 * ข้อมูลการวินิจฉัยโรค OPD
 */
class OvstDiag extends Model
{
    protected $connection = 'hosxp';
    protected $table = 'ovstdiag';
    public $incrementing = false;
    public $timestamps = false;

    /**
     * Get the visit for this diagnosis.
     */
    public function visit()
    {
        return $this->belongsTo(Ovst::class, 'vn', 'vn');
    }

    /**
     * Get ICD-10 info.
     */
    public function icd10Info()
    {
        return $this->belongsTo(Icd10::class, 'icd10', 'code');
    }

    /**
     * Check if this is principal diagnosis.
     */
    public function getIsPrincipalAttribute()
    {
        return $this->diagtype === '1';
    }

    /**
     * Get diagnosis type name.
     */
    public function getDiagTypeNameAttribute()
    {
        $types = [
            '1' => 'Principal Diagnosis',
            '2' => 'Co-morbidity',
            '3' => 'Complication',
            '4' => 'Other',
            '5' => 'External Cause',
        ];

        return $types[$this->diagtype] ?? 'Unknown';
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
