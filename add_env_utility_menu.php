<?php

use App\Models\Menu;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Find ENV menu
$envMenu = Menu::where('title', 'ENV')->first();

if (!$envMenu) {
    echo "ENV menu not found!\n";
    exit(1);
}

// Create Utility Monitoring Menu
$utilityMenu = Menu::firstOrCreate(
    [
        'title' => 'ตรวจสอบระบบสาธารณูปโภค',
        'parent_id' => $envMenu->id,
    ],
    [
        'route' => '/env/utility',
        'icon' => 'Activity', // Assuming this icon exists in iconMapper
        'order' => 4,
        'is_active' => true,
    ]
);

echo "Menu 'ตรวจสอบระบบสาธารณูปโภค' created with ID: {$utilityMenu->id}\n";

// Assign permission to Admin role
$role = Role::where('name', 'Admin')->first();
if ($role) {
    $permissionName = 'menu.' . $utilityMenu->id;
    $permission = Permission::firstOrCreate(['name' => $permissionName]);
    $role->givePermissionTo($permission);
    echo "Permission '{$permissionName}' assigned to Admin.\n";
}
