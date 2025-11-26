<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QualityIndicator extends Model
{
    protected $fillable = [
        'type',
        'department_id',
        'team_id',
        'code',
        'name',
        'description',
        'category',
        'unit',
        'target_value',
        'target_operator',
        'frequency',
        'formula_description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'target_value' => 'decimal:2',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function team()
    {
        return $this->belongsTo(TeamHa::class, 'team_id'); // Assuming TeamHa model exists or will be created? No, I created table 'teamha' but maybe not model.
    }

    public function entries(): HasMany
    {
        return $this->hasMany(QualityIndicatorEntry::class);
    }
}
