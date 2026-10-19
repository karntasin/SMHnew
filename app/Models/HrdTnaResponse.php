<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdTnaResponse extends Model
{
    protected $fillable = ['user_id', 'fiscal_year', 'topic', 'reason', 'note'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
