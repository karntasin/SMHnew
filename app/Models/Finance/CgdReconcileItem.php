<?php

namespace App\Models\Finance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CgdReconcileItem extends Model
{
    protected $table = 'finance_cgd_reconcile_items';

    protected $fillable = [
        'reconciliation_id',
        'status',
        'hn',
        'pid',
        'seq_no',
        'match_key',
        'patient_name',
        'visit_date',
        'department',
        'pttype',
        'pttype_code',
        'hipdata_code',
        'hosxp_drug',
        'hosxp_organ',
        'hosxp_service',
        'hosxp_total',
        'hosxp_paid',
        'hosxp_debt',
        'stm_claim',
        'stm_approved',
        'stm_drug',
        'stm_organ',
        'stm_treat',
        'rep_no',
        'diff_claim',
        'diff_approved',
        'shortfall',
    ];

    protected $casts = [
        'visit_date' => 'date',
        'hosxp_drug' => 'float',
        'hosxp_organ' => 'float',
        'hosxp_service' => 'float',
        'hosxp_total' => 'float',
        'hosxp_paid' => 'float',
        'hosxp_debt' => 'float',
        'stm_claim' => 'float',
        'stm_approved' => 'float',
        'stm_drug' => 'float',
        'stm_organ' => 'float',
        'stm_treat' => 'float',
        'diff_claim' => 'float',
        'diff_approved' => 'float',
        'shortfall' => 'float',
    ];

    public function reconciliation(): BelongsTo
    {
        return $this->belongsTo(CgdReconciliation::class, 'reconciliation_id');
    }
}
