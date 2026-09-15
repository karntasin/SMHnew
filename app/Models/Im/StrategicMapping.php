<?php

namespace App\Models\Im;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StrategicMapping extends Model
{
    protected $table = 'im_strategic_mappings';

    protected $fillable = [
        'it_plan_id', 'hospital_strategy', 'it_strategy', 'success_factor',
        'analysis_accuracy', 'note',
    ];

    protected $casts = [
        'analysis_accuracy' => 'float',
    ];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(ItPlan::class, 'it_plan_id');
    }
}
