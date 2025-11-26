<?php

use Illuminate\Support\Facades\DB;

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$children = DB::table('menus')->where('parent_id', 60)->get();

echo "Children of ID 60:\n";
foreach ($children as $menu) {
    echo "ID: {$menu->id} | Title: {$menu->title}\n";
}
