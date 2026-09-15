<?php

namespace Database\Seeders;

use App\Models\Menu;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PharmacyMenusSeeder extends Seeder
{
    public function run(): void
    {
        $quality = Menu::query()
            ->whereNull('parent_id')
            ->where(function ($q) {
                $q->whereIn('title', [
                    'ศูนย์พัฒนาคุณภาพ',
                    'ศูนย์คุณภาพ',
                    'ศูนย์รวมงานคุณภาพ',
                    'Quality Hub',
                ])->orWhere('route', 'quality.index');
            })
            ->first();

        if (! $quality) {
            $quality = Menu::create([
                'title' => 'ศูนย์พัฒนาคุณภาพ',
                'icon' => 'Award',
                'route' => null,
                'order' => 10,
                'permission_name' => null,
            ]);
        }

        $parent = Menu::query()
            ->where(function ($q) {
                $q->whereIn('title', ['เภสัชกรรม', 'Pharmacy', 'รายงาน RDU', 'RDU Reports'])
                    ->orWhere('route', 'pharmacy.index');
            })
            ->where(function ($q) use ($quality) {
                $q->whereNull('parent_id')->orWhere('parent_id', $quality->id);
            })
            ->first();

        if (! $parent) {
            $parent = Menu::create([
                'title' => 'เภสัชกรรม',
                'icon' => 'Pill',
                'route' => null,
                'parent_id' => $quality->id,
                'order' => 8,
                'permission_name' => null,
            ]);
        } else {
            $parent->update([
                'title' => 'เภสัชกรรม',
                'icon' => 'Pill',
                'route' => null,
                'parent_id' => $quality->id,
                'order' => 8,
                'permission_name' => null,
            ]);
        }

        // Fold legacy drug-usage group into pharmacy.
        Menu::query()
            ->where('parent_id', $quality->id)
            ->where('title', 'รายงานยาและการใช้ยา')
            ->where('id', '!=', $parent->id)
            ->get()
            ->each(function (Menu $menu) {
                Menu::where('parent_id', $menu->id)->delete();
                $menu->delete();
            });

        $children = [
            ['title' => 'ภาพรวมเภสัชกรรม', 'icon' => 'LayoutDashboard', 'route' => 'pharmacy.index', 'order' => 1, 'permission_name' => 'pharmacy.index'],
            ['title' => 'คลังยา / ห้องยา', 'icon' => 'Warehouse', 'route' => 'pharmacy.inventory.index', 'order' => 2, 'permission_name' => 'pharmacy.inventory.index'],
            ['title' => 'แจ้งเตือนการใช้ยา', 'icon' => 'AlertTriangle', 'route' => 'pharmacy.drug-alerts', 'order' => 3, 'permission_name' => 'pharmacy.drug-alerts'],
            ['title' => 'ตัวชี้วัด RDU', 'icon' => 'Activity', 'route' => 'rdu.index', 'order' => 4, 'permission_name' => 'rdu.index'],
            ['title' => 'Case Audit', 'icon' => 'ClipboardList', 'route' => 'rdu.cases', 'order' => 5, 'permission_name' => 'rdu.cases'],
            ['title' => 'การใช้ยารวม', 'icon' => 'Pill', 'route' => 'rdu.drugs', 'order' => 6, 'permission_name' => 'rdu.drugs'],
            ['title' => 'ยาปฏิชีวนะ', 'icon' => 'Syringe', 'route' => 'rdu.drugs.antibiotics', 'order' => 7, 'permission_name' => 'rdu.drugs.antibiotics'],
            ['title' => 'ตามแผนก/แพทย์', 'icon' => 'Building2', 'route' => 'rdu.drugs.by-department', 'order' => 8, 'permission_name' => 'rdu.drugs.by-department'],
            ['title' => 'ภาพรวมการใช้ยา', 'icon' => 'LayoutDashboard', 'route' => 'drug-usage.index', 'order' => 9, 'permission_name' => 'drug-usage.index'],
            ['title' => 'รายงานรายการยา', 'icon' => 'ClipboardList', 'route' => 'drug-usage.report', 'order' => 10, 'permission_name' => 'drug-usage.report'],
        ];

        $validRoutes = collect($children)->pluck('route')->all();

        Menu::where('parent_id', $parent->id)
            ->whereNotNull('route')
            ->whereNotIn('route', $validRoutes)
            ->delete();

        foreach ($children as $child) {
            Menu::updateOrCreate(
                [
                    'parent_id' => $parent->id,
                    'route' => $child['route'],
                ],
                [
                    'title' => $child['title'],
                    'icon' => $child['icon'],
                    'order' => $child['order'],
                    'permission_name' => $child['permission_name'],
                ]
            );

            $permission = Permission::firstOrCreate([
                'name' => $child['permission_name'],
                'guard_name' => 'web',
            ], [
                'group' => 'เภสัชกรรม',
            ]);

            if ($permission->group !== 'เภสัชกรรม') {
                $permission->update(['group' => 'เภสัชกรรม']);
            }

            foreach (['admin', 'Admin', 'user', 'header', 'Header'] as $roleName) {
                $role = Role::where('name', $roleName)->first();
                if ($role && ! $role->hasPermissionTo($permission)) {
                    $role->givePermissionTo($permission);
                }
            }
        }

        foreach (['rdu.audits.store', 'drug-usage.export', 'rdu.export', 'rdu.drugs.export'] as $extra) {
            $permission = Permission::firstOrCreate([
                'name' => $extra,
                'guard_name' => 'web',
            ], [
                'group' => 'เภสัชกรรม',
            ]);

            foreach (['admin', 'Admin', 'user', 'header', 'Header'] as $roleName) {
                $role = Role::where('name', $roleName)->first();
                if ($role && ! $role->hasPermissionTo($permission)) {
                    $role->givePermissionTo($permission);
                }
            }
        }

        $this->command?->info('อัปเดตเมนูเภสัชกรรมเรียบร้อยแล้ว ('.count($children).' รายการย่อย)');
    }
}
