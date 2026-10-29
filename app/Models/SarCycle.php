<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SarCycle extends Model
{
    protected $connection = 'mysql';
    protected $table = 'sar_cycles';

    protected $fillable = [
        'year',
        'title',
        'hospital_name',
        'bed_count',
        'status',
        'is_current',
        'created_by',
    ];

    protected $casts = [
        'is_current' => 'boolean',
    ];

    public function parts(): HasMany
    {
        return $this->hasMany(SarPart::class, 'sar_cycle_id')->orderBy('order');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
