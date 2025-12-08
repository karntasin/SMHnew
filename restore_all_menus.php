<?php

/**
 * Script to restore all menus for the hospital dashboard application
 * Run with: php restore_all_menus.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Menu;
use Illuminate\Support\Facades\DB;

echo "=== Restoring All Menus ===\n\n";

// Clear existing menus
DB::statement('SET FOREIGN_KEY_CHECKS=0;');
Menu::truncate();
DB::statement('SET FOREIGN_KEY_CHECKS=1;');
echo "Cleared existing menus.\n\n";

$menus = [];

// ========================================
// 1. DASHBOARD (หน้าหลัก)
// ========================================
$menus[] = [
    'id' => 1,
    'title' => 'แดชบอร์ด',
    'icon' => 'LayoutDashboard',
    'route' => 'dashboard',
    'parent_id' => null,
    'order' => 1,
    'permission_name' => null,
];

// ========================================
// 2. QUALITY HUB (ศูนย์รวมงานคุณภาพ)
// ========================================
$menus[] = [
    'id' => 10,
    'title' => 'ศูนย์คุณภาพ',
    'icon' => 'Award',
    'route' => null,
    'parent_id' => null,
    'order' => 10,
    'permission_name' => null,
];

// Quality Hub children
$menus[] = [
    'id' => 11,
    'title' => 'ภาพรวมคุณภาพ',
    'icon' => 'Home',
    'route' => 'quality.index',
    'parent_id' => 10,
    'order' => 1,
    'permission_name' => 'quality.index',
];

$menus[] = [
    'id' => 12,
    'title' => 'คลังเอกสารคุณภาพ',
    'icon' => 'FileText',
    'route' => 'quality-docs.index',
    'parent_id' => 10,
    'order' => 2,
    'permission_name' => 'quality-docs.index',
];

$menus[] = [
    'id' => 13,
    'title' => 'ตัวชี้วัดคุณภาพ',
    'icon' => 'BarChart3',
    'route' => 'quality-indicators.index',
    'parent_id' => 10,
    'order' => 3,
    'permission_name' => 'quality-indicators.index',
];

$menus[] = [
    'id' => 14,
    'title' => 'การติดตามทบทวน',
    'icon' => 'ClipboardCheck',
    'route' => 'quality-assurance.index',
    'parent_id' => 10,
    'order' => 4,
    'permission_name' => 'quality-assurance.index',
];

$menus[] = [
    'id' => 15,
    'title' => 'MRA (ความถูกต้องเวชระเบียน)',
    'icon' => 'FileSearch',
    'route' => 'mra.index',
    'parent_id' => 10,
    'order' => 5,
    'permission_name' => 'mra.index',
];

$menus[] = [
    'id' => 16,
    'title' => 'IC (การควบคุมการติดเชื้อ)',
    'icon' => 'Shield',
    'route' => 'ic.index',
    'parent_id' => 10,
    'order' => 6,
    'permission_name' => 'ic.index',
];

// ========================================
// 3. ADMIN HUB (งานธุรการ)
// ========================================
$menus[] = [
    'id' => 20,
    'title' => 'งานธุรการ',
    'icon' => 'Building',
    'route' => null,
    'parent_id' => null,
    'order' => 20,
    'permission_name' => null,
];

$menus[] = [
    'id' => 21,
    'title' => 'ภาพรวมธุรการ',
    'icon' => 'Home',
    'route' => 'admin.hub',
    'parent_id' => 20,
    'order' => 1,
    'permission_name' => 'admin.hub',
];

$menus[] = [
    'id' => 22,
    'title' => 'จองห้องประชุม',
    'icon' => 'CalendarDays',
    'route' => 'rooms.index',
    'parent_id' => 20,
    'order' => 2,
    'permission_name' => 'rooms.index',
];

$menus[] = [
    'id' => 23,
    'title' => 'ปฏิทินห้องประชุม',
    'icon' => 'Calendar',
    'route' => 'rooms.calendar',
    'parent_id' => 20,
    'order' => 3,
    'permission_name' => 'rooms.calendar',
];

// ========================================
// 4. VEHICLE SYSTEM (ระบบจองรถ)
// ========================================
$menus[] = [
    'id' => 30,
    'title' => 'ระบบจองรถ',
    'icon' => 'Car',
    'route' => null,
    'parent_id' => null,
    'order' => 30,
    'permission_name' => null,
];

$menus[] = [
    'id' => 31,
    'title' => 'รายการจองรถ',
    'icon' => 'List',
    'route' => 'vehicles.bookings.index',
    'parent_id' => 30,
    'order' => 1,
    'permission_name' => 'vehicles.bookings.index',
];

$menus[] = [
    'id' => 32,
    'title' => 'การจองของฉัน',
    'icon' => 'User',
    'route' => 'vehicles.bookings.my',
    'parent_id' => 30,
    'order' => 2,
    'permission_name' => 'vehicles.bookings.my',
];

$menus[] = [
    'id' => 33,
    'title' => 'สร้างการจอง',
    'icon' => 'Plus',
    'route' => 'vehicles.bookings.create',
    'parent_id' => 30,
    'order' => 3,
    'permission_name' => 'vehicles.bookings.create',
];

$menus[] = [
    'id' => 34,
    'title' => 'ปฏิทินจองรถ',
    'icon' => 'Calendar',
    'route' => 'vehicles.calendar',
    'parent_id' => 30,
    'order' => 4,
    'permission_name' => 'vehicles.calendar',
];

$menus[] = [
    'id' => 35,
    'title' => 'จัดการรถยนต์',
    'icon' => 'Settings',
    'route' => 'vehicles.manage.index',
    'parent_id' => 30,
    'order' => 5,
    'permission_name' => 'vehicles.manage.index',
];

$menus[] = [
    'id' => 36,
    'title' => 'ตั้งค่าระบบรถ',
    'icon' => 'Cog',
    'route' => 'vehicles.settings.index',
    'parent_id' => 30,
    'order' => 6,
    'permission_name' => 'vehicles.settings.index',
];

// ========================================
// 5. DOCUMENT SYSTEM (ระบบรับส่งหนังสือ)
// ========================================
$menus[] = [
    'id' => 40,
    'title' => 'ระบบหนังสือ',
    'icon' => 'Mail',
    'route' => null,
    'parent_id' => null,
    'order' => 40,
    'permission_name' => null,
];

$menus[] = [
    'id' => 41,
    'title' => 'แดชบอร์ดหนังสือ',
    'icon' => 'LayoutDashboard',
    'route' => 'documents.dashboard',
    'parent_id' => 40,
    'order' => 1,
    'permission_name' => 'documents.dashboard',
];

$menus[] = [
    'id' => 42,
    'title' => 'รายการหนังสือ',
    'icon' => 'List',
    'route' => 'documents.index',
    'parent_id' => 40,
    'order' => 2,
    'permission_name' => 'documents.index',
];

$menus[] = [
    'id' => 43,
    'title' => 'สร้างหนังสือใหม่',
    'icon' => 'FilePlus',
    'route' => 'documents.create',
    'parent_id' => 40,
    'order' => 3,
    'permission_name' => 'documents.create',
];

// ========================================
// 6. MAINTENANCE SYSTEM (ระบบแจ้งซ่อม)
// ========================================
$menus[] = [
    'id' => 50,
    'title' => 'ระบบแจ้งซ่อม',
    'icon' => 'Wrench',
    'route' => null,
    'parent_id' => null,
    'order' => 50,
    'permission_name' => null,
];

$menus[] = [
    'id' => 51,
    'title' => 'แดชบอร์ดแจ้งซ่อม',
    'icon' => 'LayoutDashboard',
    'route' => 'maintenance.dashboard',
    'parent_id' => 50,
    'order' => 1,
    'permission_name' => 'maintenance.dashboard',
];

$menus[] = [
    'id' => 52,
    'title' => 'รายการแจ้งซ่อมทั้งหมด',
    'icon' => 'List',
    'route' => 'maintenance.requests.index',
    'parent_id' => 50,
    'order' => 2,
    'permission_name' => 'maintenance.requests.index',
];

$menus[] = [
    'id' => 53,
    'title' => 'แจ้งซ่อมของฉัน',
    'icon' => 'User',
    'route' => 'maintenance.requests.my',
    'parent_id' => 50,
    'order' => 3,
    'permission_name' => 'maintenance.requests.my',
];

$menus[] = [
    'id' => 54,
    'title' => 'สร้างใบแจ้งซ่อม',
    'icon' => 'Plus',
    'route' => 'maintenance.requests.create',
    'parent_id' => 50,
    'order' => 4,
    'permission_name' => 'maintenance.requests.create',
];

$menus[] = [
    'id' => 55,
    'title' => 'ตั้งค่าระบบแจ้งซ่อม',
    'icon' => 'Settings',
    'route' => 'maintenance.settings.index',
    'parent_id' => 50,
    'order' => 5,
    'permission_name' => 'maintenance.settings.index',
];

// ========================================
// 7. TECHNICIAN WORK ORDERS (ใบงานช่าง)
// ========================================
$menus[] = [
    'id' => 60,
    'title' => 'ใบงานช่าง',
    'icon' => 'HardHat',
    'route' => null,
    'parent_id' => null,
    'order' => 60,
    'permission_name' => null,
];

$menus[] = [
    'id' => 61,
    'title' => 'รายการใบงาน',
    'icon' => 'ClipboardList',
    'route' => 'technician.work-orders.index',
    'parent_id' => 60,
    'order' => 1,
    'permission_name' => 'technician.work-orders.index',
];

// ========================================
// 8. KM SYSTEM (การจัดการความรู้)
// ========================================
$menus[] = [
    'id' => 70,
    'title' => 'การจัดการความรู้',
    'icon' => 'BookOpen',
    'route' => null,
    'parent_id' => null,
    'order' => 70,
    'permission_name' => null,
];

$menus[] = [
    'id' => 71,
    'title' => 'แดชบอร์ด KM',
    'icon' => 'LayoutDashboard',
    'route' => 'km.dashboard',
    'parent_id' => 70,
    'order' => 1,
    'permission_name' => 'km.dashboard',
];

$menus[] = [
    'id' => 72,
    'title' => 'คลังความรู้',
    'icon' => 'Library',
    'route' => 'km.assets.index',
    'parent_id' => 70,
    'order' => 2,
    'permission_name' => 'km.assets.index',
];

$menus[] = [
    'id' => 73,
    'title' => 'E-Learning',
    'icon' => 'GraduationCap',
    'route' => 'km.learn.index',
    'parent_id' => 70,
    'order' => 3,
    'permission_name' => 'km.learn.index',
];

$menus[] = [
    'id' => 74,
    'title' => 'การอบรมของฉัน',
    'icon' => 'UserCheck',
    'route' => 'km.learn.my-training',
    'parent_id' => 70,
    'order' => 4,
    'permission_name' => 'km.learn.my-training',
];

$menus[] = [
    'id' => 75,
    'title' => 'ทักษะของฉัน',
    'icon' => 'Star',
    'route' => 'km.learn.my-skills',
    'parent_id' => 70,
    'order' => 5,
    'permission_name' => 'km.learn.my-skills',
];

// ========================================
// 9. ENV SYSTEM (ระบบสิ่งแวดล้อม)
// ========================================
$menus[] = [
    'id' => 80,
    'title' => 'ระบบสิ่งแวดล้อม',
    'icon' => 'Leaf',
    'route' => null,
    'parent_id' => null,
    'order' => 80,
    'permission_name' => null,
];

$menus[] = [
    'id' => 81,
    'title' => 'ภาพรวม ENV',
    'icon' => 'Home',
    'route' => 'env.index',
    'parent_id' => 80,
    'order' => 1,
    'permission_name' => 'env.index',
];

$menus[] = [
    'id' => 82,
    'title' => 'ทรัพย์สิน',
    'icon' => 'Package',
    'route' => 'env.assets.index',
    'parent_id' => 80,
    'order' => 2,
    'permission_name' => 'env.assets.index',
];

$menus[] = [
    'id' => 83,
    'title' => 'PM Tracking',
    'icon' => 'Clock',
    'route' => 'env.pm.index',
    'parent_id' => 80,
    'order' => 3,
    'permission_name' => 'env.pm.index',
];

$menus[] = [
    'id' => 84,
    'title' => 'เหตุการณ์',
    'icon' => 'AlertTriangle',
    'route' => 'env.incidents.index',
    'parent_id' => 80,
    'order' => 4,
    'permission_name' => 'env.incidents.index',
];

$menus[] = [
    'id' => 85,
    'title' => 'สาธารณูปโภค',
    'icon' => 'Zap',
    'route' => 'env.utility.index',
    'parent_id' => 80,
    'order' => 5,
    'permission_name' => 'env.utility.index',
];

// ========================================
// 10. FINANCE DASHBOARD
// ========================================
$menus[] = [
    'id' => 90,
    'title' => 'รายงานการเงิน',
    'icon' => 'DollarSign',
    'route' => 'finance.dashboard',
    'parent_id' => null,
    'order' => 90,
    'permission_name' => 'finance.dashboard',
];

// ========================================
// 11. HOSxP REPORTS
// ========================================
$menus[] = [
    'id' => 95,
    'title' => 'รายงาน HOSxP',
    'icon' => 'Database',
    'route' => 'hosxp-reports.index',
    'parent_id' => null,
    'order' => 95,
    'permission_name' => 'hosxp-reports.index',
];

// ========================================
// 12. NOTIFICATIONS
// ========================================
$menus[] = [
    'id' => 96,
    'title' => 'การแจ้งเตือน',
    'icon' => 'Bell',
    'route' => 'notifications.index',
    'parent_id' => null,
    'order' => 96,
    'permission_name' => 'notifications.index',
];

// ========================================
// 100. ADMIN / SETTINGS (ตั้งค่าระบบ)
// ========================================
$menus[] = [
    'id' => 100,
    'title' => 'ตั้งค่าระบบ',
    'icon' => 'Settings',
    'route' => null,
    'parent_id' => null,
    'order' => 100,
    'permission_name' => null,
];

$menus[] = [
    'id' => 101,
    'title' => 'จัดการผู้ใช้',
    'icon' => 'Users',
    'route' => 'users.index',
    'parent_id' => 100,
    'order' => 1,
    'permission_name' => 'users.index',
];

$menus[] = [
    'id' => 102,
    'title' => 'จัดการบทบาท',
    'icon' => 'UserCog',
    'route' => 'roles.index',
    'parent_id' => 100,
    'order' => 2,
    'permission_name' => 'roles.index',
];

$menus[] = [
    'id' => 103,
    'title' => 'จัดการสิทธิ์',
    'icon' => 'Key',
    'route' => 'permissions.index',
    'parent_id' => 100,
    'order' => 3,
    'permission_name' => 'permissions.index',
];

$menus[] = [
    'id' => 104,
    'title' => 'จัดการเมนู',
    'icon' => 'Menu',
    'route' => 'menus.index',
    'parent_id' => 100,
    'order' => 4,
    'permission_name' => 'menus.index',
];

$menus[] = [
    'id' => 105,
    'title' => 'ตั้งค่าตำแหน่ง',
    'icon' => 'Briefcase',
    'route' => 'settings.positions.index',
    'parent_id' => 100,
    'order' => 5,
    'permission_name' => 'settings.positions.index',
];

$menus[] = [
    'id' => 106,
    'title' => 'ตั้งค่าทีม HA',
    'icon' => 'Users',
    'route' => 'settings.teamha.index',
    'parent_id' => 100,
    'order' => 6,
    'permission_name' => 'settings.teamha.index',
];

$menus[] = [
    'id' => 107,
    'title' => 'ตั้งค่าแผนก',
    'icon' => 'Building2',
    'route' => 'settings.departments.index',
    'parent_id' => 100,
    'order' => 7,
    'permission_name' => 'settings.departments.index',
];

$menus[] = [
    'id' => 108,
    'title' => 'ตั้งค่าแอปพลิเคชัน',
    'icon' => 'Cog',
    'route' => 'setting.edit',
    'parent_id' => 100,
    'order' => 8,
    'permission_name' => 'setting.edit',
];

$menus[] = [
    'id' => 109,
    'title' => 'ตั้งค่าฐานข้อมูล',
    'icon' => 'Database',
    'route' => 'setting.database',
    'parent_id' => 100,
    'order' => 9,
    'permission_name' => 'setting.database',
];

$menus[] = [
    'id' => 110,
    'title' => 'ประวัติการใช้งาน',
    'icon' => 'History',
    'route' => 'audit-logs.index',
    'parent_id' => 100,
    'order' => 10,
    'permission_name' => 'audit-logs.index',
];

$menus[] = [
    'id' => 111,
    'title' => 'สำรองข้อมูล',
    'icon' => 'HardDrive',
    'route' => 'backup.index',
    'parent_id' => 100,
    'order' => 11,
    'permission_name' => 'backup.index',
];

$menus[] = [
    'id' => 112,
    'title' => 'ไฟล์ของฉัน',
    'icon' => 'FolderOpen',
    'route' => 'files.index',
    'parent_id' => 100,
    'order' => 12,
    'permission_name' => 'files.index',
];

// Insert all menus - first insert parent menus, then children
echo "Inserting parent menus...\n";

// First pass: insert only parent menus (parent_id = null)
foreach ($menus as $menu) {
    if ($menu['parent_id'] === null) {
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
        echo "  ✓ Created parent: {$menu['title']} (#{$menu['id']})\n";
    }
}

echo "\nInserting child menus...\n";

// Second pass: insert child menus
foreach ($menus as $menu) {
    if ($menu['parent_id'] !== null) {
        DB::table('menus')->insert([
            'id' => $menu['id'],
            'title' => $menu['title'],
            'icon' => $menu['icon'],
            'route' => $menu['route'],
            'parent_id' => $menu['parent_id'],
            'order' => $menu['order'],
            'permission_name' => $menu['permission_name'],
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        echo "  ✓ Created child: {$menu['title']} (#{$menu['id']})\n";
    }
}

echo "\n=== Menu Restoration Complete ===\n";
echo "Total menus created: " . count($menus) . "\n";
echo "\nMenu structure:\n";

// Display menu structure
$rootMenus = Menu::whereNull('parent_id')->orderBy('order')->get();
foreach ($rootMenus as $root) {
    echo "\n📁 {$root->title} (#{$root->id})\n";
    $children = Menu::where('parent_id', $root->id)->orderBy('order')->get();
    foreach ($children as $child) {
        echo "   └── {$child->title} (#{$child->id})\n";
    }
}

echo "\n✅ Done!\n";
