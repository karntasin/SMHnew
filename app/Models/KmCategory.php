<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KmCategory extends Model
{
    protected $fillable = ['name', 'type', 'parent_id'];

    public function documents()
    {
        return $this->hasMany(KmDocument::class, 'category_id');
    }

    public function posts()
    {
        return $this->hasMany(KmPost::class, 'category_id');
    }

    public function children()
    {
        return $this->hasMany(KmCategory::class, 'parent_id');
    }

    public function parent()
    {
        return $this->belongsTo(KmCategory::class, 'parent_id');
    }
}
