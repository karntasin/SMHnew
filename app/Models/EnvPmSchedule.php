<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnvPmSchedule extends Model
{
    protected $fillable = [
        'asset_id',
        'frequency_type',
        'frequency_value',
        'last_pm_date',
        'next_pm_date',
        'checklist_template',
    ];

    protected $casts = [
        'last_pm_date' => 'date',
        'next_pm_date' => 'date',
        'checklist_template' => 'array',
    ];

    public function asset(): BelongsTo
    {
        return $this->belongsTo(EnvAsset::class, 'asset_id');
    }
}
