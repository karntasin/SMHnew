<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceProfileRevision extends Model
{
    protected $connection = 'mysql';
    protected $table = 'service_profile_revisions';
    public $timestamps = false;

    protected $fillable = [
        'service_profile_id',
        'version_number',
        'change_summary',
        'snapshot_data',
        'created_by',
        'created_at',
    ];

    protected $casts = [
        'snapshot_data' => 'array',
        'version_number' => 'integer',
        'created_at' => 'datetime',
    ];

    public function serviceProfile(): BelongsTo
    {
        return $this->belongsTo(ServiceProfile::class, 'service_profile_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
