<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnvElectricityUsage extends Model
{
    protected $fillable = [
        'department_id',
        'year',
        'month',
        'kwh',
        'cost',
        'meter_start',
        'meter_end',
        'notes',
        'recorded_by',
    ];

    protected $casts = [
        'year' => 'integer',
        'month' => 'integer',
        'kwh' => 'float',
        'cost' => 'float',
        'meter_start' => 'float',
        'meter_end' => 'float',
    ];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function getPeriodLabelAttribute(): string
    {
        return sprintf('%02d/%d', $this->month, $this->year);
    }
}
