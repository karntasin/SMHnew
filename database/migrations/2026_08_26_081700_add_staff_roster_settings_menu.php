<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        $permission = Permission::firstOrCreate([
            'name' => 'settings.staff.index',
            'guard_name' => 'web',
        ]);

        foreach (['admin', 'superUser'] as $roleName) {
            $role = Role::query()->where('name', $roleName)->first();
            if ($role && ! $role->hasPermissionTo($permission)) {
                $role->givePermissionTo($permission);
            }
        }

        $parentId = DB::table('menus')
            ->where('title', 'ตั้งค่าระบบ')
            ->whereNull('parent_id')
            ->value('id');

        if ($parentId && ! DB::table('menus')->where('route', 'settings.staff.index')->exists()) {
            DB::table('menus')->insert([
                'title' => 'จัดการเจ้าหน้าที่',
                'icon' => 'ClipboardList',
                'route' => 'settings.staff.index',
                'parent_id' => $parentId,
                'order' => 2,
                'permission_name' => 'settings.staff.index',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        DB::table('menus')->where('route', 'settings.staff.index')->delete();
    }
};
