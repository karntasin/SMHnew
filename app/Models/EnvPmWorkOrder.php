<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EnvPmWorkOrder extends Model
{
    public const OPEN_STATUSES = ['scheduled', 'assigned', 'in_progress'];

    protected $fillable = [
        'wo_number',
        'asset_id',
        'schedule_id',
        'standard_id',
        'status',
        'due_date',
        'scheduled_date',
        'sop',
        'labor_minutes',
        'labor_cost',
        'result',
        'findings',
        'performed_at',
        'started_at',
        'completed_at',
        'record_id',
        'corrective_request_id',
        'below_min_stock',
        'last_alert_on',
        'created_by',
    ];

    protected $casts = [
        'due_date' => 'date',
        'scheduled_date' => 'date',
        'labor_minutes' => 'integer',
        'labor_cost' => 'float',
        'performed_at' => 'datetime',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'below_min_stock' => 'boolean',
        'last_alert_on' => 'date',
    ];

    public function asset(): BelongsTo
    {
        return $this->belongsTo(EnvAsset::class, 'asset_id');
    }

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(EnvPmSchedule::class, 'schedule_id');
    }

    public function standard(): BelongsTo
    {
        return $this->belongsTo(EnvPmStandard::class, 'standard_id');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(EnvPmWorkOrderTask::class, 'work_order_id')->orderBy('sort')->orderBy('id');
    }

    public function photos(): HasMany
    {
        return $this->hasMany(EnvPmWorkOrderPhoto::class, 'work_order_id');
    }

    public function parts(): HasMany
    {
        return $this->hasMany(EnvPmWorkOrderPart::class, 'work_order_id');
    }

    public function assigneeRows(): HasMany
    {
        return $this->hasMany(EnvPmWorkOrderAssignee::class, 'work_order_id');
    }

    public function assigneeUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'env_pm_work_order_assignees', 'work_order_id', 'user_id')
            ->withPivot('is_lead')
            ->orderByPivot('is_lead', 'desc');
    }

    public function correctiveRequest(): BelongsTo
    {
        return $this->belongsTo(MaintenanceRequest::class, 'corrective_request_id');
    }

    public function record(): BelongsTo
    {
        return $this->belongsTo(EnvPmRecord::class, 'record_id');
    }

    public function isOpen(): bool
    {
        return in_array($this->status, self::OPEN_STATUSES, true);
    }
}
