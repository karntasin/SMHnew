<?php

namespace Database\Seeders;

use App\Models\Menu;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class DepartmentDataMenusSeeder extends Seeder
{
    public function run(): void
    {
        $parent = Menu::query()
            ->whereNull('parent_id')
            ->where(function ($q) {
                $q->where('title', 'ข้อมูลรายแผนก')
                    ->orWhere('route', 'department-data.index');
            })
            ->first();

        if (! $parent) {
            $parent = Menu::create([
                'title' => 'ข้อมูลรายแผนก',
                'icon' => 'Building2',
                'route' => null,
                'order' => 3,
                'permission_name' => null,
            ]);
        } else {
            $parent->update([
                'title' => 'ข้อมูลรายแผนก',
                'icon' => 'Building2',
                'route' => null,
                'order' => 3,
                'permission_name' => null,
            ]);
        }

        $children = [
            [
                'title' => 'Dashboard รายแผนก',
                'icon' => 'LayoutDashboard',
                'route' => 'department-data.index',
                'order' => 1,
                'permission_name' => 'department-data.index',
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
                'group' => 'ข้อมูลรายแผนก',
            ]);

            foreach (['admin', 'Admin', 'user', 'header', 'Header'] as $roleName) {
                $role = Role::where('name', $roleName)->first();
                if ($role && ! $role->hasPermissionTo($permission)) {
                    $role->givePermissionTo($permission);
                }
            }
        }

        $this->command?->info('อัปเดตเมนูข้อมูลรายแผนกเรียบร้อยแล้ว');
    }
}
