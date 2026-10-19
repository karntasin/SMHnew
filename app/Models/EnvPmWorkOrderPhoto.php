<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnvPmWorkOrderPhoto extends Model
{
    protected $fillable = [
        'work_order_id',
        'phase',
        'path',
    ];

    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(EnvPmWorkOrder::class, 'work_order_id');
    }
}
