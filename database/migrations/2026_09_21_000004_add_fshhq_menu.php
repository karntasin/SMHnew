<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. สร้าง Main Menu "ระบบคิว (FSHH-Q)"
        $mainMenuId = DB::table('menus')->insertGetId([
            'title' => 'ระบบคิว (FSHH-Q)',
            'icon' => 'MonitorPlay', // Lucide Icon
            'route' => null,
            'parent_id' => null,
            'order' => 99,
            'permission_name' => null, // เปิดให้ทุกคนที่ login (หรือจะกำหนด permission ก็ได้)
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 2. สร้าง Sub Menu
        $subMenus = [
            [
                'title' => 'ตั้งค่าจอแสดงผล',
                'icon' => 'Settings',
                'route' => 'admin.tv.settings.edit',
                'parent_id' => $mainMenuId,
                'order' => 1,
            ],
            [
                'title' => 'จัดการสื่อ/ประกาศ',
                'icon' => 'Clapperboard',
                'route' => 'admin.tv.playlist.index',
                'parent_id' => $mainMenuId,
                'order' => 2,
            ],
            [
                'title' => 'ตั้งค่าห้องตรวจ',
                'icon' => 'Stethoscope',
                'route' => 'admin.tv.rooms.index',
                'parent_id' => $mainMenuId,
                'order' => 3,
            ]
        ];

        foreach ($subMenus as $menu) {
            DB::table('menus')->insert(array_merge($menu, [
                'permission_name' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }

    public function down(): void
    {
        $mainMenuId = DB::table('menus')->where('title', 'ระบบคิว (FSHH-Q)')->value('id');
        if ($mainMenuId) {
            DB::table('menus')->where('parent_id', $mainMenuId)->delete();
            DB::table('menus')->where('id', $mainMenuId)->delete();
        }
    }
};
