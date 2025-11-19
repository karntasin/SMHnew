<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== CHECKING งานธรการ MENU ===\n\n";

$parent = \App\Models\Menu::where('title', 'งานธรการ')->first();
if ($parent) {
    echo "Parent Menu: $parent->title\n";
    echo "Route: $parent->route\n";
    echo "Permission: " . ($parent->permission_name ?: 'NONE - THIS IS THE PROBLEM!') . "\n";
    echo "Children count: " . $parent->children->count() . "\n\n";
    
    echo "Updating parent menu to not require permission...\n";
    $parent->permission_name = null;
    $parent->save();
    echo " Updated!\n\n";
    
    echo "Children menus:\n";
    foreach ($parent->children->sortBy('order') as $child) {
        echo "  - $child->title (Permission: " . ($child->permission_name ?: 'none') . ")\n";
    }
}
