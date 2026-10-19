<?php

use App\Models\Menu;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pharmacy_locations', function (Blueprint $table) {
            $table->string('catalog', 20)->default('drug')->after('type');
            $table->index('catalog');
        });

        $parent = Menu::query()->where('title', 'เภสัชกรรม')->orderBy('id')->first();

        if ($parent) {
            Menu::query()->updateOrCreate(
                [
                    'parent_id' => $parent->id,
                    'route' => 'pharmacy.supplies.index',
                ],
                [
                    'title' => 'คลังเวชภัณฑ์มิใช่ยา',
                    'icon' => 'Package',
                    'order' => 3,
                    'permission_name' => 'pharmacy.inventory.index',
                ]
            );
        }

        $permission = Permission::query()->firstOrCreate([
            'name' => 'pharmacy.inventory.index',
            'guard_name' => 'web',
        ], [
            'group' => 'เภสัชกรรม',
        ]);

        foreach (['admin', 'Admin', 'user', 'header', 'Header'] as $roleName) {
            $role = Role::query()->where('name', $roleName)->first();
            if ($role && ! $role->hasPermissionTo($permission)) {
                $role->givePermissionTo($permission);
            }
        }
    }

    public function down(): void
    {
        Menu::query()->where('route', 'pharmacy.supplies.index')->delete();

        Schema::table('pharmacy_locations', function (Blueprint $table) {
            $table->dropIndex(['catalog']);
            $table->dropColumn('catalog');
        });
    }
};
