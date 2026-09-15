<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\Schema;

$checks = [
    'vehicle_categories' => ['name', 'icon', 'color', 'description', 'is_active', 'order', 'deleted_at'],
    'vehicles' => ['category_id', 'license_plate', 'brand', 'model', 'color', 'year', 'seats', 'fuel_type', 'vehicle_type', 'description', 'mileage', 'chassis_number', 'engine_number', 'registration_date', 'insurance_expiry', 'tax_expiry', 'last_maintenance_date', 'next_maintenance_date', 'status', 'is_active', 'images', 'deleted_at'],
    'vehicle_bookings' => ['booking_number', 'vehicle_id', 'vehicle_category_id', 'user_id', 'driver_id', 'deleted_at'],
    'maintenance_requests' => ['user_id', 'technician_id', 'resolution_notes', 'deleted_at'],
    'maintenance_categories' => ['name', 'icon', 'color', 'description', 'is_active', 'order', 'deleted_at'],
    'documents' => ['deleted_at'],
    'quality_documents' => ['deleted_at'],
    'hrd_courses' => ['deleted_at'],
    'hrd_modules' => ['order', 'deleted_at'],
    'hrd_lessons' => ['order'],
    'hrd_questions' => ['order'],
    'hrd_answers' => ['order'],
];

foreach ($checks as $table => $expected) {
    if (! Schema::hasTable($table)) {
        echo "TABLE MISSING: {$table}\n";
        continue;
    }
    $cols = Schema::getColumnListing($table);
    $missing = array_values(array_diff($expected, $cols));
    if ($missing) {
        echo "{$table} MISSING: ".implode(', ', $missing)."\n";
    } else {
        echo "{$table}: OK\n";
    }
}
