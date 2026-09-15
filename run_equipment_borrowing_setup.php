<?php

/**
 * Setup medical equipment borrowing module (migration + menus)
 * ใช้: .\.php82\php.exe run_equipment_borrowing_setup.php
 */

$php = PHP_BINARY;
if (file_exists(__DIR__.'/.php82/php.exe')) {
    $php = __DIR__.'/.php82/php.exe';
}

echo "=== Medical Equipment Borrowing Setup ===\n\n";

passthru('"'.$php.'" "'.__DIR__.'/artisan" migrate --path=database/migrations/2026_07_10_090000_create_medical_equipment_borrowing_tables.php --force 2>&1', $migrateExit);

if ($migrateExit !== 0) {
    echo "\nMigration failed (exit {$migrateExit}). Check PHP version and database.\n";
    exit(1);
}

passthru('"'.$php.'" "'.__DIR__.'/artisan" db:seed --class=EquipmentBorrowingMenusSeeder --force 2>&1', $seedExit);

if ($seedExit !== 0) {
    echo "\nSeeder failed.\n";
    exit(1);
}

echo "\nเสร็จสิ้น! เปิด Sidebar → งานธุรการ → ระบบยืมอุปกรณ์แพทย์\n";
echo "URL: /equipment-borrowing/dashboard\n";
