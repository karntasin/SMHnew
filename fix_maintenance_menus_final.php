<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Menu;

// 1. Fix Parent Menu
$parent = Menu::where('title', 'ระบบแจ้งซ่อม')->first();
if ($parent) {
    $parent->update([
        'permission_name' => 'maintenance-view',
        'parent_id' => null, // Move to root
        'order' => 10,
    ]);
    echo "Updated parent menu: {$parent->title}\n";
}

// 2. Fix Submenus
$updates = [
    '/maintenance/dashboard' => 'maintenance-view',
    '/maintenance/requests' => 'maintenance-view',
    '/maintenance/requests/create' => 'maintenance-create',
    '/maintenance/settings' => 'maintenance-edit',
];

foreach ($updates as $route => $perm) {
    $menu = Menu::where('route', $route)->first();
    if ($menu) {
        $menu->update(['permission_name' => $perm, 'parent_id' => $parent->id]);
        echo "Updated submenu: {$menu->title} -> $perm\n";
    }
}

// 3. Fix Technician Menu (Old route -> New route)
$techMenu = Menu::where('route', '/maintenance/my-work')->first();
if ($techMenu) {
    $techMenu->update([
        'title' => 'ใบงาน (ช่าง)',
        'route' => '/technician/work-orders',
        'permission_name' => 'maintenance-view',
        'parent_id' => $parent->id
    ]);
    echo "Updated technician menu route.\n";
} else {
    // Check if new route exists
    $newTechMenu = Menu::where('route', '/technician/work-orders')->first();
    if (!$newTechMenu) {
        Menu::create([
            'title' => 'ใบงาน (ช่าง)',
            'route' => '/technician/work-orders',
            'icon' => 'ClipboardList',
            'parent_id' => $parent->id,
            'order' => 5,
            'permission_name' => 'maintenance-view',
        ]);
        echo "Created technician menu.\n";
    } else {
        $newTechMenu->update(['parent_id' => $parent->id, 'permission_name' => 'maintenance-view']);
        echo "Updated existing technician menu.\n";
    }
}

echo "Menu fix complete.\n";
