<?php

namespace App\Models\Im;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BcpDrill extends Model
{
    protected $table = 'im_bcp_drills';

    protected $fillable = [
        'system_name', 'type', 'scope', 'drill_date', 'duration_seconds',
        'rto_target_minutes', 'result', 'report', 'improvements', 'created_by',
    ];

    protected $casts = [
        'drill_date' => 'date',
        'duration_seconds' => 'integer',
        'rto_target_minutes' => 'integer',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
