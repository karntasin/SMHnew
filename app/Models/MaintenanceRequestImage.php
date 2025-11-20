<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MaintenanceRequestImage extends Model
{
    use HasFactory;

    protected $fillable = [
        'maintenance_request_id',
        'image_path',
        'image_type',
        'caption',
        'order',
    ];

    public function request()
    {
        return $this->belongsTo(MaintenanceRequest::class, 'maintenance_request_id');
    }
}
