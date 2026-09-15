<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EnvAssetInspectionCycle extends Model
{
    public const STATUSES = [
        'draft' => 'ร่าง',
        'scheduled' => 'กำหนดวันแล้ว',
        'in_progress' => 'กำลังตรวจ',
        'completed' => 'เสร็จสิ้น',
        'cancelled' => 'ยกเลิกแล้ว',
    ];

    protected $fillable = [
        'name',
        'fiscal_year',
        'status',
        'default_scheduled_date',
        'period_start',
        'period_end',
        'notes',
        'created_by',
        'cancelled_at',
        'cancelled_by',
        'cancel_reason',
    ];

    protected $casts = [
        'default_scheduled_date' => 'date',
        'period_start' => 'date',
        'period_end' => 'date',
        'cancelled_at' => 'datetime',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(EnvAssetInspectionItem::class, 'cycle_id');
    }

    public function cancellationLogs(): HasMany
    {
        return $this->hasMany(EnvAssetInspectionCancellationLog::class, 'cycle_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function canceller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    public function getStatusLabelAttribute(): string
    {
        return self::STATUSES[$this->status] ?? $this->status;
    }

    public function isCancelled(): bool
    {
        return $this->status === 'cancelled';
    }

    public function refreshStatus(): void
    {
        if ($this->isCancelled()) {
            return;
        }

        $total = $this->items()->count();
        if ($total === 0) {
            $this->update(['status' => 'draft']);

            return;
        }

        $pending = $this->items()->where('result', 'pending')->count();
        $withDate = $this->items()->whereNotNull('scheduled_date')->count();
        $done = $total - $pending;

        if ($done === $total) {
            $this->update(['status' => 'completed']);

            return;
        }

        if ($done > 0) {
            $this->update(['status' => 'in_progress']);

            return;
        }

        if ($withDate > 0) {
            $this->update(['status' => 'scheduled']);

            return;
        }

        $this->update(['status' => 'draft']);
    }
}
