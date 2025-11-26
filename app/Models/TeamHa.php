<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TeamHa extends Model
{
    protected $table = 'teamha';
    
    protected $fillable = [
        'abbreviation',
        'name_th',
        'name_en',
    ];
}
