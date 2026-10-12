<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnvPmWorkOrderAssignee extends Model
{
    protected $fillable = [
        'work_order_id',
        'user_id',
        'is_lead',
    ];

    protected $casts = [
        'is_lead' => 'boolean',
    ];

    public function workOrder(): BelongsTo
    {
        return $this->belongsTo(EnvPmWorkOrder::class, 'work_order_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
