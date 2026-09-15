<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnvAssetInspectionItem extends Model
{
    public const RESULTS = [
        'pending' => 'รอตรวจ',
        'pass' => 'ผ่าน',
        'fail' => 'ไม่ผ่าน',
    ];

    protected $fillable = [
        'cycle_id',
        'asset_id',
        'department_label',
        'scheduled_date',
        'result',
        'notes',
        'inspected_at',
        'inspected_by',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
        'inspected_at' => 'datetime',
    ];

    public function cycle(): BelongsTo
    {
        return $this->belongsTo(EnvAssetInspectionCycle::class, 'cycle_id');
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(EnvAsset::class, 'asset_id');
    }

    public function inspector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inspected_by');
    }

    public function getResultLabelAttribute(): string
    {
        return self::RESULTS[$this->result] ?? $this->result;
    }
}
