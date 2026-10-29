<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SarSection extends Model
{
    protected $connection = 'mysql';
    protected $table = 'sar_sections';

    protected $fillable = [
        'sar_part_id',
        'code',
        'title',
        'requirement',
        'context',
        'self_assessment_data',
        'process_content',
        'achievements',
        'results_kpi_data',
        'lead_team_id',
        'lead_person_name',
        'status',
        'current_version',
        'last_modified_by',
        'order',
    ];

    protected $casts = [
        'self_assessment_data' => 'array',
        'results_kpi_data' => 'array',
        'current_version' => 'integer',
        'order' => 'integer',
    ];

    public function part(): BelongsTo
    {
        return $this->belongsTo(SarPart::class, 'sar_part_id');
    }

    public function leadTeam(): BelongsTo
    {
        return $this->belongsTo(TeamHa::class, 'lead_team_id');
    }

    public function lastModifiedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'last_modified_by');
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(SarRevision::class, 'sar_section_id')->orderByDesc('version_number');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(SarAttachment::class, 'sar_section_id')->orderByDesc('created_at');
    }

    /**
     * Create snapshot array for revision history
     */
    public function createSnapshot(): array
    {
        return [
            'code' => $this->code,
            'title' => $this->title,
            'requirement' => $this->requirement,
            'context' => $this->context,
            'self_assessment_data' => $this->self_assessment_data,
            'process_content' => $this->process_content,
            'achievements' => $this->achievements,
            'results_kpi_data' => $this->results_kpi_data,
            'lead_team_id' => $this->lead_team_id,
            'lead_person_name' => $this->lead_person_name,
            'status' => $this->status,
        ];
    }
}
