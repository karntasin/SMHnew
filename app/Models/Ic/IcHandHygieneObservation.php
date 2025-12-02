<?php

namespace App\Models\Ic;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class IcHandHygieneObservation extends Model
{
    protected $fillable = [
        'observation_date',
        'ward_name',
        'observer_name',
        'profession',
        'moment_1_opportunities',
        'moment_1_compliances',
        'moment_2_opportunities',
        'moment_2_compliances',
        'moment_3_opportunities',
        'moment_3_compliances',
        'moment_4_opportunities',
        'moment_4_compliances',
        'moment_5_opportunities',
        'moment_5_compliances',
        'hand_hygiene_method',
        'notes',
        'reporter_id',
    ];

    protected $casts = [
        'observation_date' => 'date',
    ];

    protected $appends = ['compliance_rate', 'total_opportunities', 'total_compliances'];

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    // Calculate compliance rate
    public function getTotalOpportunitiesAttribute(): int
    {
        return $this->moment_1_opportunities +
               $this->moment_2_opportunities +
               $this->moment_3_opportunities +
               $this->moment_4_opportunities +
               $this->moment_5_opportunities;
    }

    public function getTotalCompliancesAttribute(): int
    {
        return $this->moment_1_compliances +
               $this->moment_2_compliances +
               $this->moment_3_compliances +
               $this->moment_4_compliances +
               $this->moment_5_compliances;
    }

    public function getComplianceRateAttribute(): float
    {
        if ($this->total_opportunities === 0) {
            return 0;
        }
        return round(($this->total_compliances / $this->total_opportunities) * 100, 2);
    }

    // Get compliance by moment
    public function getMomentComplianceRate(int $moment): float
    {
        $opportunities = $this->{"moment_{$moment}_opportunities"};
        $compliances = $this->{"moment_{$moment}_compliances"};
        
        if ($opportunities === 0) {
            return 0;
        }
        return round(($compliances / $opportunities) * 100, 2);
    }
}
