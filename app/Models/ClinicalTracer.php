<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClinicalTracer extends Model
{
    protected $connection = 'mysql';
    protected $table = 'clinical_tracers';

    protected $fillable = [
        'code',
        'title',
        'subtitle',
        'category',
        'team_ha_id',
        'lead_doctor_name',
        'lead_nurse_name',
        'context',
        'key_issues',
        'goals',
        'processes',
        'kpi_data',
        'results_analysis',
        'next_plans',
        'case_reviews_data',
        'status',
        'current_version',
        'last_modified_by',
        'order',
    ];

    protected $casts = [
        'kpi_data' => 'array',
        'case_reviews_data' => 'array',
        'current_version' => 'integer',
        'order' => 'integer',
    ];

    public function team(): BelongsTo
    {
        return $this->belongsTo(TeamHa::class, 'team_ha_id');
    }

    public function lastModifiedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'last_modified_by');
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(ClinicalTracerRevision::class, 'clinical_tracer_id')->orderByDesc('version_number');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(ClinicalTracerAttachment::class, 'clinical_tracer_id')->orderByDesc('created_at');
    }

    /**
     * Create snapshot array for revision history & restore
     */
    public function createSnapshot(): array
    {
        return [
            'code' => $this->code,
            'title' => $this->title,
            'subtitle' => $this->subtitle,
            'category' => $this->category,
            'team_ha_id' => $this->team_ha_id,
            'lead_doctor_name' => $this->lead_doctor_name,
            'lead_nurse_name' => $this->lead_nurse_name,
            'context' => $this->context,
            'key_issues' => $this->key_issues,
            'goals' => $this->goals,
            'processes' => $this->processes,
            'kpi_data' => $this->kpi_data,
            'results_analysis' => $this->results_analysis,
            'next_plans' => $this->next_plans,
            'case_reviews_data' => $this->case_reviews_data,
            'status' => $this->status,
        ];
    }
}
