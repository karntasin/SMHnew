<?php

namespace App\Models\Im;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class ActionPlan extends Model
{
    protected $table = 'im_action_plans';

    protected $fillable = [
        'it_plan_id', 'project', 'objective', 'budget', 'actual_budget', 'owner',
        'start_date', 'end_date', 'status', 'progress', 'pdca_stage',
        'problems', 'lessons_learned',
    ];

    protected $casts = [
        'budget' => 'float',
        'actual_budget' => 'float',
        'progress' => 'integer',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(ItPlan::class, 'it_plan_id');
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(PlanAttachment::class, 'attachable')->latest();
    }

    public function getDurationMonthsAttribute(): int
    {
        if (! $this->start_date || ! $this->end_date) {
            return 0;
        }

        return max(1, (int) round($this->start_date->diffInDays($this->end_date) / 30));
    }
}
