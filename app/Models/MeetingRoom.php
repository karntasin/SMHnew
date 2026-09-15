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
        'image_path',
        'image',
        'facilities',
        'is_active',
        'requires_approval',
    ];

    protected $casts = [
        'facilities' => 'array',
        'is_active' => 'boolean',
        'requires_approval' => 'boolean',
        'capacity' => 'integer',
    ];

    protected $appends = ['image_url'];

    public static function facilityOptions(): array
    {
        return [
            'projector' => 'โปรเจคเตอร์',
            'whiteboard' => 'ไวท์บอร์ด',
            'video_conference' => 'วิดีโอคอนเฟอเรนซ์',
            'wifi' => 'Wi-Fi',
            'sound_system' => 'ระบบเสียง',
            'microphone' => 'ไมโครโฟน',
            'tv' => 'โทรทัศน์',
            'air_conditioner' => 'เครื่องปรับอากาศ',
        ];
    }

    public function getImageUrlAttribute(): ?string
    {
        $path = $this->image_path ?: $this->image;

        return $path ? asset('storage/'.$path) : null;
    }

    public function bookings()
    {
        return $this->hasMany(RoomBooking::class, 'room_id');
    }

    public function scopeActive($query)
    {
        return $query->where(function ($q) {
            $q->where('status', 'active')
                ->orWhere(function ($inner) {
                    $inner->whereNull('status')->where('is_active', true);
                });
        });
    }
}
