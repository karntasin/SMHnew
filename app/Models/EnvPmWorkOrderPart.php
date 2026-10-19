<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnvPmWorkOrderPart extends Model
{
    protected $fillable = [
        'work_order_id',
        'spare_part_id',
        'qty',
        'unit_cost',
    ];

    protected $casts = [
        'qty' => 'float',
        'unit_cost' => 'float',
    ];

    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(EnvPmWorkOrder::class, 'work_order_id');
    }

    public function sparePart(): BelongsTo
    {
        return $this->belongsTo(EnvSparePart::class, 'spare_part_id');
    }
}
