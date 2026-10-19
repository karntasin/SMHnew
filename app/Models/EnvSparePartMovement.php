<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnvSparePartMovement extends Model
{
    protected $fillable = [
        'spare_part_id',
        'type',
        'qty',
        'balance_after',
        'work_order_id',
        'note',
        'user_id',
    ];

    protected $casts = [
        'qty' => 'float',
        'balance_after' => 'float',
    ];

    public function sparePart(): BelongsTo
    {
        return $this->belongsTo(EnvSparePart::class, 'spare_part_id');
    }

    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(EnvPmWorkOrder::class, 'work_order_id');
    }
}
