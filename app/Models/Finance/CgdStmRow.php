<?php

namespace App\Models\Finance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CgdStmRow extends Model
{
    protected $table = 'finance_cgd_stm_rows';

    protected $fillable = [
        'batch_id',
        'rep_no',
        'row_no',
        'hn',
        'an',
        'pid',
        'patient_name',
        'visit_at',
        'visit_date',
        'discharge_at',
        'projcode',
        'adj_rw',
        'amount_claim',
        'amount_act',
        'amount_room',
        'amount_organ',
        'amount_drug',
        'amount_treat',
        'amount_transport',
        'amount_wait',
        'amount_other',
        'amount_approved',
        'seq_no',
        'match_key',
    ];

    protected $casts = [
        'visit_at' => 'datetime',
        'visit_date' => 'date',
        'discharge_at' => 'datetime',
        'adj_rw' => 'float',
        'amount_claim' => 'float',
        'amount_act' => 'float',
        'amount_room' => 'float',
        'amount_organ' => 'float',
        'amount_drug' => 'float',
        'amount_treat' => 'float',
        'amount_transport' => 'float',
        'amount_wait' => 'float',
        'amount_other' => 'float',
        'amount_approved' => 'float',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(CgdStmBatch::class, 'batch_id');
    }
}
