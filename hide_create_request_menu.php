<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Menu;

// Hide "แจ้งซ่อมใหม่" (ID 32)
$menu = Menu::where('route', '/maintenance/requests/create')->first();
if ($menu) {
    echo "Deleting menu: {$menu->title} (ID: {$menu->id})\n";
    $menu->delete();
} else {
    echo "Menu '/maintenance/requests/create' not found.\n";
}

echo "Done.\n";
