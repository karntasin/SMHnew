<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HosxpReportPreset extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'report_id',
        'params',
        'is_shared',
    ];

    protected $casts = [
        'params' => 'array',
        'is_shared' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
