<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Menu;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

echo "Creating HOSxP Report menu...\n";

// 1. Create Permission
$permissionName = 'hosxp_reports.view';
$permission = Permission::firstOrCreate(['name' => $permissionName, 'guard_name' => 'web']);
echo "Permission created/found: $permissionName\n";

// 2. Assign to Admin role (and maybe others)
$roles = ['Super Admin', 'Admin'];
foreach ($roles as $roleName) {
    $role = Role::where('name', $roleName)->first();
    if ($role) {
        $role->givePermissionTo($permission);
        echo "Permission assigned to $roleName\n";
    }
}

// 3. Create Menu
// Check if exists by route
$menu = Menu::where('route', '/hosxp-reports')->first();

if (!$menu) {
    $menu = new Menu();
    $menu->route = '/hosxp-reports';
    $menu->title = 'รายงาน HOSxP';
    $menu->icon = 'FileSpreadsheet';
    $menu->parent_id = null;
    $menu->order = 99;
    // $menu->is_active = true; // Column does not exist
    $menu->permission_name = $permissionName;
    $menu->save();
    echo "Menu created: รายงาน HOSxP\n";
} else {
    $menu->title = 'รายงาน HOSxP';
    $menu->icon = 'FileSpreadsheet';
    $menu->permission_name = $permissionName;
    $menu->save();
    echo "Menu updated: รายงาน HOSxP\n";
}

echo "\nDone!\n";
