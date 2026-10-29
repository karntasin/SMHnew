<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClinicalTracerAttachment extends Model
{
    protected $connection = 'mysql';
    protected $table = 'clinical_tracer_attachments';

    protected $fillable = [
        'clinical_tracer_id',
        'file_name',
        'file_path',
        'file_size',
        'mime_type',
        'description',
        'uploaded_by',
    ];

    protected $casts = [
        'file_size' => 'integer',
    ];

    public function tracer(): BelongsTo
    {
        return $this->belongsTo(ClinicalTracer::class, 'clinical_tracer_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
