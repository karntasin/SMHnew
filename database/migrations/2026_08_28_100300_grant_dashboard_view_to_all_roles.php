<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    public function up(): void
    {
        $permission = Permission::findOrCreate('dashboard-view', 'web');

        Role::query()->each(function (Role $role) use ($permission) {
            if (! $role->hasPermissionTo($permission)) {
                $role->givePermissionTo($permission);
            }
        });
    }

    public function down(): void
    {
        $permission = Permission::query()
            ->where('name', 'dashboard-view')
            ->where('guard_name', 'web')
            ->first();

        if (! $permission) {
            return;
        }

        Role::query()
            ->where('name', '!=', 'admin')
            ->each(function (Role $role) use ($permission) {
                if ($role->hasPermissionTo($permission)) {
                    $role->revokePermissionTo($permission);
                }
            });
    }
};
