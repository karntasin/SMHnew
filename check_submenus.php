<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== ALL MENUS (Hierarchy) ===\n\n";

$menus = \App\Models\Menu::whereNull('parent_id')
    ->with('children')
    ->orderBy('order')
    ->get();

foreach ($menus as $menu) {
    $title = $menu->title ?: '[NO TITLE]';
    echo "{$title} ({$menu->route}) - Permission: " . ($menu->permission_name ?: 'none') . "\n";
    
    if ($menu->children && $menu->children->count() > 0) {
        foreach ($menu->children->sortBy('order') as $child) {
            $childTitle = $child->title ?: '[NO TITLE]';
            echo "  โ””โ”€ {$childTitle} ({$child->route}) - Permission: " . ($child->permission_name ?: 'none') . "\n";
        }
    }
}

echo "\n=== MENUS WITH EMPTY/NULL TITLES ===\n";
$emptyTitles = \App\Models\Menu::whereNull('title')->orWhere('title', '')->get();
if ($emptyTitles->count() > 0) {
    foreach ($emptyTitles as $menu) {
        echo "ID: {$menu->id} | Route: {$menu->route} | Icon: {$menu->icon} | Permission: {$menu->permission_name} | Parent: {$menu->parent_id}\n";
    }
} else {
    echo "None found.\n";
}

echo "\n=== USER's CURRENT PERMISSIONS ===\n";
$user = \App\Models\User::first();
echo "User: {$user->name}\n";
echo "Permissions:\n";
foreach ($user->getAllPermissions() as $perm) {
    echo "  - {$perm->name}\n";
}
