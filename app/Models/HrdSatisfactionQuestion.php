<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdSatisfactionQuestion extends Model
{
    protected $fillable = ['question_text', 'sort', 'is_active'];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
