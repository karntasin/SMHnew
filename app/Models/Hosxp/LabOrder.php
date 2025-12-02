<?php

namespace App\Models\Hosxp;

use Illuminate\Database\Eloquent\Model;

/**
 * Model สำหรับตาราง lab_order
 * ข้อมูลการสั่ง Lab
 */
class LabOrder extends Model
{
    protected $connection = 'hosxp';
    protected $table = 'lab_order';
    protected $primaryKey = 'lab_order_number';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    /**
     * Get the visit for this lab order.
     */
    public function visit()
    {
        return $this->belongsTo(Ovst::class, 'vn', 'vn');
    }

    /**
     * Get lab item info.
     */
    public function labItem()
    {
        return $this->belongsTo(LabItems::class, 'lab_items_code', 'lab_items_code');
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
