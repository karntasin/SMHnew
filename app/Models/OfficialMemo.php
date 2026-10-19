<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OfficialMemo extends Model
{
    protected $fillable = [
        'user_id',
        'kind',
        'subject',
        'document_no',
        'document_date',
        'thai_digits',
        'sections',
    ];

    protected $casts = [
        'document_date' => 'date',
        'thai_digits' => 'boolean',
        'sections' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
