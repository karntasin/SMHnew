<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\Menu;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Update Parent Menu
        $parent = Menu::find(35);
        if ($parent) {
            $parent->update([
                'title' => 'ระบบขอใช้รถ',
                'icon' => 'Car',
                'route' => null,
                'permission_name' => 'vehicle.dashboard', // Keep or change?
            ]);
        } else {
            // Create if not exists (fallback)
            $parent = Menu::create([
                'id' => 35,
                'title' => 'ระบบขอใช้รถ',
                'icon' => 'Car',
                'parent_id' => 2, // งานธุรการ
                'order' => 13,
                'permission_name' => 'vehicle.dashboard',
            ]);
        }

        // 2. Update/Create Children
        $children = [
            [
                'title' => 'รายการขอใช้รถ',
                'route' => '/vehicles/bookings',
                'permission_name' => 'vehicle.bookings.view',
                'icon' => 'List',
                'order' => 1,
            ],
            [
                'title' => 'ปฏิทินการใช้รถ',
                'route' => '/vehicles/calendar',
                'permission_name' => 'vehicle.bookings.view',
                'icon' => 'Calendar',
                'order' => 2,
            ],
            [
                'title' => 'ขอใช้รถใหม่',
                'route' => '/vehicles/bookings/create',
                'permission_name' => 'vehicle.bookings.create',
                'icon' => 'PlusCircle',
                'order' => 3,
            ],
            // Keep existing ones if needed, or update them
        ];

        // Remove old children that might have wrong routes if we want a clean slate, 
        // but better to update existing ones to preserve IDs if possible.
        // For simplicity, I'll update by title or create.
        
        // Let's delete the old "Dashboard" child (ID 36) if it points to /vehicle/dashboard which doesn't exist
        Menu::where('parent_id', 35)->where('route', '/vehicle/dashboard')->delete();

        foreach ($children as $child) {
            Menu::updateOrCreate(
                [
                    'parent_id' => 35,
                    'title' => $child['title'],
                ],
                [
                    'route' => $child['route'],
                    'permission_name' => $child['permission_name'],
                    'icon' => $child['icon'],
                    'order' => $child['order'],
                ]
            );
        }

        // Update "จัดการรถ" route
        Menu::where('parent_id', 35)->where('title', 'จัดการรถ')->update([
            'route' => '/vehicles/manage', // We haven't created this yet, but good to have
            'order' => 5
        ]);

        // 3. Assign Permissions to Admin
        $role = Role::where('name', 'admin')->first();
        if ($role) {
            $permissions = [
                'vehicle.dashboard',
                'vehicle.bookings.view',
                'vehicle.bookings.create',
                'vehicle.bookings.edit',
                'vehicle.bookings.delete',
                'vehicle.bookings.manage',
                'vehicle.bookings.approve',
                'vehicle.vehicles.view',
            ];
            foreach ($permissions as $perm) {
                // Create if not exists
                Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
                $role->givePermissionTo($perm);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
