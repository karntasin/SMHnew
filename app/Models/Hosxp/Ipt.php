<?php

namespace App\Models\Hosxp;

use Illuminate\Database\Eloquent\Model;

class Ipt extends Model
{
    protected $connection = 'hosxp';
    protected $table = 'ipt';
    protected $primaryKey = 'an';
    public $incrementing = false;
    public $timestamps = false;

    public function patient()
    {
        return $this->belongsTo(Patient::class, 'hn', 'hn');
    }
}
