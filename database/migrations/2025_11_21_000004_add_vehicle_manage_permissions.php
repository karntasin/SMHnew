<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    public function up()
    {
        // Create permissions if they don't exist
        $permissions = [
            'vehicle.manage',
            'vehicle.settings',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }

        // Assign to admin
        $role = Role::where('name', 'admin')->first();
        if ($role) {
            $role->givePermissionTo($permissions);
        }
    }

    public function down()
    {
        //
    }
};
