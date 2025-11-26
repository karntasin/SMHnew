<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "--- Searching for 'งานธุรการ' ---\n";
$adminMenus = DB::table('menus')->where('title', 'like', '%งานธุรการ%')->get();

foreach ($adminMenus as $adminMenu) {
    echo "Found: {$adminMenu->title} (ID: {$adminMenu->id}, Parent: {$adminMenu->parent_id}, Perm: {$adminMenu->permission_name})\n";
    $children = DB::table('menus')->where('parent_id', $adminMenu->id)->orderBy('order')->get();
    foreach ($children as $child) {
        echo "- {$child->title} (ID: {$child->id}, Route: {$child->route}, Perm: {$child->permission_name})\n";
        $subChildren = DB::table('menus')->where('parent_id', $child->id)->orderBy('order')->get();
        foreach ($subChildren as $sub) {
            echo "  -- {$sub->title} (ID: {$sub->id}, Route: {$sub->route}, Perm: {$sub->permission_name})\n";
        }
    }
}

echo "\n--- Searching for 'งานคุณภาพ' ---\n";
$qualityMenus = DB::table('menus')->where('title', 'like', '%งานคุณภาพ%')->get();
foreach($qualityMenus as $q) {
    echo "Found: {$q->title} (ID: {$q->id}, Parent: {$q->parent_id}, Order: {$q->order})\n";
}
