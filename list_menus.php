<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Menu;

$menus = Menu::whereNull('parent_id')->with('children')->get();

foreach ($menus as $menu) {
    echo "ID: {$menu->id} | Title: {$menu->title} | Route: {$menu->route}\n";
    foreach ($menu->children as $child) {
        echo "  - ID: {$child->id} | Title: {$child->title} | Route: {$child->route}\n";
    }
}
