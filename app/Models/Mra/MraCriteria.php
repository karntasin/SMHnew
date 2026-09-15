<?php

namespace App\Models\Mra;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MraCriteria extends Model
{
    use HasFactory;

    protected $table = 'mra_criteria';

    protected $fillable = [
        'mra_category_id',
        'code',
        'group_key',
        'group_title',
        'name',
        'name_en',
        'description',
        'audit_guide',
        'hosxp_table',
        'hosxp_field',
        'data_type',
        'max_score',
        'sort_order',
        'is_required',
        'is_bonus',
        'is_active',
    ];

    protected $casts = [
        'max_score' => 'integer',
        'is_required' => 'boolean',
        'is_bonus' => 'boolean',
        'is_active' => 'boolean',
    ];

    /**
     * Get the category that owns this criteria.
     */
    public function category()
    {
        return $this->belongsTo(MraCategory::class, 'mra_category_id');
    }

    /**
     * Get audit details for this criteria.
     */
    public function auditDetails()
    {
        return $this->hasMany(MraAuditDetail::class, 'mra_criteria_id');
    }

    /**
     * Check if this criteria can be auto-fetched from HOSxP
     */
    public function canAutoFetch()
    {
        return in_array($this->data_type, ['auto', 'both']) 
            && !empty($this->hosxp_table) 
            && !empty($this->hosxp_field);
    }

    /**
     * Scope to get active criteria
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true)->orderBy('sort_order');
    }

    /**
     * Scope to get required criteria
     */
    public function scopeRequired($query)
    {
        return $query->where('is_required', true);
    }

    /**
     * Scope to get auto-fetchable criteria
     */
    public function scopeAutoFetchable($query)
    {
        return $query->whereIn('data_type', ['auto', 'both'])
            ->whereNotNull('hosxp_table')
            ->whereNotNull('hosxp_field');
    }
}
