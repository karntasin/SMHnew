<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QualityDocumentVersion extends Model
{
    use HasFactory;

    protected $fillable = [
        'quality_document_id',
        'version_number',
        'file_path',
        'changes_description',
        'uploaded_by',
    ];

    protected $appends = [
        'url',
        'file_extension',
    ];

    public function getUrlAttribute(): ?string
    {
        return $this->file_path ? asset('storage/' . ltrim($this->file_path, '/')) : null;
    }

    public function getFileExtensionAttribute(): string
    {
        return strtolower(pathinfo($this->file_path ?? '', PATHINFO_EXTENSION));
    }

    public function document()
    {
        return $this->belongsTo(QualityDocument::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
