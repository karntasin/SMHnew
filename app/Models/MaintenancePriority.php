<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MaintenancePriority extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'color',
        'level',
        'sla_hours',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'level' => 'integer',
        'sla_hours' => 'integer',
    ];
}
