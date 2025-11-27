<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Menu;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

// 1. Create permission if not exists
$permName = 'teamha-view';
Permission::firstOrCreate(['name' => $permName, 'guard_name' => 'web']);

// 2. Assign to admin
$role = Role::where('name', 'admin')->first();
if ($role) {
    $role->givePermissionTo($permName);
    echo "Permission '{$permName}' assigned to admin.\n";
}

// 3. Find Settings parent menu
$settings = Menu::where('title', 'Settings')->whereNull('parent_id')->first();

if (!$settings) {
    echo "Settings menu not found!\n";
    exit(1);
}

echo "Settings menu ID: {$settings->id}\n";

// 4. Check if teamha menu already exists
$exists = Menu::where('parent_id', $settings->id)->where('route', '/settings/teamha')->exists();

if (!$exists) {
    Menu::create([
        'title' => 'จัดการทีมHA',
        'route' => '/settings/teamha',
        'parent_id' => $settings->id,
        'order' => 11,
        'icon' => 'Users',
        'permission_name' => $permName,
    ]);
    echo "TeamHA menu added successfully!\n";
} else {
    echo "TeamHA menu already exists.\n";
}

echo "Done!\n";
