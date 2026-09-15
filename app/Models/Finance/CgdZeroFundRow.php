<?php

namespace App\Models\Finance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CgdZeroFundRow extends Model
{
    protected $table = 'finance_cgd_zero_fund_rows';

    protected $fillable = [
        'batch_id',
        'row_no',
        'tran_id',
        'hcode',
        'hn',
        'an',
        'visit_date',
        'pid',
        'patient_name',
        'fund_code',
        'claim_code',
        'tmt',
        'expense_category',
        'qty_requested',
        'qty_paid',
        'amount_paid',
        'remark',
    ];

    protected $casts = [
        'visit_date' => 'date',
        'qty_requested' => 'float',
        'qty_paid' => 'float',
        'amount_paid' => 'float',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(CgdStmBatch::class, 'batch_id');
    }
}
