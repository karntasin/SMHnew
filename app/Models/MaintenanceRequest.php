<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class MaintenanceRequest extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'ticket_number',
        'user_id',
        'category_id',
        'priority_id',
        'title',
        'description',
        'location',
        'status',
        'technician_id',
        'assigned_at',
        'started_at',
        'completed_at',
        'resolution_notes',
        'cost',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'cost' => 'decimal:2',
    ];

    protected function technicianNotes(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->resolution_notes,
            set: fn (?string $value) => ['resolution_notes' => $value],
        );
    }

    protected function resolution(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->resolution_notes,
        );
    }

    public function category()
    {
        return $this->belongsTo(MaintenanceCategory::class);
    }

    public function priority()
    {
        return $this->belongsTo(MaintenancePriority::class);
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function technician()
    {
        return $this->belongsTo(User::class, 'technician_id');
    }

    public function images()
    {
        return $this->hasMany(MaintenanceRequestImage::class);
    }

    public function timeline()
    {
        return $this->hasMany(MaintenanceRequestTimeline::class);
    }
}
