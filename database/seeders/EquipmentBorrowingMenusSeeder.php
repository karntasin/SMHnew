<?php

namespace Database\Seeders;

use App\Models\MedicalEquipmentCategory;
use App\Models\Menu;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class EquipmentBorrowingMenusSeeder extends Seeder
{
    public function run(): void
    {
        $parent = Menu::query()
            ->whereNull('parent_id')
            ->where(function ($q) {
                $q->where('title', 'งานธุรการ')
                    ->orWhere('title', 'Administrative Hub')
                    ->orWhere('route', 'admin.hub');
            })
            ->first();

        if (! $parent) {
            $parent = Menu::create([
                'title' => 'งานธุรการ',
                'icon' => 'Building',
                'route' => 'admin.hub',
                'order' => 20,
                'permission_name' => 'admin.hub',
            ]);
        }

        $equipmentParent = Menu::query()
            ->where('parent_id', $parent->id)
            ->where(function ($q) {
                $q->where('title', 'ระบบยืมอุปกรณ์แพทย์')
                    ->orWhere('title', 'Medical Equipment Borrowing');
            })
            ->first();

        if (! $equipmentParent) {
            $equipmentParent = Menu::create([
                'parent_id' => $parent->id,
                'title' => 'ระบบยืมอุปกรณ์แพทย์',
                'icon' => 'Stethoscope',
                'route' => null,
                'order' => 4,
                'permission_name' => null,
            ]);
        } else {
            $equipmentParent->update([
                'title' => 'ระบบยืมอุปกรณ์แพทย์',
                'icon' => 'Stethoscope',
            ]);
        }

        $children = [
            [
                'title' => 'แดชบอร์ดยืมอุปกรณ์',
                'icon' => 'LayoutDashboard',
                'route' => 'equipment-borrowing.dashboard',
                'order' => 1,
                'permission_name' => 'equipment-borrowing.dashboard',
            ],
            [
                'title' => 'รายการยืมทั้งหมด',
                'icon' => 'List',
                'route' => 'equipment-borrowing.borrowings.index',
                'order' => 2,
                'permission_name' => 'equipment-borrowing.borrowings.index',
            ],
            [
                'title' => 'รายการยืมของฉัน',
                'icon' => 'User',
                'route' => 'equipment-borrowing.borrowings.my',
                'order' => 3,
                'permission_name' => 'equipment-borrowing.borrowings.my',
            ],
            [
                'title' => 'ขอยืมอุปกรณ์',
                'icon' => 'PlusCircle',
                'route' => 'equipment-borrowing.borrowings.create',
                'order' => 4,
                'permission_name' => 'equipment-borrowing.borrowings.create',
            ],
            [
                'title' => 'จัดการอุปกรณ์',
                'icon' => 'Package',
                'route' => 'equipment-borrowing.equipment.index',
                'order' => 5,
                'permission_name' => 'equipment-borrowing.equipment.index',
            ],
            [
                'title' => 'ตั้งค่าอุปกรณ์',
                'icon' => 'Settings',
                'route' => 'equipment-borrowing.settings.index',
                'order' => 6,
                'permission_name' => 'equipment-borrowing.settings.index',
            ],
        ];

        foreach ($children as $child) {
            Menu::updateOrCreate(
                ['parent_id' => $equipmentParent->id, 'route' => $child['route']],
                [
                    'title' => $child['title'],
                    'icon' => $child['icon'],
                    'order' => $child['order'],
                    'permission_name' => $child['permission_name'],
                ]
            );

            $permission = Permission::firstOrCreate(
                ['name' => $child['permission_name'], 'guard_name' => 'web'],
                ['group' => 'ระบบยืมอุปกรณ์แพทย์']
            );

            foreach (['admin', 'Admin', 'user', 'header', 'Header'] as $roleName) {
                $role = Role::where('name', $roleName)->first();
                if ($role && ! $role->hasPermissionTo($permission)) {
                    $role->givePermissionTo($permission);
                }
            }
        }

        $defaults = [
            ['name' => 'เครื่องมือแพทย์', 'icon' => 'Stethoscope', 'color' => '#0f766e'],
            ['name' => 'อุปกรณ์ตรวจวินิจฉัย', 'icon' => 'Activity', 'color' => '#2563eb'],
            ['name' => 'อุปกรณ์ช่วยชีวิต', 'icon' => 'HeartPulse', 'color' => '#dc2626'],
            ['name' => 'อุปกรณ์ทั่วไป', 'icon' => 'Package', 'color' => '#7c3aed'],
        ];

        foreach ($defaults as $i => $cat) {
            MedicalEquipmentCategory::firstOrCreate(
                ['name' => $cat['name']],
                ['icon' => $cat['icon'], 'color' => $cat['color'], 'sort_order' => $i + 1, 'is_active' => true]
            );
        }

        $this->command?->info('Equipment borrowing menus seeded ('.count($children).' items).');
    }
}
