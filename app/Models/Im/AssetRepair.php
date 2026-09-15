<?php

namespace App\Models\Im;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetRepair extends Model
{
    protected $table = 'im_asset_repairs';

    protected $fillable = [
        'asset_id',
        'repair_no',
        'reported_at',
        'symptom',
        'vendor',
        'cost',
        'returned_at',
        'result',
        'reported_by',
        'handled_by',
        'status',
        'note',
    ];

    protected $casts = [
        'reported_at' => 'date',
        'returned_at' => 'date',
        'cost' => 'float',
    ];

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class, 'asset_id');
    }
}
