<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RduCaseAudit extends Model
{
    protected $fillable = [
        'indicator_id',
        'vn',
        'hn',
        'vstdate',
        'status',
        'notes',
        'reviewed_by',
        'reviewed_at',
        'snapshot',
    ];

    protected $casts = [
        'vstdate' => 'date',
        'reviewed_at' => 'datetime',
        'snapshot' => 'array',
    ];

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
