<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnvPmMeterReading extends Model
{
    protected $fillable = [
        'asset_id',
        'schedule_id',
        'reading',
        'read_at',
        'user_id',
        'note',
    ];

    protected $casts = [
        'reading' => 'float',
        'read_at' => 'datetime',
    ];

    public function asset(): BelongsTo
    {
        return $this->belongsTo(EnvAsset::class, 'asset_id');
    }

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(EnvPmSchedule::class, 'schedule_id');
    }
}
