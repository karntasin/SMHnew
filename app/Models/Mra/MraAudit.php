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
        'cid',
        'patient_name',
        'birthdate',
        'pttype',
        'pttype_name',
        'visit_date',
        'visit_time',
        'doctor_name',
        'doctor_code',
        'department',
        'department_code',
        'chief_complaint',
        'pdx',
        'pdx_icd10',
        'bp_systolic',
        'bp_diastolic',
        'pulse',
        'temperature',
        'respiratory_rate',
        'auditor_id',
        'status',
        'audit_type',
        'total_score',
        'total_max_score',
        'total_obtained_score',
        'total_items',
        'correct_items',
        'accuracy_percentage',
        'final_diagnosis_accuracy',
        'coding_accuracy',
        'summary_notes',
        'audited_at',
    ];

    protected $casts = [
        'visit_date' => 'date',
        'birthdate' => 'date',
        'audited_at' => 'datetime',
        'final_diagnosis_accuracy' => 'boolean',
        'coding_accuracy' => 'boolean',
        'accuracy_percentage' => 'decimal:2',
        'total_max_score' => 'decimal:1',
        'total_obtained_score' => 'decimal:1',
        'pulse' => 'decimal:1',
        'temperature' => 'decimal:1',
    ];

    /**
     * Get audit details
     */
    public function details()
    {
        return $this->hasMany(MraAuditDetail::class);
    }

    /**
     * Get auditor
     */
    public function auditor()
    {
        return $this->belongsTo(User::class, 'auditor_id');
    }

    /**
     * Calculate scores from details
     */
    public function calculateScores()
    {
        $details = $this->details()->with('criteria')->get();
        
        $totalMax = 0;
        $totalObtained = 0;
        $totalItems = 0;
        $correctItems = 0;
        
        foreach ($details as $detail) {
            if ($detail->result !== 'na' && $detail->result !== 'pending') {
                $totalMax += $detail->max_score;
                $totalObtained += $detail->obtained_score;
                $totalItems++;
                if ($detail->result === 'pass') {
                    $correctItems++;
                }
            }
        }
        
        $accuracy = $totalMax > 0 ? ($totalObtained / $totalMax) * 100 : 0;
        
        $this->update([
            'total_max_score' => $totalMax,
            'total_obtained_score' => $totalObtained,
            'total_items' => $totalItems,
            'correct_items' => $correctItems,
            'accuracy_percentage' => round($accuracy, 2),
        ]);
        
        return [
            'total_max_score' => $totalMax,
            'total_obtained_score' => $totalObtained,
            'total_items' => $totalItems,
            'correct_items' => $correctItems,
            'accuracy_percentage' => round($accuracy, 2),
        ];
    }

    /**
     * Get scores by category
     */
    public function getScoresByCategory()
    {
        return $this->details()
            ->with('criteria.category')
            ->get()
            ->groupBy(fn($detail) => $detail->criteria?->category?->id)
            ->map(function ($details, $categoryId) {
                $category = $details->first()->criteria?->category;
                $maxScore = $details->where('result', '!=', 'na')->sum('max_score');
                $obtainedScore = $details->sum('obtained_score');
                
                return [
                    'category_id' => $categoryId,
                    'category_name' => $category?->name ?? 'Unknown',
                    'category_code' => $category?->code ?? '',
                    'max_score' => $maxScore,
                    'obtained_score' => $obtainedScore,
                    'accuracy' => $maxScore > 0 ? round(($obtainedScore / $maxScore) * 100, 2) : 0,
                    'details_count' => $details->count(),
                    'pass_count' => $details->where('result', 'pass')->count(),
                    'fail_count' => $details->where('result', 'fail')->count(),
                ];
            })
            ->values();
    }

    /**
     * Mark as audited
     */
    public function markAsAudited()
    {
        $this->calculateScores();
        $this->update([
            'status' => 'audited',
            'audited_at' => now(),
        ]);
    }

    /**
     * Scope pending audits
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope audited
     */
    public function scopeAudited($query)
    {
        return $query->where('status', 'audited');
    }

    /**
     * Scope by audit type
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('audit_type', $type);
    }

    /**
     * Scope by date range
     */
    public function scopeDateRange($query, $from, $to)
    {
        return $query->whereBetween('visit_date', [$from, $to]);
    }
}
