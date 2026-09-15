<?php

/**
 * ตั้งค่าเมนู "ตรวจสอบเซิร์ฟเวอร์" — ล่างสุดใน sidebar, เฉพาะ admin
 * ใช้: php run_server_monitor_menu.php
 */

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Menu;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

echo "=== Server Monitor Menu Setup ===\n\n";

$permissionName = 'server-monitor.index';
$route = 'server-monitor.index';
$title = 'ตรวจสอบเซิร์ฟเวอร์';
$icon = 'Activity';

// 1. Permission — เฉพาะ admin
$permission = Permission::firstOrCreate(
    ['name' => $permissionName, 'guard_name' => 'web'],
    ['group' => 'ระบบ']
);

$adminRoles = ['Super Admin', 'Admin', 'admin'];
foreach ($adminRoles as $roleName) {
    $role = Role::where('name', $roleName)->first();
    if ($role && ! $role->hasPermissionTo($permission)) {
        $role->givePermissionTo($permission);
        echo "ให้สิทธิ์ {$permissionName} แก่ {$roleName}\n";
    }
}

// 2. ลบเมนูซ้ำ / ผิดรูปแบบ
$deleted = Menu::query()
    ->where(function ($q) use ($route, $title) {
        $q->where('route', 'like', '%server-monitor%')
            ->orWhere('title', $title);
    })
    ->delete();
if ($deleted > 0) {
    echo "ลบเมนูเก่า/ซ้ำ {$deleted} รายการ\n";
}

// 3. สร้างเมนูเดียว — ล่างสุด (หลังตั้งค่าระบบ order 100)
$maxOrder = (int) Menu::query()->whereNull('parent_id')->max('order');
$order = max($maxOrder + 1, 101);

Menu::create([
    'title' => $title,
    'icon' => $icon,
    'route' => $route,
    'parent_id' => null,
    'order' => $order,
    'permission_name' => $permissionName,
]);

echo "สร้างเมนู: {$title} (order={$order}, permission={$permissionName})\n";
echo "ตำแหน่ง: ล่างสุดใน sidebar — เฉพาะ admin\n";
echo "URL: /server-monitor\n";
echo "Done!\n";
