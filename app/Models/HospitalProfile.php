<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HospitalProfile extends Model
{
    use HasFactory;

    protected $connection = 'mysql';
    protected $table = 'hospital_profiles';

    protected $fillable = [
        'code',
        'hospital_name_th',
        'hospital_name_en',
        'address',
        'hospital_type',
        'hospital_level',
        'affiliation',
        'registered_beds',
        'actual_beds',
        'occupancy_rate',
        'service_area',
        'network_hospitals',
        'vision',
        'mission',
        'core_values',
        'culture',
        'core_competencies',
        'strategic_objectives',
        'strategic_focus',
        'strategic_advantages',
        'strategic_challenges',
        'front_page_info',
        'patient_profile',
        'staff_profile',
        'workload_data',
        'entry_data',
        'one_page_summary',
        'status',
        'current_version',
        'last_modified_by',
    ];

    protected $casts = [
        'front_page_info' => 'array',
        'patient_profile' => 'array',
        'staff_profile' => 'array',
        'workload_data' => 'array',
        'entry_data' => 'array',
        'one_page_summary' => 'array',
        'registered_beds' => 'integer',
        'actual_beds' => 'integer',
        'occupancy_rate' => 'float',
        'current_version' => 'integer',
    ];

    public function revisions(): HasMany
    {
        return $this->hasMany(HospitalProfileRevision::class, 'hospital_profile_id')->orderBy('version_number', 'desc');
    }

    public function modifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'last_modified_by');
    }

    /**
     * Create a snapshot of the current state
     */
    public function createSnapshot(string $summary = 'บันทึกข้อมูลทั่วไป', ?int $userId = null): HospitalProfileRevision
    {
        $newVersion = ($this->current_version ?? 0) + 1;

        $snapshot = $this->only([
            'hospital_name_th', 'hospital_name_en', 'address', 'hospital_type', 'hospital_level',
            'affiliation', 'registered_beds', 'actual_beds', 'occupancy_rate', 'service_area',
            'network_hospitals', 'vision', 'mission', 'core_values', 'culture', 'core_competencies',
            'strategic_objectives', 'strategic_focus', 'strategic_advantages', 'strategic_challenges',
            'front_page_info', 'patient_profile', 'staff_profile', 'workload_data', 'entry_data',
            'one_page_summary',
        ]);

        $revision = $this->revisions()->create([
            'version_number' => $newVersion,
            'change_summary' => $summary,
            'snapshot_data' => json_encode($snapshot, JSON_UNESCAPED_UNICODE),
            'created_by' => $userId,
        ]);

        $this->update(['current_version' => $newVersion]);

        return $revision;
    }
}
