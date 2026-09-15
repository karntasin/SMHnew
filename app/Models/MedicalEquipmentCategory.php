<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class MedicalEquipmentCategory extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'icon',
        'color',
        'description',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function equipment()
    {
        return $this->hasMany(MedicalEquipment::class, 'category_id');
    }
}
