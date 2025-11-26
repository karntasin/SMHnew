<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Menu;

$menu = Menu::where('route', '/quality')->first();

if ($menu) {
    $menu->title = 'ศูนย์รวมงานคุณภาพ (Quality Hub)';
    $menu->icon = 'Star';
    $menu->order = 0; // Move to top for visibility test
    $menu->save();
    echo "Updated menu: {$menu->title}\n";
} else {
    echo "Menu not found.\n";
}
