<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrdWorkTopic extends Model
{
    protected $fillable = [
        'parent_id', 'title', 'description', 'rubric', 'is_group', 'max_score',
        'weight', 'sort_order', 'is_active',
    ];

    protected $casts = [
        'is_group' => 'boolean',
        'is_active' => 'boolean',
        'weight' => 'float',
        'rubric' => 'array',
    ];

    public function parent()
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('sort_order');
    }
}
