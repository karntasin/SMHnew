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

// Create Incident Reporting Menu
$incidentMenu = Menu::firstOrCreate(
    [
        'title' => 'รายงานอุบัติการณ์',
        'parent_id' => $envMenu->id,
    ],
    [
        'route' => '/env/incidents',
        'icon' => 'AlertTriangle', // Assuming this icon exists in iconMapper
        'order' => 3,
        'is_active' => true,
    ]
);

echo "Menu 'รายงานอุบัติการณ์' created with ID: {$incidentMenu->id}\n";

// Assign permission to Admin role (ID 1 usually)
$role = Role::where('name', 'Admin')->first();
if ($role) {
    // Assuming permissions are handled via a pivot table or similar
    // But for now, if the menu system uses permissions, we might need to create one.
    // Checking MenuController or PermissionController would clarify.
    // However, usually creating the menu is enough if there's no strict permission check on the menu item itself yet,
    // or if the admin has all permissions.
    // Let's check if we need to create a permission for this menu.
    
    $permissionName = 'menu.' . $incidentMenu->id;
    $permission = Permission::firstOrCreate(['name' => $permissionName]);
    $role->givePermissionTo($permission);
    echo "Permission '{$permissionName}' assigned to Admin.\n";
}
