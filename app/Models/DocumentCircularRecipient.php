<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentCircularRecipient extends Model
{
    protected $guarded = [];

    protected $casts = [
        'read_at' => 'datetime',
    ];

    public function document()
    {
        return $this->belongsTo(Document::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
