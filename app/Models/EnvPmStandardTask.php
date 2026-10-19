<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnvPmStandardTask extends Model
{
    protected $fillable = [
        'standard_id',
        'sort',
        'task_name',
        'acceptable_criteria',
        'unit',
        'min_value',
        'max_value',
        'input_type',
    ];

    protected $casts = [
        'sort' => 'integer',
        'min_value' => 'float',
        'max_value' => 'float',
    ];

    public function standard(): BelongsTo
    {
        return $this->belongsTo(EnvPmStandard::class, 'standard_id');
    }
}
