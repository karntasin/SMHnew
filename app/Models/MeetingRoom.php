<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MeetingRoom extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'capacity',
        'location',
        'description',
        'status',
        'color',
        'image_path'
    ];

    public function bookings()
    {
        return $this->hasMany(RoomBooking::class);
    }
}
