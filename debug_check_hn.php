<?php

use Illuminate\Support\Facades\DB;

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$hn = '560000001';

try {
    echo "Checking HN: $hn\n";
    $patient = DB::connection('hosxp')->table('patient')->where('hn', $hn)->select('hn', 'pname', 'fname', 'lname')->first();
    
    if ($patient) {
        echo "Found Patient:\n";
        echo "HN: {$patient->hn}\n";
        echo "Name: {$patient->pname}{$patient->fname} {$patient->lname}\n";
        echo "First Name (fname): {$patient->fname}\n";
    } else {
        echo "Patient with HN $hn not found.\n";
        
        // Try padding if not found
        $paddedHn = str_pad($hn, 9, '0', STR_PAD_LEFT);
        if ($paddedHn !== $hn) {
             echo "Trying padded HN: $paddedHn\n";
             $patient = DB::connection('hosxp')->table('patient')->where('hn', $paddedHn)->select('hn', 'pname', 'fname', 'lname')->first();
             if ($patient) {
                echo "Found Patient (Padded):\n";
                echo "HN: {$patient->hn}\n";
                echo "Name: {$patient->pname}{$patient->fname} {$patient->lname}\n";
                echo "First Name (fname): {$patient->fname}\n";
             } else {
                 echo "Patient with padded HN $paddedHn not found.\n";
             }
        }
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
