<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnvAssetStatusLog extends Model
{
    protected $table = 'env_asset_status_logs';

    protected $fillable = [
        'asset_id',
        'from_registry_status',
        'to_registry_status',
        'from_status',
        'to_status',
        'event_date',
        'repair_slip_no',
        'repair_job_no',
        'inspection_doc',
        'disposal_doc',
        'writeoff_doc',
        'scrap_return_doc',
        'note',
        'payload',
        'changed_by',
    ];

    protected $casts = [
        'event_date' => 'date',
        'payload' => 'array',
    ];

    public function asset(): BelongsTo
    {
        return $this->belongsTo(EnvAsset::class, 'asset_id');
    }

    public function changer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
