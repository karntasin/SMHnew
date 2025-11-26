<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KmComment extends Model
{
    protected $fillable = ['post_id', 'user_id', 'content', 'parent_id'];

    public function post()
    {
        return $this->belongsTo(KmPost::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
