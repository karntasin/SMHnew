<?php

namespace App\Models\Rcm;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RcmClaimBatch extends Model
{
    protected $table = 'rcm_claim_batches';

    protected $fillable = [
        'batch_no',
        'claim_type',
        'scheme_code',
        'period_start',
        'period_end',
        'total_cases',
        'total_claim_amount',
        'total_approved_amount',
        'clean_claim_rate',
        'status',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'total_cases' => 'integer',
        'total_claim_amount' => 'decimal:2',
        'total_approved_amount' => 'decimal:2',
        'clean_claim_rate' => 'decimal:2',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(RcmClaimItem::class, 'batch_id');
    }
}
