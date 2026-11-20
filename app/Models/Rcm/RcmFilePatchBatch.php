<?php

namespace App\Models\Rcm;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RcmFilePatchBatch extends Model
{
    protected $table = 'rcm_file_patch_batches';

    protected $fillable = [
        'batch_name',
        'folder_path',
        'target_file',
        'total_files_modified',
        'total_records_scanned',
        'total_records_modified',
        'backup_path',
        'status',
        'created_by',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(RcmFilePatchItem::class, 'batch_id');
    }
}
