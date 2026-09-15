<?php

namespace App\Models\Im;

use Illuminate\Database\Eloquent\Model;

class CodeReview extends Model
{
    protected $table = 'im_code_reviews';

    protected $fillable = [
        'project', 'repo_url', 'reviewer', 'is_external', 'comment_score',
        'findings', 'recommendation', 'reviewed_at',
    ];

    protected $casts = [
        'is_external' => 'boolean',
        'comment_score' => 'float',
        'reviewed_at' => 'date',
    ];
}
