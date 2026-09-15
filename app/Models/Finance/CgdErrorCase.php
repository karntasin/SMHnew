<?php

namespace App\Models\Finance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CgdErrorCase extends Model
{
    public const STATUS_OPEN = 'open';

    public const STATUS_FIXED = 'fixed';

    public const STATUS_STILL_OPEN = 'still_open';

    protected $table = 'finance_cgd_error_cases';

    protected $fillable = [
        'match_key',
        'hn',
        'pid',
        'seq_no',
        'patient_name',
        'rep_no',
        'claim_submission_no',
        'original_batch_id',
        'original_error_code',
        'original_amount_claim',
        'original_amount_approved',
        'current_status',
        'current_error_code',
        'current_amount_approved',
        'latest_batch_id',
        'appeal_count',
        'first_seen_at',
        'last_updated_at',
    ];

    protected $casts = [
        'original_amount_claim' => 'float',
        'original_amount_approved' => 'float',
        'current_amount_approved' => 'float',
        'appeal_count' => 'integer',
        'first_seen_at' => 'datetime',
        'last_updated_at' => 'datetime',
    ];

    public function events(): HasMany
    {
        return $this->hasMany(CgdErrorEvent::class, 'error_case_id')->orderByDesc('id');
    }

    public function originalBatch(): BelongsTo
    {
        return $this->belongsTo(CgdStmBatch::class, 'original_batch_id');
    }

    public function latestBatch(): BelongsTo
    {
        return $this->belongsTo(CgdStmBatch::class, 'latest_batch_id');
    }
}
