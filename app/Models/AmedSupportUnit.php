<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AmedSupportUnit extends Model
{
    use HasFactory;

    protected $connection = 'mysql';

    protected $table = 'amed_support_units';

    protected $fillable = [
        'unit_code',
        'unit_name',
        'location',
        'g1',
        'g2',
        'g3',
        'g4',
        'g5',
        'k1',
        'k2',
        'k3',
        'k4',
        'k5',
        'c1',
        'c3',
        'c4',
        'total',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'g1' => 'integer',
        'g2' => 'integer',
        'g3' => 'integer',
        'g4' => 'integer',
        'g5' => 'integer',
        'k1' => 'integer',
        'k2' => 'integer',
        'k3' => 'integer',
        'k4' => 'integer',
        'k5' => 'integer',
        'c1' => 'integer',
        'c3' => 'integer',
        'c4' => 'integer',
        'total' => 'integer',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];
}
