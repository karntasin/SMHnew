<?php

namespace App\Models\Im;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class ItPlan extends Model
{
    protected $table = 'im_it_plans';

    protected $fillable = [
        'year', 'title', 'vision', 'status', 'created_by',
    ];

    protected $casts = [
        'year' => 'integer',
    ];

    public function mappings(): HasMany
    {
        return $this->hasMany(StrategicMapping::class, 'it_plan_id');
    }

    public function actionPlans(): HasMany
    {
        return $this->hasMany(ActionPlan::class, 'it_plan_id');
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(PlanAttachment::class, 'attachable')->latest();
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
