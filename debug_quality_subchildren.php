<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Menu;

$parents = Menu::whereIn('title', ['ตัวชี้วัดคุณภาพ', 'HRD (พัฒนาบุคลากร)'])->get();

foreach ($parents as $parent) {
    echo "Parent: {$parent->title} (ID: {$parent->id})\n";
    $children = Menu::where('parent_id', $parent->id)->orderBy('order')->get();
    foreach ($children as $child) {
        echo "- {$child->title} ({$child->route})\n";
    }
    echo "\n";
}
