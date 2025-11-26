<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KmReadReceipt extends Model
{
    protected $fillable = ['document_id', 'user_id', 'read_at'];

    protected $casts = [
        'read_at' => 'datetime',
    ];
}
