<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Menu;

$parentId = 9; // Settings

$exists = Menu::where('parent_id', $parentId)->where('route', '/settingsapp/database')->exists();

if (!$exists) {
    Menu::create([
        'title' => 'DB Setting',
        'route' => '/settingsapp/database',
        'parent_id' => $parentId,
        'order' => 4, // After Backup
        'icon' => 'Database', // Lucide icon name
    ]);
    echo "DB Setting menu added successfully.\n";
} else {
    echo "DB Setting menu already exists.\n";
}
