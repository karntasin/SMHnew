<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EnvUtilityCheck extends Model
{
    protected $fillable = ['system_id', 'inspector_id', 'check_date', 'status', 'notes'];

    protected $casts = [
        'check_date' => 'date',
    ];

    public function system()
    {
        return $this->belongsTo(EnvUtilitySystem::class, 'system_id');
    }

    public function inspector()
    {
        return $this->belongsTo(User::class, 'inspector_id');
    }

    public function items()
    {
        return $this->hasMany(EnvUtilityCheckItem::class, 'check_id');
    }
}
