<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EnvUtilityChecklist extends Model
{
    protected $fillable = ['system_id', 'item_name', 'frequency', 'min_value', 'max_value', 'unit'];

    public function system()
    {
        return $this->belongsTo(EnvUtilitySystem::class, 'system_id');
    }
}
