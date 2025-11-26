<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KmPost extends Model
{
    protected $fillable = [
        'title',
        'content',
        'type',
        'category_id',
        'user_id',
        'views'
    ];

    // content might be JSON for forms, but let's keep it flexible. 
    // If it's just text, no cast needed. If JSON, use array.
    // For now, let's assume it can be mixed or handled in controller.
    
    public function category()
    {
        return $this->belongsTo(KmCategory::class);
    }

    public function author()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function comments()
    {
        return $this->hasMany(KmComment::class, 'post_id');
    }

    public function ratings()
    {
        return $this->morphMany(KmRating::class, 'rateable');
    }
}
