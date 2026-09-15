<?php

namespace App\Models\Im;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Risk extends Model
{
    protected $table = 'im_risks';

    protected $fillable = [
        'code', 'year', 'category', 'description', 'is_incident',
        'likelihood', 'impact', 'score', 'strategy', 'mitigation',
        'residual_likelihood', 'residual_impact', 'residual_score',
        'pdca_round', 'previous_risk_id', 'owner', 'status', 'created_by',
    ];

    protected $casts = [
        'year' => 'integer',
        'is_incident' => 'boolean',
        'likelihood' => 'integer',
        'impact' => 'integer',
        'score' => 'integer',
        'residual_likelihood' => 'integer',
        'residual_impact' => 'integer',
        'residual_score' => 'integer',
        'pdca_round' => 'integer',
    ];

    public function previous(): BelongsTo
    {
        return $this->belongsTo(Risk::class, 'previous_risk_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
