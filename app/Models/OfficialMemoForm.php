<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OfficialMemoForm extends Model
{
    protected $fillable = [
        'key',
        'label',
        'base_layout',
        'fields',
        'layout',
        'is_system',
        'sort_order',
    ];

    protected $casts = [
        'fields' => 'array',
        'layout' => 'array',
        'is_system' => 'boolean',
        'sort_order' => 'integer',
    ];
}
