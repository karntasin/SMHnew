<?php

namespace App\Models\Mra;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MraAuditDetail extends Model
{
    use HasFactory;

    protected $fillable = [
        'mra_audit_id',
        'category',
        'item_code',
        'item_description',
        'is_correct',
        'correct_value',
        'error_type',
        'auditor_comment',
    ];

    protected $casts = [
        'is_correct' => 'boolean',
    ];

    public function audit()
    {
        return $this->belongsTo(MraAudit::class, 'mra_audit_id');
    }
}
