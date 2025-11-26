<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HrdUserCompetency extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'competency_id',
        'level',
        'source',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function competency()
    {
        return $this->belongsTo(HrdCompetency::class);
    }
}
