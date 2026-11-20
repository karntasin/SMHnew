<?php

namespace App\Models\Rcm;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class RcmClaimItem extends Model
{
    protected $table = 'rcm_claim_items';

    protected $fillable = [
        'batch_id',
        'claim_type',
        'scheme_code',
        'vn',
        'an',
        'hn',
        'pid',
        'patient_name',
        'service_date',
        'pttype',
        'pttype_name',
        'total_amount',
        'claim_amount',
        'approved_amount',
        'shortfall_amount',
        'drg',
        'adj_rw',
        'auth_code',
        'project_code',
        'audit_status',
        'audit_findings',
        'reconcile_status',
        'denial_code',
        'denial_description',
    ];

    protected $casts = [
        'service_date' => 'date',
        'total_amount' => 'decimal:2',
        'claim_amount' => 'decimal:2',
        'approved_amount' => 'decimal:2',
        'shortfall_amount' => 'decimal:2',
        'adj_rw' => 'decimal:4',
        'audit_findings' => 'array',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(RcmClaimBatch::class, 'batch_id');
    }

    public function appealCase(): HasOne
    {
        return $this->hasOne(RcmAppealCase::class, 'claim_item_id');
    }
}
