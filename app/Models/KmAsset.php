<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KmAsset extends Model
{
    protected $fillable = [
        'title', 'description', 'file_path', 'file_type', 
        'category', 'tags', 'uploaded_by', 'downloads', 'views', 'is_public'
    ];

    protected $casts = [
        'tags' => 'array',
        'is_public' => 'boolean',
    ];

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
