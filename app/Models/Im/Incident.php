<?php

namespace App\Models\Im;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Incident extends Model
{
    protected $table = 'im_incidents';

    protected $fillable = [
        'incident_no', 'title', 'hait_category', 'occurred_at', 'downtime_minutes',
        'severity', 'impact', 'root_cause', 'problem_action', 'status', 'created_by',
    ];

    protected $casts = [
        'occurred_at' => 'datetime',
        'downtime_minutes' => 'integer',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
