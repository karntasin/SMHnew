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

    public function document()
    {
        return $this->belongsTo(QualityDocument::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
