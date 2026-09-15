<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeaveType extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'form_code',
        'form_number',
        'name',
        'subject',
        'description',
        'max_days_per_year',
        'requires_document',
        'counts_working_days',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'requires_document' => 'boolean',
            'counts_working_days' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function leaveRequests()
    {
        return $this->hasMany(LeaveRequest::class);
    }
}
