<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\Menu;

return new class extends Migration
{
    public function up()
    {
        $parentId = Menu::where('title', 'ระบบขอใช้รถ')->value('id');

        if (!$parentId) {
            return;
        }

        // 1. Fix "จัดการรถ" (Manage Vehicles)
        Menu::updateOrCreate(
            [
                'parent_id' => $parentId,
                'title' => 'จัดการรถ',
            ],
            [
                'route' => '/vehicles/manage',
                'icon' => 'Car',
                'permission_name' => 'vehicle.manage', // Ensure this permission exists or use a generic one
                'order' => 90,
            ]
        );

        // 2. Fix "ตั้งค่า" (Settings)
        Menu::updateOrCreate(
            [
                'parent_id' => $parentId,
                'title' => 'ตั้งค่า',
            ],
            [
                'route' => '/vehicles/settings', // Correct plural route
                'icon' => 'Settings',
                'permission_name' => 'vehicle.settings',
                'order' => 99,
            ]
        );

        // 3. Clean up any incorrect routes if they exist as duplicates
        Menu::where('parent_id', $parentId)
            ->where('route', '/vehicle/settings') // The wrong singular one
            ->delete();
            
        Menu::where('parent_id', $parentId)
            ->where('route', '/vehicle/manage') // The wrong singular one
            ->delete();
    }

    public function down()
    {
        //
    }
};
