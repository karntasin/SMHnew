<?php

namespace App\Models\Rcm;

use Illuminate\Database\Eloquent\Model;

class RcmAuditRule extends Model
{
    protected $table = 'rcm_audit_rules';

    protected $fillable = [
        'rule_code',
        'category',
        'name',
        'description',
        'severity',
        'fix_instruction',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
