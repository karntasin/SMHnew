<?php

namespace App\Models\Im;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Facades\Storage;

class PlanAttachment extends Model
{
    protected $table = 'im_plan_attachments';

    protected $fillable = [
        'original_name',
        'file_path',
        'mime_type',
        'size',
        'uploaded_by',
    ];

    protected $hidden = [
        'file_path',
        'original_name',
        'attachable_type',
        'attachable_id',
        'uploaded_by',
    ];

    protected $appends = [
        'name',
        'url',
        'size_label',
    ];

    protected $casts = [
        'size' => 'integer',
    ];

    protected static function booted(): void
    {
        static::deleting(function (self $attachment) {
            if ($attachment->file_path) {
                Storage::disk('public')->delete($attachment->file_path);
            }
        });
    }

    public function attachable(): MorphTo
    {
        return $this->morphTo();
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function getNameAttribute(): string
    {
        return (string) $this->original_name;
    }

    public function getUrlAttribute(): string
    {
        return asset('storage/'.$this->file_path);
    }

    public function getSizeLabelAttribute(): string
    {
        $bytes = (int) $this->size;
        if ($bytes < 1024) {
            return $bytes.' B';
        }
        if ($bytes < 1048576) {
            return round($bytes / 1024, 1).' KB';
        }

        return round($bytes / 1048576, 1).' MB';
    }
}
