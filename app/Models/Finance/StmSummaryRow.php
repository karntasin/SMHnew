<?php

namespace App\Models\Finance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StmSummaryRow extends Model
{
    protected $table = 'finance_stm_summary_rows';

    protected $fillable = [
        'import_id',
        'claim_submission_no',
        'sheet_name',
        'period',
        'hcode',
        'rep_no',
        'count_total',
        'count_pass',
        'count_fail',
        'amount_claim',
        'amount_act',
        'amount_room',
        'amount_organ',
        'amount_drug',
        'amount_treat',
        'amount_transport',
        'amount_wait',
        'amount_other',
        'amount_paid_total',
    ];

    protected $casts = [
        'count_total' => 'integer',
        'count_pass' => 'integer',
        'count_fail' => 'integer',
        'amount_claim' => 'float',
        'amount_act' => 'float',
        'amount_room' => 'float',
        'amount_organ' => 'float',
        'amount_drug' => 'float',
        'amount_treat' => 'float',
        'amount_transport' => 'float',
        'amount_wait' => 'float',
        'amount_other' => 'float',
        'amount_paid_total' => 'float',
    ];

    public function import(): BelongsTo
    {
        return $this->belongsTo(StmImport::class, 'import_id');
    }
}
