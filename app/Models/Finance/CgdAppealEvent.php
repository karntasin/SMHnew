<?php

namespace App\Models\Finance;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CgdAppealEvent extends Model
{
    public const TYPE_DETECTED_SHORTFALL = 'detected_shortfall';

    public const TYPE_MARKED_SUBMITTED = 'marked_submitted';

    public const TYPE_APPEAL_IMPORTED = 'appeal_imported';

    public const TYPE_APPROVED = 'approved';

    public const TYPE_SETTLED = 'settled';

    public const TYPE_STILL_SHORT = 'still_short';

    public const TYPE_DENIED = 'denied';

    public const TYPE_PARTIAL = 'partial';

    public const TYPE_NO_PRIOR = 'no_prior_rep';

    protected $table = 'finance_cgd_appeal_events';

    protected $fillable = [
        'appeal_case_id',
        'event_type',
        'batch_id',
        'rep_no',
        'amount_approved_before',
        'amount_approved_after',
        'appeal_amount_before',
        'appeal_amount_after',
        'note',
        'created_by',
    ];

    protected $casts = [
        'amount_approved_before' => 'float',
        'amount_approved_after' => 'float',
        'appeal_amount_before' => 'float',
        'appeal_amount_after' => 'float',
    ];

    public function appealCase(): BelongsTo
    {
        return $this->belongsTo(CgdAppealCase::class, 'appeal_case_id');
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
