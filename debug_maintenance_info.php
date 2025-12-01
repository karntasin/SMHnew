<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Menu;
use Spatie\Permission\Models\Role;

echo "--- Maintenance Menus ---\n";
$menus = Menu::where('route', 'like', '%maintenance%')->orWhere('title', 'like', '%แจ้งซ่อม%')->get();
foreach ($menus as $menu) {
    echo "ID: {$menu->id} | Title: {$menu->title} | Route: {$menu->route} | Parent: {$menu->parent_id}\n";
}

echo "\n--- Roles ---\n";
$roles = Role::all();
foreach ($roles as $role) {
    echo "Role: {$role->name}\n";
}
