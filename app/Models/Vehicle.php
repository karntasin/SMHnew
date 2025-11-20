<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Vehicle extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'category_id',
        'license_plate',
        'brand',
        'model',
        'color',
        'year',
        'seats',
        'fuel_type',
        'vehicle_type',
        'description',
        'mileage',
        'chassis_number',
        'engine_number',
        'registration_date',
        'insurance_expiry',
        'tax_expiry',
        'last_maintenance_date',
        'next_maintenance_date',
        'status', // available, maintenance, busy
        'is_active',
        'images',
    ];

    protected $casts = [
        'registration_date' => 'date',
        'insurance_expiry' => 'date',
        'tax_expiry' => 'date',
        'last_maintenance_date' => 'date',
        'next_maintenance_date' => 'date',
        'is_active' => 'boolean',
        'images' => 'array',
    ];

    public function category()
    {
        return $this->belongsTo(VehicleCategory::class, 'category_id');
    }

    public function bookings()
    {
        return $this->hasMany(VehicleBooking::class);
    }

    public function getNameAttribute()
    {
        return "{$this->brand} {$this->model} ({$this->license_plate})";
    }
}
