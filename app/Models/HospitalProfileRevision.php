<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HospitalProfileRevision extends Model
{
    use HasFactory;

    protected $connection = 'mysql';
    protected $table = 'hospital_profile_revisions';

    protected $fillable = [
        'hospital_profile_id',
        'version_number',
        'change_summary',
        'snapshot_data',
        'created_by',
    ];

    protected $casts = [
        'snapshot_data' => 'array',
        'version_number' => 'integer',
    ];

    public function profile(): BelongsTo
    {
        return $this->belongsTo(HospitalProfile::class, 'hospital_profile_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
