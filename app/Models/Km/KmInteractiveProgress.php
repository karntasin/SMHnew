<?php

namespace App\Models\Km;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KmInteractiveProgress extends Model
{
    use HasFactory;

    protected $table = 'km_interactive_progress';

    protected $fillable = [
        'user_id',
        'track',
        'completed_lessons',
        'current_lesson_id',
    ];

    protected $casts = [
        'completed_lessons' => 'array',
        'current_lesson_id' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
