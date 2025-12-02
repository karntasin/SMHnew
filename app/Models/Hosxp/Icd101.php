<?php

namespace App\Models\Hosxp;

use Illuminate\Database\Eloquent\Model;

/**
 * Model สำหรับตาราง icd101 (ICD-10 Codes)
 * รหัสการวินิจฉัยโรค ICD-10
 */
class Icd101 extends Model
{
    protected $connection = 'hosxp';
    protected $table = 'icd101';
    protected $primaryKey = 'code';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    /**
     * Get display name (Thai name if available, otherwise English)
     */
    public function getDisplayNameAttribute(): string
    {
        return !empty($this->tname) ? $this->tname : ($this->name ?? '');
    }

    /**
     * ดึงชื่อโรคจาก ICD-10 code
     */
    public static function getNameByCode(string $code): ?string
    {
        $icd = self::where('code', $code)->first();
        return $icd?->display_name;
    }

    /**
     * ดึงข้อมูลทั้งหมดจาก ICD-10 code
     */
    public static function getFullInfoByCode(string $code): ?array
    {
        $icd = self::where('code', $code)->first();
        
        if (!$icd) {
            return null;
        }

        return [
            'code' => $icd->code,
            'name' => $icd->name,
            'tname' => $icd->tname,
            'display_name' => $icd->display_name,
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
