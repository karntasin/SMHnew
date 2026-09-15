<?php

namespace App\Models\Im;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StaffEvaluation extends Model
{
    public const PERIODS = [3, 6, 12];

    protected $table = 'im_staff_evaluations';

    protected $fillable = [
        'user_id',
        'staff_name',
        'evaluator_id',
        'evaluator_name',
        'period_months',
        'period_start',
        'period_end',
        'evaluated_at',
        'next_due_at',
        'total_score',
        'max_total_score',
        'percent_score',
        'overall_comment',
        'status',
    ];

    protected $casts = [
        'period_months' => 'integer',
        'period_start' => 'date',
        'period_end' => 'date',
        'evaluated_at' => 'date',
        'next_due_at' => 'date',
        'total_score' => 'float',
        'max_total_score' => 'float',
        'percent_score' => 'float',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function evaluator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluator_id');
    }

    public function scores(): HasMany
    {
        return $this->hasMany(StaffEvaluationScore::class, 'evaluation_id');
    }

    public static function periodLabel(int $months): string
    {
        return match ($months) {
            3 => 'ทุก 3 เดือน',
            6 => 'ทุก 6 เดือน',
            12 => 'ทุก 12 เดือน',
            default => "ทุก {$months} เดือน",
        };
    }
}
