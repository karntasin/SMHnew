<?php

/**
 * Script to simplify menus - reduce to main hub categories only
 * Run with: php simplify_menus.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Menu;
use Illuminate\Support\Facades\DB;

echo "=== Simplifying Menus ===\n\n";

// Clear existing menus
DB::statement('SET FOREIGN_KEY_CHECKS=0;');
Menu::truncate();
DB::statement('SET FOREIGN_KEY_CHECKS=1;');
echo "Cleared existing menus.\n\n";

$menus = [
    // 1. Dashboard
    [
        'id' => 1,
        'title' => 'แดชบอร์ด',
        'icon' => 'LayoutDashboard',
        'route' => 'dashboard',
        'parent_id' => null,
        'order' => 1,
        'permission_name' => null,
    ],
    
    // 2. Quality Hub (ศูนย์พัฒนาคุณภาพ) - Link to hub page
    [
        'id' => 10,
        'title' => 'ศูนย์พัฒนาคุณภาพ',
        'icon' => 'Award',
        'route' => 'quality.index',
        'parent_id' => null,
        'order' => 10,
        'permission_name' => null,
    ],
    
    // 3. Admin Hub (งานธุรการ) - Link to hub page
    [
        'id' => 20,
        'title' => 'งานธุรการ',
        'icon' => 'Building',
        'route' => 'admin.hub',
        'parent_id' => null,
        'order' => 20,
        'permission_name' => null,
    ],
    
    // 4. Finance Dashboard
    [
        'id' => 30,
        'title' => 'Finance Reports',
        'icon' => 'DollarSign',
        'route' => null,
        'parent_id' => null,
        'order' => 30,
        'permission_name' => null,
    ],
    [
        'id' => 301,
        'title' => 'BMS Dashboard',
        'icon' => 'Layout',
        'route' => 'finance.dashboard',
        'parent_id' => 30,
        'order' => 1,
        'permission_name' => 'finance.dashboard',
    ],
    [
        'id' => 302,
        'title' => 'HOSxP Revenue by Coverage',
        'icon' => 'BarChart3',
        'route' => 'finance.revenue',
        'parent_id' => 30,
        'order' => 2,
        'permission_name' => 'finance.revenue',
    ],
    
    // 5. HOSxP Reports
    [
        'id' => 40,
        'title' => 'รายงาน HOSxP',
        'icon' => 'Database',
        'route' => 'hosxp-reports.index',
        'parent_id' => null,
        'order' => 40,
        'permission_name' => null,
    ],
    
    // 6. Notifications
    [
        'id' => 50,
        'title' => 'การแจ้งเตือน',
        'icon' => 'Bell',
        'route' => 'notifications.index',
        'parent_id' => null,
        'order' => 50,
        'permission_name' => null,
    ],
    
    // 7. Settings Hub (ตั้งค่าระบบ) - Link to hub page
    [
        'id' => 100,
        'title' => 'ตั้งค่าระบบ',
        'icon' => 'Settings',
        'route' => 'settings.hub',
        'parent_id' => null,
        'order' => 100,
        'permission_name' => null,
    ],
];

// Insert menus
echo "Inserting simplified menus...\n";

foreach ($menus as $menu) {
    DB::table('menus')->insert([
        'id' => $menu['id'],
        'title' => $menu['title'],
        'icon' => $menu['icon'],
        'route' => $menu['route'],
        'parent_id' => null,
        'order' => $menu['order'],
        'permission_name' => $menu['permission_name'],
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    echo "  ✓ Created: {$menu['title']} -> {$menu['route']}\n";
}

echo "\n=== Menu Simplification Complete ===\n";
echo "Total menus: " . count($menus) . "\n";

echo "\nNew Sidebar Structure:\n";
echo "┌────────────────────────────────────┐\n";
echo "│ 📊 แดชบอร์ด                         │\n";
echo "│ 🏆 ศูนย์พัฒนาคุณภาพ      → Quality Hub   │\n";
echo "│ 🏢 งานธุรการ        → Admin Hub     │\n";
echo "│ 💰 รายงานการเงิน                    │\n";
echo "│ 📊 รายงาน HOSxP                     │\n";
echo "│ 🔔 การแจ้งเตือน                     │\n";
echo "│ ⚙️  ตั้งค่าระบบ      → Settings Hub │\n";
echo "└────────────────────────────────────┘\n";

echo "\n✅ Done!\n";
