<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdWorkEvaluationScore extends Model
{
    protected $fillable = [
        'evaluation_id', 'topic_id', 'topic_title', 'max_score', 'weight', 'score', 'note',
    ];

    protected $casts = [
        'weight' => 'float',
        'score' => 'float',
    ];

    public function evaluation()
    {
        return $this->belongsTo(HrdWorkEvaluation::class, 'evaluation_id');
    }

    public function topic()
    {
        return $this->belongsTo(HrdWorkTopic::class, 'topic_id');
    }
}
