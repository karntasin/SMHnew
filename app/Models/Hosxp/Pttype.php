<?php

namespace App\Models\Hosxp;

use Illuminate\Database\Eloquent\Model;

/**
 * Model สำหรับตาราง pttype
 * ข้อมูลสิทธิการรักษา
 */
class Pttype extends Model
{
    protected $connection = 'hosxp';
    protected $table = 'pttype';
    protected $primaryKey = 'pttype';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

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
