<?php

namespace App\Models\Im;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetDisposal extends Model
{
    protected $table = 'im_asset_disposals';

    protected $fillable = [
        'asset_id',
        'disposal_no',
        'disposed_at',
        'method',
        'reason',
        'document_ref',
        'approved_by',
        'note',
    ];

    protected $casts = [
        'disposed_at' => 'date',
    ];

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class, 'asset_id');
    }
}
