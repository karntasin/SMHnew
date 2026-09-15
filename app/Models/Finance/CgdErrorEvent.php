<?php

namespace App\Models\Finance;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CgdErrorEvent extends Model
{
    public const TYPE_DETECTED = 'detected';

    public const TYPE_UPDATED_FROM_REP = 'updated_from_rep';

    public const TYPE_FIXED = 'fixed';

    public const TYPE_STILL_ERROR = 'still_error';

    protected $table = 'finance_cgd_error_events';

    protected $fillable = [
        'error_case_id',
        'event_type',
        'batch_id',
        'error_code_before',
        'error_code_after',
        'amount_approved_before',
        'amount_approved_after',
        'note',
        'created_by',
    ];

    protected $casts = [
        'amount_approved_before' => 'float',
        'amount_approved_after' => 'float',
    ];

    public function errorCase(): BelongsTo
    {
        return $this->belongsTo(CgdErrorCase::class, 'error_case_id');
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(CgdStmBatch::class, 'batch_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
