<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

$rows = DB::select("SELECT id, title, route, parent_id, `order`, permission_name FROM menus WHERE title LIKE '%เซิร์ฟเวอร์%' OR route LIKE '%server-monitor%'");
foreach ($rows as $r) {
    echo json_encode($r, JSON_UNESCAPED_UNICODE) . PHP_EOL;
}
echo 'MAX_ORDER=' . DB::table('menus')->whereNull('parent_id')->max('order') . PHP_EOL;
