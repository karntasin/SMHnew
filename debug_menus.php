<?php

use App\Models\Menu;

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$menus = Menu::whereNull('parent_id')->with('children')->get();

foreach ($menus as $menu) {
    echo "ID: {$menu->id}, Title: {$menu->title}\n";
    foreach ($menu->children as $child) {
        echo "  - ID: {$child->id}, Title: {$child->title}\n";
        foreach ($child->children as $subChild) {
            echo "    - ID: {$subChild->id}, Title: {$subChild->title}\n";
        }
    }
}
