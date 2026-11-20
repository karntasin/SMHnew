<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IpdAdmissionNote extends Model
{
    use HasFactory;

    protected $table = 'ipd_admission_notes';

    protected $fillable = [
        'an',
        'hn',
        'vn',
        'patient_name',
        'age',
        'gender',
        'ward',
        'pttype',
        'admit_date',
        'admit_time',
        'hospital_name',
        'form_data',
        'lesion_image',
        'lesion_na',
        'doctor_name',
        'doctor_license',
        'status',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'form_data' => 'array',
        'lesion_na' => 'boolean',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
