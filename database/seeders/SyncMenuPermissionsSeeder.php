<?php

namespace Database\Seeders;

use App\Models\Menu;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class SyncMenuPermissionsSeeder extends Seeder
{
    /**
     * สร้าง permission จาก permission_name ในเมนู และมอบให้ admin / superUser
     */
    public function run(): void
    {
        $adminRoles = Role::query()
            ->whereIn('name', ['admin', 'superUser'])
            ->get();

        $legacySettingsRoles = Role::query()
            ->whereHas('permissions', fn ($q) => $q->whereIn('name', [
                'settings-view',
                'app-settings-view',
                'access-view',
                'users-view',
                'roles-view',
            ]))
            ->get();

        $grantRoles = $adminRoles
            ->merge($legacySettingsRoles)
            ->unique('id')
            ->values();

        if ($grantRoles->isEmpty()) {
            $this->command?->warn('ไม่พบ role ที่จะมอบสิทธิ์เมนู');

            return;
        }

        $menus = Menu::query()
            ->whereNotNull('permission_name')
            ->orderBy('id')
            ->get();

        $created = 0;
        $assigned = 0;

        foreach ($menus as $menu) {
            $group = $this->resolveGroup($menu);

            $permission = Permission::firstOrCreate(
                ['name' => $menu->permission_name, 'guard_name' => 'web'],
                ['group' => $group],
            );

            if ($permission->wasRecentlyCreated) {
                $created++;
            } elseif ($permission->group !== $group && $group !== 'เมนู') {
                $permission->update(['group' => $group]);
            }

            foreach ($grantRoles as $role) {
                if (! $role->hasPermissionTo($permission)) {
                    $role->givePermissionTo($permission);
                    $assigned++;
                }
            }
        }

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $this->command?->info("Sync menu permissions: created {$created}, role assignments {$assigned}");
    }

    private function resolveGroup(Menu $menu): string
    {
        $parent = $menu->parent_id
            ? Menu::query()->find($menu->parent_id)
            : null;

        if ($parent?->title) {
            return $parent->title;
        }

        return 'เมนู';
    }
}
