<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnvPmWorkOrderTask extends Model
{
    protected $fillable = [
        'work_order_id',
        'standard_task_id',
        'sort',
        'task_name',
        'acceptable_criteria',
        'unit',
        'min_value',
        'max_value',
        'input_type',
        'result',
        'measured_value',
        'note',
    ];

    protected $casts = [
        'sort' => 'integer',
        'min_value' => 'float',
        'max_value' => 'float',
    ];

    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(EnvPmWorkOrder::class, 'work_order_id');
    }
}
