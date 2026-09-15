<?php

namespace App\Models\Im;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SdlcDocument extends Model
{
    protected $table = 'im_sdlc_documents';

    protected $fillable = [
        'project', 'doc_type', 'title', 'version', 'file_path', 'repo_url', 'note', 'created_by',
    ];

    protected $appends = ['file_url'];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getFileUrlAttribute(): ?string
    {
        return $this->file_path ? asset('storage/'.$this->file_path) : null;
    }
}
