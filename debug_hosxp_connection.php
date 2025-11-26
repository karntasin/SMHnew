<?php

use Illuminate\Support\Facades\DB;

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    echo "Testing HOSxP connection...\n";
    $patient = DB::connection('hosxp')->table('patient')->select('hn', 'pname', 'fname', 'lname')->limit(1)->first();
    
    if ($patient) {
        echo "Connection Successful!\n";
        echo "HN: {$patient->hn}\n";
        echo "Name: {$patient->pname}{$patient->fname} {$patient->lname}\n";
        echo "Raw fname (hex): " . bin2hex($patient->fname) . "\n";
    } else {
        echo "Connection successful but no patients found.\n";
    }
} catch (\Exception $e) {
    echo "Connection Failed: " . $e->getMessage() . "\n";
}
