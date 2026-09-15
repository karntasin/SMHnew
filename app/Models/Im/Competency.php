<?php

namespace App\Models\Im;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Competency extends Model
{
    protected $table = 'im_competencies';

    protected $fillable = [
        'user_id', 'staff_name', 'competency', 'required_level', 'actual_level',
        'gap', 'idp', 'assessed_at',
    ];

    protected $casts = [
        'required_level' => 'integer',
        'actual_level' => 'integer',
        'gap' => 'integer',
        'assessed_at' => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
