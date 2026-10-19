<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EnvPmStandard extends Model
{
    public const FREQUENCIES = [
        'daily' => 'รายวัน',
        'weekly' => 'รายสัปดาห์',
        'monthly' => 'รายเดือน',
        'annually' => 'รายปี',
    ];

    protected $fillable = [
        'name',
        'description',
        'frequency',
        'basis',
        'interval_value',
        'meter_unit',
        'meter_interval',
        'sop',
        'estimated_labor_minutes',
        'is_active',
    ];

    protected $casts = [
        'interval_value' => 'integer',
        'meter_interval' => 'float',
        'estimated_labor_minutes' => 'integer',
        'is_active' => 'boolean',
    ];

    public function tasks(): HasMany
    {
        return $this->hasMany(EnvPmStandardTask::class, 'standard_id')->orderBy('sort')->orderBy('id');
    }

    public function parts(): HasMany
    {
        return $this->hasMany(EnvPmStandardPart::class, 'standard_id');
    }
}
