<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class QualityDocument extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'title',
        'document_number',
        'description',
        'category',
        'document_type',
        'department_id',
        'status',
        'current_version',
        'file_path',
        'owner_id',
        'effective_date',
        'review_date',
    ];

    protected $casts = [
        'effective_date' => 'date',
        'review_date' => 'date',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function versions()
    {
        return $this->hasMany(QualityDocumentVersion::class);
    }
}
