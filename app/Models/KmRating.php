<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KmRating extends Model
{
    protected $fillable = ['rateable_type', 'rateable_id', 'user_id', 'rating', 'comment'];

    public function rateable()
    {
        return $this->morphTo();
    }
    
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
