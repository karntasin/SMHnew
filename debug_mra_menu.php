<?php

use Illuminate\Support\Facades\DB;

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$menus = DB::table('menus')->where('title', 'like', '%MRA%')->orWhere('title', 'like', '%งานคุณภาพ%')->get();

echo "Found Menus:\n";
foreach ($menus as $menu) {
    print_r($menu);
}
