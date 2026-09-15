<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MedicalEquipmentStockLog extends Model
{
    protected $fillable = [
        'equipment_id',
        'borrowing_id',
        'user_id',
        'type',
        'quantity_change',
        'quantity_before',
        'quantity_after',
        'reason',
    ];

    public function equipment()
    {
        return $this->belongsTo(MedicalEquipment::class, 'equipment_id');
    }

    public function borrowing()
    {
        return $this->belongsTo(MedicalEquipmentBorrowing::class, 'borrowing_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
