<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class QualityDocumentAttachment extends Model
{
    use HasFactory;

    protected $table = 'quality_document_attachments';
    protected $connection = 'mysql';

    protected $fillable = [
        'quality_document_id',
        'quality_document_version_id',
        'file_name',
        'original_name',
        'file_path',
        'file_size',
        'mime_type',
        'file_extension',
        'uploaded_by',
    ];

    protected $casts = [
        'file_size' => 'integer',
    ];

    protected $appends = [
        'url',
        'formatted_size',
        'icon_type',
    ];

    public function document(): BelongsTo
    {
        return $this->belongsTo(QualityDocument::class, 'quality_document_id');
    }

    public function version(): BelongsTo
    {
        return $this->belongsTo(QualityDocumentVersion::class, 'quality_document_version_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function getUrlAttribute(): string
    {
        return asset('storage/' . ltrim($this->file_path, '/'));
    }

    public function getFormattedSizeAttribute(): string
    {
        $bytes = $this->file_size;
        if ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        }
        if ($bytes >= 1024) {
            return number_format($bytes / 1024, 1) . ' KB';
        }
        return $bytes . ' B';
    }

    public function getIconTypeAttribute(): string
    {
        $ext = strtolower((string)$this->file_extension);
        return match ($ext) {
            'pdf' => 'pdf',
            'doc', 'docx', 'rtf' => 'word',
            'xls', 'xlsx', 'csv' => 'excel',
            'ppt', 'pptx' => 'powerpoint',
            'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg' => 'image',
            'zip', 'rar', '7z', 'tar', 'gz' => 'archive',
            'txt' => 'text',
            default => 'file',
        };
    }
}
