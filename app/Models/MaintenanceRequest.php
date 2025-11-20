<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class MaintenanceRequest extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'ticket_number',
        'category_id',
        'priority_id',
        'requester_id',
        'assigned_to',
        'title',
        'description',
        'location',
        'asset_name',
        'status',
        'technician_notes',
        'resolution',
        'cost',
        'assigned_at',
        'started_at',
        'completed_at',
        'cancelled_at',
        'rating',
        'feedback',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'cost' => 'decimal:2',
    ];

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
        return $this->belongsTo(User::class, 'requester_id');
    }

    public function technician()
    {
        return $this->belongsTo(User::class, 'assigned_to');
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
