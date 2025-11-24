<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnvPmRecord extends Model
{
    protected $fillable = [
        'asset_id',
        'schedule_id',
        'performed_by',
        'result',
        'findings',
        'data_values',
        'performed_at',
    ];

    protected $casts = [
        'data_values' => 'array',
        'performed_at' => 'datetime',
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
