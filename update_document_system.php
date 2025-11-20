<?php

use App\Models\Menu;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// 1. Remove Menu
$menuTitle = 'นำเข้าหนังสือภายนอก';
$menu = Menu::where('title', $menuTitle)->first();
if ($menu) {
    echo "Found menu '{$menuTitle}' (ID: {$menu->id}). Deleting...\n";
    $menu->delete();
    echo "Menu deleted.\n";
} else {
    echo "Menu '{$menuTitle}' not found.\n";
}

// 2. Inspect Tables
echo "\n--- Table Structure: document_approvals ---\n";
$columns = Schema::getColumnListing('document_approvals');
foreach ($columns as $col) {
    echo "- $col\n";
}

echo "\n--- Table Structure: document_distributions ---\n";
$columns = Schema::getColumnListing('document_distributions');
foreach ($columns as $col) {
    echo "- $col\n";
}

echo "\n--- Table Structure: documents ---\n";
$columns = Schema::getColumnListing('documents');
foreach ($columns as $col) {
    echo "- $col\n";
}
