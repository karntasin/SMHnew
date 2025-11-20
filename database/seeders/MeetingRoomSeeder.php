<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\MeetingRoom;

class MeetingRoomSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $rooms = [
            [
                'name' => 'ห้องประชุม 1 (Grand Hall)',
                'capacity' => 50,
                'location' => 'ชั้น 2 อาคาร A',
                'description' => 'ห้องประชุมขนาดใหญ่ สำหรับการประชุมสำคัญ มีโปรเจคเตอร์และระบบเสียงครบครัน',
                'status' => 'active',
                'color' => '#3b82f6', // Blue
            ],
            [
                'name' => 'ห้องประชุม 2 (Meeting Room)',
                'capacity' => 15,
                'location' => 'ชั้น 2 อาคาร A',
                'description' => 'ห้องประชุมขนาดกลาง เหมาะสำหรับการประชุมแผนก',
                'status' => 'active',
                'color' => '#10b981', // Green
            ],
            [
                'name' => 'ห้องประชุม 3 (Small Talk)',
                'capacity' => 6,
                'location' => 'ชั้น 1 อาคาร B',
                'description' => 'ห้องประชุมขนาดเล็ก สำหรับการพูดคุยที่ไม่เป็นทางการมากนัก',
                'status' => 'active', // Changed from maintenance to active for demo
                'color' => '#f59e0b', // Amber
            ],
            [
                'name' => 'ห้องประชุม 4 (Executive)',
                'capacity' => 10,
                'location' => 'ชั้น 3 อาคาร A',
                'description' => 'ห้องประชุมผู้บริหาร ตกแต่งหรูหรา',
                'status' => 'active',
                'color' => '#8b5cf6', // Purple
            ]
        ];

        foreach ($rooms as $room) {
            MeetingRoom::create($room);
        }
    }
}
