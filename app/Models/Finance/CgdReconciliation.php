<?php

namespace App\Models\Finance;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CgdReconciliation extends Model
{
    protected $table = 'finance_cgd_reconciliations';

    protected $fillable = [
        'batch_id',
        'start_date',
        'end_date',
        'pttype_like',
        'exclude_deps',
        'hosxp_count',
        'stm_count',
        'matched_ok',
        'matched_short',
        'matched_over',
        'only_hosxp',
        'only_stm',
        'stm_out_of_range',
        'total_hosxp',
        'total_stm_claim',
        'total_stm_approved',
        'total_shortfall',
        'total_claim_diff',
        'created_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'hosxp_count' => 'integer',
        'stm_count' => 'integer',
        'matched_ok' => 'integer',
        'matched_short' => 'integer',
        'matched_over' => 'integer',
        'only_hosxp' => 'integer',
        'only_stm' => 'integer',
        'stm_out_of_range' => 'integer',
        'total_hosxp' => 'float',
        'total_stm_claim' => 'float',
        'total_stm_approved' => 'float',
        'total_shortfall' => 'float',
        'total_claim_diff' => 'float',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(CgdStmBatch::class, 'batch_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(CgdReconcileItem::class, 'reconciliation_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
