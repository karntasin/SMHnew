<?php

namespace App\Models\Im;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AwarenessRecord extends Model
{
    protected $table = 'im_awareness_records';

    protected $fillable = [
        'staff_name', 'department', 'policy_id', 'score', 'max_score',
        'passed', 'tested_at',
    ];

    protected $casts = [
        'score' => 'integer',
        'max_score' => 'integer',
        'passed' => 'boolean',
        'tested_at' => 'date',
    ];

    public function policy(): BelongsTo
    {
        return $this->belongsTo(Policy::class, 'policy_id');
    }
}
