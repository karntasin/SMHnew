<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TeamHa extends Model
{
    protected $table = 'teamha';

    protected $fillable = [
        'abbreviation',
        'name_th',
        'name_en',
    ];

    public function members(): HasMany
    {
        return $this->hasMany(TeamHaMember::class, 'teamha_id')
            ->orderByRaw("FIELD(role, 'chair', 'vice_chair', 'committee', 'secretary', 'assistant_secretary')")
            ->orderBy('sort_order')
            ->orderBy('name');
    }
}
