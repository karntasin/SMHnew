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
        'owner_department',
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

    public function attachments()
    {
        return $this->hasMany(QualityDocumentAttachment::class);
    }

    /**
     * Check if user has permission to configure quality document categories/settings
     * Allowed roles: admin, superuser, header, boss
     */
    public static function canManageSettings(?User $user): bool
    {
        if (!$user) {
            return false;
        }

        return $user->hasAnyRole([
            'admin', 'Admin', 'Super Admin', 'ผู้ดูแลระบบ',
            'superuser', 'superUser', 'SuperUser',
            'header', 'Header',
            'boss', 'Boss'
        ]);
    }

    /**
     * Check if user has permission to approve quality documents
     */
    public static function canApprove(?User $user): bool
    {
        if (!$user) {
            return false;
        }

        return self::canManageSettings($user) || $user->can('approve quality documents');
    }
}
