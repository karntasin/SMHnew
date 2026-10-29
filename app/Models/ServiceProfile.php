<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ServiceProfile extends Model
{
    protected $connection = 'mysql';
    protected $table = 'service_profiles';

    protected $fillable = [
        'code',
        'name',
        'department_id',
        'team_ha_id',
        'service_group',
        'cycle_year',
        'leader_name',
        'purpose',
        'scope_of_service',
        'target_customers',
        'key_quality_issues',
        'key_risks_challenges',
        'workload_and_resources',
        'key_processes',
        'performance_indicators',
        'current_systems',
        'ongoing_improvements',
        'future_plans',
        'status',
        'current_version',
        'order',
        'last_modified_by',
    ];

    protected $casts = [
        'target_customers' => 'array',
        'workload_and_resources' => 'array',
        'key_processes' => 'array',
        'performance_indicators' => 'array',
        'current_version' => 'integer',
        'order' => 'integer',
    ];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'department_id');
    }

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
        return $this->hasMany(ServiceProfileRevision::class, 'service_profile_id')->orderByDesc('version_number');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(ServiceProfileAttachment::class, 'service_profile_id')->orderByDesc('created_at');
    }

    /**
     * Create snapshot array for revision history & restore
     */
    public function createSnapshot(): array
    {
        return [
            'code' => $this->code,
            'name' => $this->name,
            'department_id' => $this->department_id,
            'team_ha_id' => $this->team_ha_id,
            'service_group' => $this->service_group,
            'cycle_year' => $this->cycle_year,
            'leader_name' => $this->leader_name,
            'purpose' => $this->purpose,
            'scope_of_service' => $this->scope_of_service,
            'target_customers' => $this->target_customers,
            'key_quality_issues' => $this->key_quality_issues,
            'key_risks_challenges' => $this->key_risks_challenges,
            'workload_and_resources' => $this->workload_and_resources,
            'key_processes' => $this->key_processes,
            'performance_indicators' => $this->performance_indicators,
            'current_systems' => $this->current_systems,
            'ongoing_improvements' => $this->ongoing_improvements,
            'future_plans' => $this->future_plans,
            'status' => $this->status,
        ];
    }
}
