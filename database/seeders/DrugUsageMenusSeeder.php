<?php

namespace Database\Seeders;

use App\Models\Menu;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class DrugUsageMenusSeeder extends Seeder
{
    public function run(): void
    {
        $quality = Menu::query()
            ->whereNull('parent_id')
            ->where(function ($q) {
                $q->where('title', 'ศูนย์คุณภาพ')
                    ->orWhere('title', 'ศูนย์รวมงานคุณภาพ')
                    ->orWhere('title', 'Quality Hub')
                    ->orWhere('route', 'quality.index');
            })
            ->first();

        if (! $quality) {
            $quality = Menu::create([
                'title' => 'ศูนย์คุณภาพ',
                'icon' => 'Award',
                'route' => null,
                'order' => 10,
                'permission_name' => null,
            ]);
        }

        $parent = Menu::query()
            ->where(function ($q) {
                $q->where('title', 'รายงานยาและการใช้ยา')
                    ->orWhere('route', 'drug-usage.index');
            })
            ->where(function ($q) use ($quality) {
                $q->whereNull('parent_id')->orWhere('parent_id', $quality->id);
            })
            ->first();

        if (! $parent) {
            $parent = Menu::create([
                'title' => 'รายงานยาและการใช้ยา',
                'icon' => 'Pill',
                'route' => null,
                'parent_id' => $quality->id,
                'order' => 8,
                'permission_name' => null,
            ]);
        } else {
            $parent->update([
                'title' => 'รายงานยาและการใช้ยา',
                'icon' => 'Pill',
                'route' => null,
                'parent_id' => $quality->id,
                'order' => 8,
                'permission_name' => null,
            ]);
        }

        $children = [
            [
                'title' => 'ภาพรวมการใช้ยา',
                'icon' => 'BarChart3',
                'route' => 'drug-usage.index',
                'order' => 1,
                'permission_name' => 'drug-usage.index',
            ],
            [
                'title' => 'รายงานรายการยา',
                'icon' => 'ClipboardList',
                'route' => 'drug-usage.report',
                'order' => 2,
                'permission_name' => 'drug-usage.report',
            ],
        ];

        $validRoutes = collect($children)->pluck('route')->all();

        Menu::where('parent_id', $parent->id)
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
                'group' => 'รายงานยาและการใช้ยา',
            ]);

            Permission::firstOrCreate([
                'name' => 'drug-usage.export',
                'guard_name' => 'web',
            ], [
                'group' => 'รายงานยาและการใช้ยา',
            ]);

            foreach (['admin', 'Admin', 'user', 'header', 'Header'] as $roleName) {
                $role = Role::where('name', $roleName)->first();
                if ($role && ! $role->hasPermissionTo($permission)) {
                    $role->givePermissionTo($permission);
                }
            }
        }

        $this->command?->info('อัปเดตเมนูรายงานยาและการใช้ยาเรียบร้อยแล้ว ('.count($children).' รายการย่อย)');
    }
}
