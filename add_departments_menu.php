<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Menu;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

// 1. Create permission if not exists
$permName = 'departments-view';
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

// 4. Check if departments menu already exists
$exists = Menu::where('parent_id', $settings->id)->where('route', '/settings/departments')->exists();

if (!$exists) {
    Menu::create([
        'title' => 'จัดการแผนก',
        'route' => '/settings/departments',
        'parent_id' => $settings->id,
        'order' => 12,
        'icon' => 'Building2',
        'permission_name' => $permName,
    ]);
    echo "Departments menu added successfully!\n";
} else {
    echo "Departments menu already exists.\n";
}

echo "Done!\n";
