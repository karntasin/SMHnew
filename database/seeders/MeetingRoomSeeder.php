<?php

namespace Database\Seeders;

use App\Models\MeetingRoom;
use Illuminate\Database\Seeder;

class MeetingRoomSeeder extends Seeder
{
    public function run(): void
    {
        $rooms = [
            [
                'name' => 'ห้องประชุม 1 (Grand Hall)',
                'capacity' => 50,
                'location' => 'ชั้น 2 อาคาร A',
                'description' => 'ห้องประชุมขนาดใหญ่ สำหรับการประชุมสำคัญ มีโปรเจคเตอร์และระบบเสียงครบครัน',
                'status' => 'active',
                'is_active' => true,
                'requires_approval' => true,
                'color' => '#0ea5e9',
                'facilities' => ['projector', 'sound_system', 'microphone', 'wifi', 'air_conditioner'],
            ],
            [
                'name' => 'ห้องประชุม 2 (Meeting Room)',
                'capacity' => 15,
                'location' => 'ชั้น 2 อาคาร A',
                'description' => 'ห้องประชุมขนาดกลาง เหมาะสำหรับการประชุมแผนก',
                'status' => 'active',
                'is_active' => true,
                'requires_approval' => true,
                'color' => '#10b981',
                'facilities' => ['projector', 'whiteboard', 'wifi', 'air_conditioner'],
            ],
            [
                'name' => 'ห้องประชุม 3 (Small Talk)',
                'capacity' => 6,
                'location' => 'ชั้น 1 อาคาร B',
                'description' => 'ห้องประชุมขนาดเล็ก สำหรับการพูดคุยที่ไม่เป็นทางการมากนัก',
                'status' => 'active',
                'is_active' => true,
                'requires_approval' => false,
                'color' => '#f59e0b',
                'facilities' => ['tv', 'wifi', 'air_conditioner'],
            ],
            [
                'name' => 'ห้องประชุม 4 (Executive)',
                'capacity' => 10,
                'location' => 'ชั้น 3 อาคาร A',
                'description' => 'ห้องประชุมผู้บริหาร พร้อมวิดีโอคอนเฟอเรนซ์',
                'status' => 'active',
                'is_active' => true,
                'requires_approval' => true,
                'color' => '#8b5cf6',
                'facilities' => ['video_conference', 'projector', 'wifi', 'air_conditioner'],
            ],
        ];

        foreach ($rooms as $room) {
            MeetingRoom::updateOrCreate(['name' => $room['name']], $room);
        }
    }
}
