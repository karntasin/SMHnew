<?php
/**
 * Script to create technician positions for maintenance notification
 * Run: php create_technician_positions.php
 */

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Position;

$positions = [
    [
        'name' => 'ช่างส่งกำลัง',
        'description' => 'ช่างซ่อมบำรุงทั่วไป รับผิดชอบงานซ่อมทั้งหมด ยกเว้นงาน IT',
    ],
    [
        'name' => 'ช่างIT',
        'description' => 'ช่างซ่อมบำรุงคอมพิวเตอร์และระบบ IT',
    ],
];

foreach ($positions as $positionData) {
    $position = Position::firstOrCreate(
        ['name' => $positionData['name']],
        ['description' => $positionData['description']]
    );
    
    if ($position->wasRecentlyCreated) {
        echo "✅ Created position: {$positionData['name']}\n";
    } else {
        echo "ℹ️ Position already exists: {$positionData['name']}\n";
    }
}

echo "\n✅ Done! Technician positions are ready.\n";
echo "\nNote: Please assign users to these positions via:\n";
echo "  - Settings > ตำแหน่งงาน\n";
echo "  - Or Users management page\n";
