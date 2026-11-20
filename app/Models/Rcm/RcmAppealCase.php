<?php

namespace App\Models\Rcm;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RcmAppealCase extends Model
{
    protected $table = 'rcm_appeal_cases';

    protected $fillable = [
        'claim_item_id',
        'denial_code',
        'denial_detail',
        'shortfall_amount',
        'appeal_status',
        'appeal_reason',
        'recovered_amount',
        'submitted_at',
        'resolved_at',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'shortfall_amount' => 'decimal:2',
        'recovered_amount' => 'decimal:2',
        'submitted_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    public function claimItem(): BelongsTo
    {
        return $this->belongsTo(RcmClaimItem::class, 'claim_item_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
