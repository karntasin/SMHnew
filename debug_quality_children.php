<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Menu;

$parent = Menu::where('title', 'like', '%งานคุณภาพ%')->whereNull('parent_id')->first();

if ($parent) {
    echo "Parent: {$parent->title} (ID: {$parent->id})\n";
    $children = Menu::where('parent_id', $parent->id)->orderBy('order')->get();
    foreach ($children as $child) {
        echo "- {$child->title} ({$child->route})\n";
    }
} else {
    echo "Parent menu 'งานคุณภาพ' not found.\n";
}
