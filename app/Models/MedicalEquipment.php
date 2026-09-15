<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class MedicalEquipment extends Model
{
    use SoftDeletes;

    protected $table = 'medical_equipment';

    protected $fillable = [
        'category_id',
        'catalog_key',
        'asset_code',
        'name',
        'unit',
        'brand',
        'model',
        'serial_number',
        'location',
        'department_id',
        'image_path',
        'status',
        'quantity_total',
        'quantity_available',
        'is_active',
        'sort_order',
        'notes',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    protected $appends = ['image_url'];

    public function getImageUrlAttribute(): ?string
    {
        $path = (string) $this->image_path;
        if ($path === '') {
            return null;
        }
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }
        if (str_starts_with($path, 'images/')) {
            $full = public_path($path);
            $version = is_file($full) ? filemtime($full) : null;

            return asset($path).($version ? '?v='.$version : '');
        }

        return asset('storage/'.$path);
    }

    public function category()
    {
        return $this->belongsTo(MedicalEquipmentCategory::class, 'category_id');
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function borrowings()
    {
        return $this->hasMany(MedicalEquipmentBorrowing::class, 'equipment_id');
    }

    public function stockLogs()
    {
        return $this->hasMany(MedicalEquipmentStockLog::class, 'equipment_id');
    }

    public function activeBorrowings()
    {
        return $this->borrowings()->whereIn('status', ['approved', 'borrowed', 'overdue']);
    }
}
