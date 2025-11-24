<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QualityImprovement extends Model
{
    protected $fillable = [
        'title',
        'type',
        'description',
        'status',
        'progress_percentage',
        'action_plan',
    ];
}
