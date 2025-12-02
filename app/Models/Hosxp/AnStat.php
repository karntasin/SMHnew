<?php

namespace App\Models\Hosxp;

use Illuminate\Database\Eloquent\Model;

/**
 * Model สำหรับตาราง an_stat (IPD Statistics)
 * ข้อมูลสถิติผู้ป่วยใน รวม diagnosis codes
 */
class AnStat extends Model
{
    protected $connection = 'hosxp';
    protected $table = 'an_stat';
    protected $primaryKey = 'an';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    /**
     * Get the IPT (IPD Visit) for this stat.
     */
    public function ipt()
    {
        return $this->belongsTo(Ipt::class, 'an', 'an');
    }

    /**
     * ดึง Secondary Diagnoses (dx1-dx5)
     */
    public function getSecondaryDiagnoses(): array
    {
        $diagnoses = [];
        
        for ($i = 1; $i <= 5; $i++) {
            $field = "dx{$i}";
            if (!empty($this->$field)) {
                $diagnoses[] = $this->$field;
            }
        }
        
        return $diagnoses;
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
