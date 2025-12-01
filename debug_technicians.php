<?php

use App\Models\User;

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$technicianPositions = ['ช่างส่งกำลัง', 'ช่างIT', 'ช่างไฟฟ้า', 'ช่างประปา', 'ช่างทั่วไป'];
$technicians = User::whereHas('positions', function($q) use ($technicianPositions) {
    $q->whereIn('name', $technicianPositions);
})->get(['id', 'name']);

echo "Technicians count: " . $technicians->count() . "\n";
foreach ($technicians as $tech) {
    echo "- " . $tech->name . " (ID: " . $tech->id . ")\n";
}
