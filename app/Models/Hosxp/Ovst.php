<?php

namespace App\Models\Hosxp;

use Illuminate\Database\Eloquent\Model;

/**
 * Model สำหรับตาราง ovst (OPD Visit)
 * ข้อมูลการรับบริการผู้ป่วยนอก
 */
class Ovst extends Model
{
    protected $connection = 'hosxp';
    protected $table = 'ovst';
    protected $primaryKey = 'vn';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $casts = [
        'vstdate' => 'date',
    ];

    /**
     * Get the patient for this visit.
     */
    public function patient()
    {
        return $this->belongsTo(Patient::class, 'hn', 'hn');
    }

    /**
     * Get OPD screen data for this visit.
     */
    public function opdScreen()
    {
        return $this->hasOne(OpdScreen::class, 'vn', 'vn');
    }

    /**
     * Get diagnoses for this visit.
     */
    public function diagnoses()
    {
        return $this->hasMany(OvstDiag::class, 'vn', 'vn');
    }

    /**
     * Get the principal diagnosis.
     */
    public function principalDiagnosis()
    {
        return $this->hasOne(OvstDiag::class, 'vn', 'vn')
            ->where('diagtype', '1');
    }

    /**
     * Get secondary diagnoses.
     */
    public function secondaryDiagnoses()
    {
        return $this->hasMany(OvstDiag::class, 'vn', 'vn')
            ->where('diagtype', '!=', '1');
    }

    /**
     * Get items/medications for this visit.
     */
    public function items()
    {
        return $this->hasMany(Opitemrece::class, 'vn', 'vn');
    }

    /**
     * Get lab orders for this visit.
     */
    public function labOrders()
    {
        return $this->hasMany(LabOrder::class, 'vn', 'vn');
    }

    /**
     * Get doctor for this visit.
     */
    public function doctor()
    {
        return $this->belongsTo(Doctor::class, 'doctor', 'code');
    }

    /**
     * Get pttype info.
     */
    public function pttypeInfo()
    {
        return $this->belongsTo(Pttype::class, 'pttype', 'pttype');
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
