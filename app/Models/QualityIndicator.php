<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class QualityIndicator extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'family_id',
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
        'deleted_by',
        'restored_by',
        'restored_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'target_value' => 'decimal:2',
        'deleted_at' => 'datetime',
        'restored_at' => 'datetime',
    ];

    public function family()
    {
        return $this->belongsTo(QualityIndicatorFamily::class, 'family_id');
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function team()
    {
        return $this->belongsTo(TeamHa::class, 'team_id');
    }

    public function entries(): HasMany
    {
        return $this->hasMany(QualityIndicatorEntry::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(QualityReview::class, 'quality_indicator_id');
    }

    public function deletedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    public function restoredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'restored_by');
    }
}
