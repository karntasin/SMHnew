<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnvPmStandardPart extends Model
{
    protected $fillable = [
        'standard_id',
        'spare_part_id',
        'qty_required',
    ];

    protected $casts = [
        'qty_required' => 'float',
    ];

    public function standard(): BelongsTo
    {
        return $this->belongsTo(EnvPmStandard::class, 'standard_id');
    }

    public function sparePart(): BelongsTo
    {
        return $this->belongsTo(EnvSparePart::class, 'spare_part_id');
    }
}
