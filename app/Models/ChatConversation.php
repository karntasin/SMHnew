<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChatConversation extends Model
{
    protected $fillable = [
        'user1_id',
        'user2_id',
    ];

    public function user1(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user1_id');
    }

    public function user2(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user2_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class, 'conversation_id');
    }

    public function involvesUser(int $userId): bool
    {
        return $this->user1_id === $userId || $this->user2_id === $userId;
    }

    public function otherUserId(int $userId): int
    {
        return $this->user1_id === $userId ? $this->user2_id : $this->user1_id;
    }
}
