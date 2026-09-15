<?php

namespace App\Models\Im;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffEvaluationScore extends Model
{
    protected $table = 'im_staff_evaluation_scores';

    protected $fillable = [
        'evaluation_id',
        'topic_id',
        'topic_title',
        'max_score',
        'weight',
        'score',
        'note',
    ];

    protected $casts = [
        'max_score' => 'integer',
        'weight' => 'float',
        'score' => 'float',
    ];

    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(StaffEvaluation::class, 'evaluation_id');
    }

    public function topic(): BelongsTo
    {
        return $this->belongsTo(EvaluationTopic::class, 'topic_id');
    }
}
