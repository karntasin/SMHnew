<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Menu;

function printMenu($parentId = null, $level = 0) {
    $menus = Menu::where('parent_id', $parentId)->orderBy('order')->get();
    
    foreach ($menus as $menu) {
        echo str_repeat("  ", $level) . "- {$menu->title} [{$menu->route}] (ID: {$menu->id})\n";
        printMenu($menu->id, $level + 1);
    }
}

// Find "Quality Work" parent
$qualityParent = Menu::where('title', 'like', '%งานคุณภาพ%')->whereNull('parent_id')->first();

if ($qualityParent) {
    echo "Root: {$qualityParent->title}\n";
    printMenu($qualityParent->id);
}

// Also check for top level menus that might be related but not under "Quality Work" if any (like KM if it was moved)
echo "\n--- Other Top Level ---\n";
$others = Menu::whereNull('parent_id')->whereIn('title', ['KM', 'HRD', 'ENV', 'MRA', 'IC'])->get();
foreach($others as $other) {
    echo "Root: {$other->title}\n";
    printMenu($other->id);
}
