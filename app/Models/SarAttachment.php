<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SarAttachment extends Model
{
    protected $connection = 'mysql';
    protected $table = 'sar_attachments';

    protected $fillable = [
        'sar_section_id',
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

    public function section(): BelongsTo
    {
        return $this->belongsTo(SarSection::class, 'sar_section_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
