<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VehicleBooking extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'booking_number',
        'vehicle_id',
        'vehicle_category_id',
        'user_id',
        'driver_id',
        'approved_by',
        'approval_reason',
        'purpose',
        'destination',
        'passenger_count',
        'note',
        'start_datetime',
        'end_datetime',
        'actual_start_datetime',
        'actual_end_datetime',
        'start_mileage',
        'end_mileage',
        'distance_km',
        'fuel_cost',
        'trip_report',
        'status', // pending, approved, rejected, cancelled, completed, in_progress
        'rejection_reason',
        'cancellation_reason',
        'approved_at',
        'rejected_at',
        'cancelled_at',
        'completed_at',
    ];

    protected $casts = [
        'start_datetime' => 'datetime',
        'end_datetime' => 'datetime',
        'actual_start_datetime' => 'datetime',
        'actual_end_datetime' => 'datetime',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function category()
    {
        return $this->belongsTo(VehicleCategory::class, 'vehicle_category_id');
    }

    public function driver()
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
