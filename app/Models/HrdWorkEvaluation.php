<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdWorkEvaluation extends Model
{
    public const PERIODS = [3, 6, 12];

    protected $fillable = [
        'user_id', 'staff_name', 'evaluator_id', 'evaluator_name',
        'period_months', 'period_start', 'period_end', 'evaluated_at', 'next_due_at',
        'total_score', 'max_total_score', 'percent_score', 'overall_comment',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'evaluated_at' => 'date',
        'next_due_at' => 'date',
        'total_score' => 'float',
        'max_total_score' => 'float',
        'percent_score' => 'float',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function evaluator()
    {
        return $this->belongsTo(User::class, 'evaluator_id');
    }

    public function scores()
    {
        return $this->hasMany(HrdWorkEvaluationScore::class, 'evaluation_id');
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
