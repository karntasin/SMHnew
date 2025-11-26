<?php

use Illuminate\Support\Facades\DB;

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    echo "Checking 'ipt' table...\n";
    $ipt = DB::connection('hosxp')->table('ipt')->limit(1)->first();
    if ($ipt) {
        echo "Found 'ipt' table. Columns: " . implode(', ', array_keys((array)$ipt)) . "\n";
    } else {
        echo "'ipt' table found but empty.\n";
    }
} catch (\Exception $e) {
    echo "Error accessing 'ipt': " . $e->getMessage() . "\n";
}

try {
    echo "\nChecking 'lab_head' table...\n";
    $lab = DB::connection('hosxp')->table('lab_head')->limit(1)->first();
    if ($lab) {
        echo "Found 'lab_head' table.\n";
    }
} catch (\Exception $e) {
    echo "Error accessing 'lab_head': " . $e->getMessage() . "\n";
}
