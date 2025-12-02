<?php

namespace App\Models\Mra;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MraCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'name_en',
        'description',
        'sort_order',
        'weight',
        'is_active',
    ];

    protected $casts = [
        'weight' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    /**
     * Get the criteria for this category.
     */
    public function criteria()
    {
        return $this->hasMany(MraCriteria::class)->orderBy('sort_order');
    }

    /**
     * Get active criteria count
     */
    public function getActiveCriteriaCountAttribute()
    {
        return $this->criteria()->where('is_active', true)->count();
    }

    /**
     * Get max possible score for this category
     */
    public function getMaxScoreAttribute()
    {
        return $this->criteria()->where('is_active', true)->sum('max_score');
    }

    /**
     * Scope to get active categories
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true)->orderBy('sort_order');
    }
}
