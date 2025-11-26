<?php

namespace App\Models\Hosxp;

use Illuminate\Database\Eloquent\Model;

class Patient extends Model
{
    protected $connection = 'hosxp';
    protected $table = 'patient';
    protected $primaryKey = 'hos_guid';
    public $incrementing = false;
    public $timestamps = false;

    // Ensure read-only by overriding save methods
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
