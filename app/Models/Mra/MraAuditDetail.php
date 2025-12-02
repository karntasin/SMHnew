<?php

namespace App\Models\Mra;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MraAuditDetail extends Model
{
    use HasFactory;

    protected $fillable = [
        'mra_audit_id',
        'mra_criteria_id',
        'category',
        'item_code',
        'item_description',
        'hosxp_value',
        'max_score',
        'obtained_score',
        'is_correct',
        'result',
        'correct_value',
        'error_type',
        'auditor_comment',
    ];

    protected $casts = [
        'is_correct' => 'boolean',
        'max_score' => 'integer',
        'obtained_score' => 'integer',
    ];

    /**
     * Get the audit that owns this detail.
     */
    public function audit()
    {
        return $this->belongsTo(MraAudit::class, 'mra_audit_id');
    }

    /**
     * Get the criteria for this detail.
     */
    public function criteria()
    {
        return $this->belongsTo(MraCriteria::class, 'mra_criteria_id');
    }

    /**
     * Set result and calculate score
     */
    public function setResult($result)
    {
        $this->result = $result;
        $this->is_correct = ($result === 'pass');
        
        switch ($result) {
            case 'pass':
                $this->obtained_score = $this->max_score;
                break;
            case 'fail':
                $this->obtained_score = 0;
                break;
            case 'na':
                $this->obtained_score = 0;
                break;
            default:
                $this->obtained_score = 0;
        }
        
        $this->save();
        
        // Recalculate audit scores
        $this->audit->calculateScores();
    }

    /**
     * Scope by result
     */
    public function scopeResult($query, $result)
    {
        return $query->where('result', $result);
    }

    /**
     * Scope passed items
     */
    public function scopePassed($query)
    {
        return $query->where('result', 'pass');
    }

    /**
     * Scope failed items
     */
    public function scopeFailed($query)
    {
        return $query->where('result', 'fail');
    }
}
