<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Menu;

$menu = Menu::find(88);
echo "ID: {$menu->id} | Title: {$menu->title} | Permission: " . ($menu->permission_name ?? 'NULL') . "\n";
