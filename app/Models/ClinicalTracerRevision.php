<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClinicalTracerRevision extends Model
{
    public $timestamps = false;
    protected $connection = 'mysql';
    protected $table = 'clinical_tracer_revisions';

    protected $fillable = [
        'clinical_tracer_id',
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

    public function tracer(): BelongsTo
    {
        return $this->belongsTo(ClinicalTracer::class, 'clinical_tracer_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
