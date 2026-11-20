<?php

namespace App\Models\Rcm;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RcmFilePatchItem extends Model
{
    protected $table = 'rcm_file_patch_items';

    protected $fillable = [
        'batch_id',
        'file_name',
        'line_number',
        'hn',
        'an',
        'dateopd',
        'type',
        'code',
        'qty',
        'rate',
        'seq',
        'total',
        'old_use_status',
        'new_use_status',
        'raw_line_before',
    ];

    protected $casts = [
        'qty' => 'decimal:2',
        'rate' => 'decimal:2',
        'total' => 'decimal:2',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(RcmFilePatchBatch::class, 'batch_id');
    }
}
