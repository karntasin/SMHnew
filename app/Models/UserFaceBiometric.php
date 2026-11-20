<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserFaceBiometric extends Model
{
    use HasFactory;

    protected $connection = 'mysql';
    protected $table = 'user_face_biometrics';

    protected $fillable = [
        'user_id',
        'auth_mode',
        'credential_id',
        'public_key',
        'device_name',
        'embedding_vector',
        'sample_count',
        'similarity_baseline',
        'face_image_path',
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
