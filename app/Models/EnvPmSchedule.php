<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EnvPmSchedule extends Model
{
    protected $fillable = [
        'asset_id',
        'standard_id',
        'frequency_type',
        'frequency_value',
        'basis',
        'meter_interval',
        'last_meter_reading',
        'next_meter_due',
        'meter_unit',
        'lead_days',
        'last_pm_date',
        'next_pm_date',
        'checklist_template',
    ];

    protected $casts = [
        'frequency_value' => 'integer',
        'meter_interval' => 'float',
        'last_meter_reading' => 'float',
        'next_meter_due' => 'float',
        'lead_days' => 'integer',
        'last_pm_date' => 'date',
        'next_pm_date' => 'date',
        'checklist_template' => 'array',
    ];

    public function asset(): BelongsTo
    {
        return $this->belongsTo(EnvAsset::class, 'asset_id');
    }

    public function standard(): BelongsTo
    {
        return $this->belongsTo(EnvPmStandard::class, 'standard_id');
    }

    public function workOrders(): HasMany
    {
        return $this->hasMany(EnvPmWorkOrder::class, 'schedule_id');
    }

    public function meterReadings(): HasMany
    {
        return $this->hasMany(EnvPmMeterReading::class, 'schedule_id');
    }

    public static function leadDaysForRisk(?string $risk): int
    {
        return match ($risk) {
            'A' => 14,
            'B' => 7,
            'C' => 3,
            default => 7,
        };
    }

    /**
     * @return array{0: string, 1: int}
     */
    public static function frequencyFromStandard(EnvPmStandard $standard): array
    {
        $value = max(1, (int) $standard->interval_value);

        return match ($standard->frequency) {
            'daily' => ['day', $value],
            'weekly' => ['week', $value],
            'annually' => ['year', $value],
            default => ['month', $value],
        };
    }

    public function advanceAfter(Carbon $performedAt, ?float $meterReading = null): void
    {
        $this->last_pm_date = $performedAt->toDateString();

        if ($this->basis === 'meter') {
            $interval = (float) ($this->meter_interval ?: 0);
            $reading = $meterReading ?? (float) ($this->last_meter_reading ?? 0);
            $this->last_meter_reading = $reading;
            $this->next_meter_due = $reading + $interval;
        } else {
            $next = $performedAt->copy();
            $value = max(1, (int) $this->frequency_value);
            $next = match ($this->frequency_type) {
                'day' => $next->addDays($value),
                'week' => $next->addWeeks($value),
                'year' => $next->addYears($value),
                default => $next->addMonths($value),
            };
            $this->next_pm_date = $next->toDateString();
        }

        $this->save();
    }
}
