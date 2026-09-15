<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnvUtilityAcReading extends Model
{
    protected $fillable = [
        'meter_id',
        'year_be',
        'month',
        'fiscal_year_be',
        'prev_reading',
        'curr_reading',
        'units',
        'rate',
        'cost',
        'note',
        'recorded_by',
    ];

    protected $casts = [
        'prev_reading' => 'float',
        'curr_reading' => 'float',
        'units' => 'float',
        'rate' => 'float',
        'cost' => 'float',
    ];

    public function meter(): BelongsTo
    {
        return $this->belongsTo(EnvUtilityAcMeter::class, 'meter_id');
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
