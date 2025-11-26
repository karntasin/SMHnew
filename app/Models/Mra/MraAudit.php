<?php

namespace App\Models\Mra;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class MraAudit extends Model
{
    use HasFactory;

    protected $fillable = [
        'vn',
        'an',
        'hn',
        'patient_name',
        'visit_date',
        'doctor_name',
        'department',
        'auditor_id',
        'status',
        'total_score',
        'final_diagnosis_accuracy',
        'coding_accuracy',
        'summary_notes',
    ];

    protected $casts = [
        'visit_date' => 'date',
        'final_diagnosis_accuracy' => 'boolean',
        'coding_accuracy' => 'boolean',
    ];

    public function details()
    {
        return $this->hasMany(MraAuditDetail::class);
    }

    public function auditor()
    {
        return $this->belongsTo(User::class, 'auditor_id');
    }
}
