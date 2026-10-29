<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SarPart extends Model
{
    protected $connection = 'mysql';
    protected $table = 'sar_parts';

    protected $fillable = [
        'sar_cycle_id',
        'part_number',
        'part_name',
        'description',
        'order',
    ];

    public function cycle(): BelongsTo
    {
        return $this->belongsTo(SarCycle::class, 'sar_cycle_id');
    }

    public function sections(): HasMany
    {
        return $this->hasMany(SarSection::class, 'sar_part_id')->orderBy('order');
    }
}
