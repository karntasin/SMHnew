<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdOrientationClearance extends Model
{
    protected $fillable = ['user_id', 'cleared_by', 'cleared_at', 'notes'];

    protected $casts = [
        'cleared_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function clearer()
    {
        return $this->belongsTo(User::class, 'cleared_by');
    }
}
