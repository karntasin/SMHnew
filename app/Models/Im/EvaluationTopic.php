<?php

namespace App\Models\Im;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EvaluationTopic extends Model
{
    protected $table = 'im_evaluation_topics';

    protected $fillable = [
        'code',
        'parent_id',
        'is_group',
        'title',
        'description',
        'max_score',
        'weight',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'parent_id' => 'integer',
        'is_group' => 'boolean',
        'max_score' => 'integer',
        'weight' => 'float',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('sort_order')->orderBy('id');
    }

    public function scores(): HasMany
    {
        return $this->hasMany(StaffEvaluationScore::class, 'topic_id');
    }

    public function scopeGroups($query)
    {
        return $query->where('is_group', true)->whereNull('parent_id');
    }

    public function scopeLeaves($query)
    {
        return $query->where('is_group', false);
    }
}
