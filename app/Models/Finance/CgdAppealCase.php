<?php

namespace App\Models\Finance;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CgdAppealCase extends Model
{
    /** รออุทธรณ์ — จาก STM ที่เรียกเก็บ ≠ พึงรับ ยังไม่มีผล APPEAL */
    public const STATUS_ELIGIBLE = 'eligible';

    public const STATUS_SUBMITTED = 'submitted';

    /** อุทธรณ์สำเร็จ — จากไฟล์ APPEAL (REP สูงสุดของ SEQ เป็นรายการปัจจุบัน) */
    public const STATUS_APPROVED = 'approved';

    /** ได้รับเงินแล้ว — STM หลัง APPEAL · พึงรับทั้งหมด หัก ยังขาดเงิน = 0 */
    public const STATUS_SETTLED = 'settled';

    /** ยังขาดเงิน — STM หลัง APPEAL แล้ว แต่พึงรับทั้งหมดยังไม่ครบยอดขาด */
    public const STATUS_STILL_SHORT = 'still_short';

    /** @deprecated ไม่ใช้ใน flow ใหม่ — คงไว้สำหรับข้อมูลเก่า */
    public const STATUS_DENIED = 'denied';

    /** @deprecated ใช้ denied แทน */
    public const STATUS_PARTIAL = 'partial';

    /**
     * @deprecated ไม่ใช้ใน flow ใหม่ — คงไว้สำหรับข้อมูลเก่า
     */
    public const STATUS_NO_PRIOR = 'no_prior_rep';

    protected $table = 'finance_cgd_appeal_cases';

    protected $fillable = [
        'scheme',
        'match_key',
        'hn',
        'pid',
        'seq_no',
        'patient_name',
        'rep_no',
        'claim_submission_no',
        'original_batch_id',
        'original_amount_claim',
        'original_amount_approved',
        'original_shortfall',
        'current_status',
        'appeal_amount_requested',
        'appeal_amount_approved',
        'current_amount_approved',
        'latest_appeal_batch_id',
        'appeal_count',
        'first_seen_at',
        'last_updated_at',
    ];

    protected $casts = [
        'original_amount_claim' => 'float',
        'original_amount_approved' => 'float',
        'original_shortfall' => 'float',
        'appeal_amount_requested' => 'float',
        'appeal_amount_approved' => 'float',
        'current_amount_approved' => 'float',
        'appeal_count' => 'integer',
        'first_seen_at' => 'datetime',
        'last_updated_at' => 'datetime',
    ];

    public function events(): HasMany
    {
        return $this->hasMany(CgdAppealEvent::class, 'appeal_case_id')->orderByDesc('id');
    }

    public function originalBatch(): BelongsTo
    {
        return $this->belongsTo(CgdStmBatch::class, 'original_batch_id');
    }

    public function latestAppealBatch(): BelongsTo
    {
        return $this->belongsTo(CgdStmBatch::class, 'latest_appeal_batch_id');
    }
}
