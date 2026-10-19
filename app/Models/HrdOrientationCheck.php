<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdOrientationCheck extends Model
{
    protected $fillable = ['user_id', 'item_id', 'checked_by', 'checked_at'];

    protected $casts = [
        'checked_at' => 'datetime',
    ];

    public function item()
    {
        return $this->belongsTo(HrdOrientationItem::class, 'item_id');
    }

    public function checker()
    {
        return $this->belongsTo(User::class, 'checked_by');
    }
}
