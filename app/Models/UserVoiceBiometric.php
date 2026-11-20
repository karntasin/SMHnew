<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserVoiceBiometric extends Model
{
    use HasFactory;

    protected $connection = 'mysql';
    protected $table = 'user_voice_biometrics';

    protected $fillable = [
        'user_id',
        'embedding_vector',
        'sample_count',
        'similarity_baseline',
        'is_active',
        'last_authenticated_at',
    ];

    protected $casts = [
        'embedding_vector' => 'array',
        'sample_count' => 'integer',
        'similarity_baseline' => 'float',
        'is_active' => 'boolean',
        'last_authenticated_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
