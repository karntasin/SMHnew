<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QualityIndicatorImportLog extends Model
{
    protected $fillable = [
        'user_id',
        'type',
        'department_id',
        'team_id',
        'original_filename',
        'status',
        'indicators_create',
        'indicators_update',
        'entries_create',
        'entries_update',
        'row_errors',
        'summary',
        'payload',
        'error_message',
        'confirmed_at',
    ];

    protected $casts = [
        'summary' => 'array',
        'payload' => 'array',
        'confirmed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(TeamHa::class, 'team_id');
    }
}
