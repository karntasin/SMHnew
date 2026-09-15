<?php

namespace App\Models\Finance;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StmImport extends Model
{
    protected $table = 'finance_stm_imports';

    protected $fillable = [
        'claim_submission_no',
        'filename',
        'stored_path',
        'hcode',
        'hospital_name',
        'province',
        'channel',
        'period_label',
        'reported_at',
        'detail_count',
        'summary_count',
        'rep_count',
        'total_claim',
        'total_approved',
        'visit_date_min',
        'visit_date_max',
        'sheet_names',
        'notes',
        'imported_by',
    ];

    protected $casts = [
        'reported_at' => 'datetime',
        'visit_date_min' => 'date',
        'visit_date_max' => 'date',
        'sheet_names' => 'array',
        'detail_count' => 'integer',
        'summary_count' => 'integer',
        'rep_count' => 'integer',
        'total_claim' => 'float',
        'total_approved' => 'float',
    ];

    public function details(): HasMany
    {
        return $this->hasMany(StmDetailRow::class, 'import_id');
    }

    public function summaries(): HasMany
    {
        return $this->hasMany(StmSummaryRow::class, 'import_id');
    }

    public function importer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'imported_by');
    }

    public function reconciliations(): HasMany
    {
        return $this->hasMany(CgdReconciliation::class, 'stm_import_id');
    }
}
