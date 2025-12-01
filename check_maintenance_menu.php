<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Menu;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

// 1. Check/Create Permissions
$permissions = [
    'maintenance-view',
    'maintenance-create',
    'maintenance-edit',
    'maintenance-delete',
    'maintenance-assign',
    'maintenance-report',
];

foreach ($permissions as $perm) {
    if (!Permission::where('name', $perm)->exists()) {
        Permission::create(['name' => $perm, 'guard_name' => 'web']);
        echo "Created permission: $perm\n";
    }
}

// 2. Assign Permissions to Roles
$roles = ['admin', 'headtec', 'technician', 'user'];
foreach ($roles as $roleName) {
    $role = Role::where('name', $roleName)->first();
    if ($role) {
        // Admin gets all
        if ($roleName === 'admin') {
            $role->givePermissionTo($permissions);
        }
        // Headtec gets view, create, edit, assign, report
        elseif ($roleName === 'headtec') {
            $role->givePermissionTo(['maintenance-view', 'maintenance-create', 'maintenance-edit', 'maintenance-assign', 'maintenance-report']);
        }
        // Technician gets view, edit (status)
        elseif ($roleName === 'technician') {
            $role->givePermissionTo(['maintenance-view', 'maintenance-edit']);
        }
        // User gets view, create
        elseif ($roleName === 'user') {
            $role->givePermissionTo(['maintenance-view', 'maintenance-create']);
        }
        echo "Updated permissions for role: $roleName\n";
    }
}

// 3. Check/Create Menus
$maintenanceMenu = Menu::where('title', 'ระบบแจ้งซ่อม')->orWhere('title', 'Maintenance System')->first();

if (!$maintenanceMenu) {
    $maintenanceMenu = Menu::create([
        'title' => 'ระบบแจ้งซ่อม',
        'icon' => 'Wrench', // Ensure this icon exists in your mapper
        'route' => '#',
        'order' => 10,
        'permission_name' => 'maintenance-view',
    ]);
    echo "Created parent menu: ระบบแจ้งซ่อม\n";
} else {
    echo "Parent menu exists: " . $maintenanceMenu->title . "\n";
}

// Submenus
$submenus = [
    [
        'title' => 'Dashboard',
        'route' => '/maintenance/dashboard',
        'icon' => 'LayoutDashboard',
        'permission_name' => 'maintenance-view',
    ],
    [
        'title' => 'รายการแจ้งซ่อม',
        'route' => '/maintenance/requests',
        'icon' => 'List',
        'permission_name' => 'maintenance-view',
    ],
    [
        'title' => 'ใบงาน (ช่าง)',
        'route' => '/technician/work-orders',
        'icon' => 'ClipboardList',
        'permission_name' => 'maintenance-view', // Or specific permission
    ],
    [
        'title' => 'ตั้งค่าระบบ',
        'route' => '/maintenance/settings',
        'icon' => 'Settings',
        'permission_name' => 'maintenance-edit', // Admin/Head only
    ],
];

foreach ($submenus as $sub) {
    $exists = Menu::where('route', $sub['route'])->exists();
    if (!$exists) {
        Menu::create([
            'title' => $sub['title'],
            'icon' => $sub['icon'],
            'route' => $sub['route'],
            'parent_id' => $maintenanceMenu->id,
            'order' => 1,
            'permission_name' => $sub['permission_name'],
        ]);
        echo "Created submenu: " . $sub['title'] . "\n";
    } else {
        echo "Submenu exists: " . $sub['title'] . "\n";
    }
}

echo "Done.\n";
