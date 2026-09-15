<?php

namespace App\Models\Im;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Policy extends Model
{
    protected $table = 'im_policies';

    protected $fillable = [
        'title', 'type', 'version', 'summary', 'file_path',
        'effective_date', 'status', 'created_by',
    ];

    protected $casts = [
        'effective_date' => 'date',
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
