<?php

namespace App\Models\Im;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MrAudit extends Model
{
    protected $table = 'im_mr_audits';

    protected $fillable = [
        'record_type', 'patient_ref', 'doctor', 'audit_date', 'auditor', 'items',
        'total_score', 'max_score', 'percent', 'star_level', 'note',
        'print_checked', 'discrepancy', 'created_by',
    ];

    protected $casts = [
        'audit_date' => 'date',
        'items' => 'array',
        'total_score' => 'float',
        'max_score' => 'float',
        'percent' => 'float',
        'star_level' => 'integer',
        'print_checked' => 'boolean',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
