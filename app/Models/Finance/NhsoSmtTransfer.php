<?php

namespace App\Models\Finance;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NhsoSmtTransfer extends Model
{
    use HasFactory;

    protected $table = 'finance_nhso_smt_transfers';

    protected $fillable = [
        'budget_source',
        'is_ckd',
        'budget_year',
        'batch_no',
        'posting_date',
        'transfer_date',
        'ref_doc_no',
        'hcode',
        'vendor_no',
        'fund_name',
        'fund_group_descr',
        'fund_descr',
        'mou_grp_code',
        'bank_name',
        'bank_account_no',
        'pmnt_stts',
        'amount',
        'total',
        'moph_id',
        'moph_desc',
        'raw_data',
        'pdf_path',
        'pdf_filename',
        'pdf_downloaded_at',
        'synced_by',
        'synced_at',
    ];

    protected $casts = [
        'is_ckd' => 'boolean',
        'amount' => 'decimal:2',
        'total' => 'decimal:2',
        'transfer_date' => 'date:Y-m-d',
        'raw_data' => 'array',
        'pdf_downloaded_at' => 'datetime',
        'synced_at' => 'datetime',
    ];

    public function hasPdf(): bool
    {
        return ! empty($this->pdf_path) && \Illuminate\Support\Facades\Storage::disk('local')->exists($this->pdf_path);
    }

    public function syncer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'synced_by');
    }

    public function scopeForSource(Builder $query, ?string $source): Builder
    {
        if (blank($source) || $source === 'all') {
            return $query;
        }

        if (strtoupper($source) === 'CKD') {
            return $query->where('is_ckd', true);
        }

        if (strtoupper($source) === 'UC') {
            // UC ไม่รวมไตวายเรื้อรัง
            return $query->where('budget_source', 'UC')->where('is_ckd', false);
        }

        if (in_array(strtoupper($source), ['LGO_HD', 'HD', 'ไต_อปท', 'ไต อปท'])) {
            // ไต อปท. (งวด/เลขที่เบิกจ่าย มีคำว่า HD เช่น APLGO-HD69-M12)
            return $query->where(function ($q) {
                $q->where('budget_source', 'LGO_HD')
                    ->orWhere(function ($q2) {
                        $q2->where('budget_source', 'LGO')
                            ->where('ref_doc_no', 'LIKE', '%HD%');
                    });
            });
        }

        if (strtoupper($source) === 'LGO') {
            // อปท. ทั่วไป (ไม่รวม ไต อปท. ที่มีคำว่า HD)
            return $query->where('budget_source', 'LGO')
                ->where(function ($q) {
                    $q->whereNull('ref_doc_no')
                        ->orWhere('ref_doc_no', 'NOT LIKE', '%HD%');
                });
        }

        return $query->where('budget_source', strtoupper($source));
    }

    public function scopeForYear(Builder $query, ?string $year): Builder
    {
        if (blank($year)) {
            return $query;
        }

        return $query->where('budget_year', $year);
    }
}
