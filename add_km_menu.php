<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Menu;

$parent = Menu::find(60);

if ($parent) {
    // Check if already exists
    $exists = Menu::where('parent_id', 60)->where('route', '/km/dashboard')->exists();
    
    if (!$exists) {
        Menu::create([
            'title' => 'KM (Knowledge Management)',
            'route' => '/km/dashboard',
            'parent_id' => 60,
            'order' => 10, // Adjust order as needed
            'icon' => 'BookOpen', // Assuming icon column exists and uses Lucide names or similar
        ]);
        echo "KM menu added successfully.\n";
    } else {
        echo "KM menu already exists.\n";
    }
} else {
    echo "Parent menu (ID 60) not found.\n";
}
