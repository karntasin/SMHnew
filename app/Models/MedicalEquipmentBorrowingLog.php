<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MedicalEquipmentBorrowingLog extends Model
{
    protected $fillable = [
        'borrowing_id',
        'user_id',
        'action',
        'description',
        'old_values',
        'new_values',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
    ];

    public function borrowing()
    {
        return $this->belongsTo(MedicalEquipmentBorrowing::class, 'borrowing_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
