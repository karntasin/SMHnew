<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "Updating Administrative Hub Menu...\n";

// 1. Create or Update "Administrative Hub"
$hubTitle = 'ศูนย์รวมงานธุรการ';
$hubRoute = '/admin-hub';

$existingHub = DB::table('menus')->where('route', $hubRoute)->first();

if ($existingHub) {
    echo "Updating existing Hub menu...\n";
    DB::table('menus')->where('id', $existingHub->id)->update([
        'title' => $hubTitle,
        'icon' => 'LayoutDashboard', // Using a generic dashboard icon
        'order' => 1, // Place it after Quality Hub (which is 0)
        'parent_id' => null
    ]);
} else {
    echo "Creating new Hub menu...\n";
    DB::table('menus')->insert([
        'title' => $hubTitle,
        'route' => $hubRoute,
        'icon' => 'LayoutDashboard',
        'order' => 1,
        'parent_id' => null,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
}

// 2. Hide "งานธุรการ" (Administrative Work)
// Based on previous dump, ID is 2, but let's search by title to be safe
$adminMenu = DB::table('menus')->where('title', 'like', 'งานธุรการ')->first();
if ($adminMenu) {
    echo "Hiding 'งานธุรการ' (ID: {$adminMenu->id})...\n";
    DB::table('menus')->where('id', $adminMenu->id)->update(['permission_name' => 'menu.hidden']);
} else {
    echo "Warning: 'งานธุรการ' menu not found.\n";
}

// 3. Hide "ระบบงานคุณภาพ" (Quality Work) - The OLD one
// Based on previous dump, ID is 60
$qualityMenu = DB::table('menus')->where('title', 'like', 'ระบบงานคุณภาพ')->first();
if ($qualityMenu) {
    echo "Hiding 'ระบบงานคุณภาพ' (ID: {$qualityMenu->id})...\n";
    DB::table('menus')->where('id', $qualityMenu->id)->update(['permission_name' => 'menu.hidden']);
} else {
    echo "Warning: 'ระบบงานคุณภาพ' menu not found.\n";
}

echo "Menu update complete.\n";
