<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EnvUtilitySystem extends Model
{
    protected $fillable = ['name', 'description', 'status'];

    public function checklists()
    {
        return $this->hasMany(EnvUtilityChecklist::class, 'system_id');
    }

    public function checks()
    {
        return $this->hasMany(EnvUtilityCheck::class, 'system_id');
    }

    public function latestCheck()
    {
        return $this->hasOne(EnvUtilityCheck::class, 'system_id')->latestOfMany();
    }
}
