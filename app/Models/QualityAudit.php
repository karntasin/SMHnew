<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QualityAudit extends Model
{
    protected $fillable = [
        'audit_topic',
        'audit_date',
        'auditor',
        'department',
        'score',
        'result_summary',
    ];

    protected $casts = [
        'audit_date' => 'date',
        'score' => 'decimal:2',
    ];
}
