<?php

namespace App\Models\Hosxp;

use Illuminate\Database\Eloquent\Model;

/**
 * Model สำหรับตาราง opitemrece
 * ข้อมูลรายการยา/เวชภัณฑ์/บริการ OPD
 */
class Opitemrece extends Model
{
    protected $connection = 'hosxp';
    protected $table = 'opitemrece';
    public $incrementing = false;
    public $timestamps = false;

    protected $casts = [
        'qty' => 'float',
        'unitprice' => 'float',
        'sum_price' => 'float',
    ];

    /**
     * Get the visit for this item.
     */
    public function visit()
    {
        return $this->belongsTo(Ovst::class, 'vn', 'vn');
    }

    /**
     * Get drug item info (if it's a drug).
     */
    public function drugItem()
    {
        return $this->belongsTo(DrugItems::class, 'icode', 'icode');
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
