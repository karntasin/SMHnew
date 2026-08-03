<?php

namespace App\Models\Finance;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CgdStmBatch extends Model
{
    protected $table = 'finance_cgd_stm_batches';

    protected $fillable = [
        'filename',
        'stored_path',
        'document_no',
        'hcode',
        'period_label',
        'channel',
        'row_count',
        'total_claim',
        'total_approved',
        'visit_date_min',
        'visit_date_max',
        'status',
        'notes',
        'imported_by',
    ];

    protected $casts = [
        'row_count' => 'integer',
        'total_claim' => 'float',
        'total_approved' => 'float',
        'visit_date_min' => 'date',
        'visit_date_max' => 'date',
    ];

    public function rows(): HasMany
    {
        return $this->hasMany(CgdStmRow::class, 'batch_id');
    }

    public function reconciliations(): HasMany
    {
        return $this->hasMany(CgdReconciliation::class, 'batch_id');
    }

    public function importer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'imported_by');
    }
}
