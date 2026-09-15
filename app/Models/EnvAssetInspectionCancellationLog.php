<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnvAssetInspectionCancellationLog extends Model
{
    public const ACTIONS = [
        'cancel_cycle' => 'ยกเลิกวงรอบ',
        'cancel_by_date' => 'ยกเลิกตามวันที่นัด',
        'remove_item' => 'นำรายการออกจากวงรอบ',
    ];

    protected $fillable = [
        'cycle_id',
        'action',
        'mode',
        'scheduled_date',
        'items_count',
        'pending_count',
        'pass_count',
        'fail_count',
        'had_results',
        'force_confirmed',
        'reason',
        'meta',
        'cancelled_by',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
        'had_results' => 'boolean',
        'force_confirmed' => 'boolean',
        'meta' => 'array',
    ];

    public function cycle(): BelongsTo
    {
        return $this->belongsTo(EnvAssetInspectionCycle::class, 'cycle_id');
    }

    public function canceller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    public function getActionLabelAttribute(): string
    {
        return self::ACTIONS[$this->action] ?? $this->action;
    }
}
