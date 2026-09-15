<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EnvAssetLine extends Model
{
    protected $fillable = [
        'code',
        'name',
        'short_name',
        'source_filename',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function assets(): HasMany
    {
        return $this->hasMany(EnvAsset::class, 'line_id');
    }
}
