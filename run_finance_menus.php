<?php

/**
 * อัปเดตเมนู Finance Reports + Financial Data Hub (ไม่ต้องใช้ artisan — รันได้บน PHP 8.0)
 * ใช้: php run_finance_menus.php
 */

function loadEnv(string $path): array
{
    $env = [];
    if (! is_file($path)) {
        throw new RuntimeException('.env not found');
    }
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || ! str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $env[trim($key)] = trim($value, " \t\n\r\0\x0B\"'");
    }

    return $env;
}

function syncMenuGroup(PDO $pdo, int $parentId, array $children, string $permissionGroup, string $now): void
{
    $validRoutes = array_column($children, 'route');
    $placeholders = implode(',', array_fill(0, count($validRoutes), '?'));
    $delete = $pdo->prepare("DELETE FROM menus WHERE parent_id = ? AND route NOT IN ({$placeholders})");
    $delete->execute(array_merge([$parentId], $validRoutes));

    foreach ($children as $child) {
        $find = $pdo->prepare('SELECT id FROM menus WHERE parent_id = ? AND route = ? LIMIT 1');
        $find->execute([$parentId, $child['route']]);
        $existingId = $find->fetchColumn();

        if ($existingId) {
            $pdo->prepare('
                UPDATE menus SET title = ?, icon = ?, `order` = ?, permission_name = ?, updated_at = ?
                WHERE id = ?
            ')->execute([
                $child['title'], $child['icon'], $child['order'], $child['permission_name'], $now, $existingId,
            ]);
            echo "  อัปเดต: {$child['title']}\n";
        } else {
            $pdo->prepare('
                INSERT INTO menus (title, icon, route, parent_id, `order`, permission_name, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ')->execute([
                $child['title'], $child['icon'], $child['route'], $parentId,
                $child['order'], $child['permission_name'], $now, $now,
            ]);
            echo "  เพิ่ม: {$child['title']}\n";
        }

        $permCheck = $pdo->prepare('SELECT id, `group` FROM permissions WHERE name = ? AND guard_name = ? LIMIT 1');
        $permCheck->execute([$child['permission_name'], 'web']);
        $perm = $permCheck->fetch(PDO::FETCH_ASSOC);

        if (! $perm) {
            $pdo->prepare('INSERT INTO permissions (name, guard_name, `group`, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
                ->execute([$child['permission_name'], 'web', $permissionGroup, $now, $now]);
            $permId = (int) $pdo->lastInsertId();
            echo "    + สร้าง permission: {$child['permission_name']}\n";
        } else {
            $permId = (int) $perm['id'];
            if (($perm['group'] ?? '') !== $permissionGroup) {
                $pdo->prepare('UPDATE permissions SET `group` = ?, updated_at = ? WHERE id = ?')
                    ->execute([$permissionGroup, $now, $permId]);
            }
        }

        foreach (['admin', 'Admin', 'user', 'header', 'Header'] as $roleName) {
            $roleStmt = $pdo->prepare('SELECT id FROM roles WHERE name = ? LIMIT 1');
            $roleStmt->execute([$roleName]);
            $roleId = $roleStmt->fetchColumn();
            if (! $roleId) {
                continue;
            }

            $linkCheck = $pdo->prepare('SELECT 1 FROM role_has_permissions WHERE permission_id = ? AND role_id = ?');
            $linkCheck->execute([$permId, $roleId]);
            if (! $linkCheck->fetchColumn()) {
                $pdo->prepare('INSERT INTO role_has_permissions (permission_id, role_id) VALUES (?, ?)')
                    ->execute([$permId, $roleId]);
                echo "    + มอบสิทธิ์ {$child['permission_name']} ให้ role {$roleName}\n";
            }
        }
    }
}

$env = loadEnv(__DIR__.'/.env');

$dsn = sprintf(
    'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
    $env['DB_HOST'] ?? '127.0.0.1',
    $env['DB_PORT'] ?? '3306',
    $env['DB_DATABASE'] ?? 'app_db'
);

$pdo = new PDO($dsn, $env['DB_USERNAME'] ?? 'root', $env['DB_PASSWORD'] ?? '', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

echo "=== Finance + Financial Data Hub Menus Setup ===\n\n";

$now = date('Y-m-d H:i:s');

// ---- Finance Reports ----
$stmt = $pdo->query("
    SELECT id FROM menus
    WHERE parent_id IS NULL
      AND (title = 'Finance Reports' OR title = 'รายงานการเงิน' OR route = 'finance.dashboard')
    LIMIT 1
");
$financeParentId = $stmt->fetchColumn();

if (! $financeParentId) {
    $insert = $pdo->prepare('
        INSERT INTO menus (title, icon, route, parent_id, `order`, permission_name, created_at, updated_at)
        VALUES (?, ?, NULL, NULL, 90, NULL, ?, ?)
    ');
    $insert->execute(['รายงานการเงิน', 'DollarSign', $now, $now]);
    $financeParentId = (int) $pdo->lastInsertId();
    echo "สร้างเมนูหลัก รายงานการเงิน (id={$financeParentId})\n";
} else {
    $financeParentId = (int) $financeParentId;
    $pdo->prepare('
        UPDATE menus SET title = ?, icon = ?, route = NULL, permission_name = NULL, updated_at = ?
        WHERE id = ?
    ')->execute(['รายงานการเงิน', 'DollarSign', $now, $financeParentId]);
    echo "อัปเดตเมนูหลัก รายงานการเงิน (id={$financeParentId})\n";
}

syncMenuGroup($pdo, $financeParentId, [
    [
        'title' => 'แดชบอร์ด BMS',
        'icon' => 'Layout',
        'route' => 'finance.dashboard',
        'order' => 1,
        'permission_name' => 'finance.dashboard',
    ],
    [
        'title' => 'รายได้ตามสิทธิ์การรักษา',
        'icon' => 'BarChart3',
        'route' => 'finance.revenue',
        'order' => 2,
        'permission_name' => 'finance.revenue',
    ],
], 'รายงานการเงิน', $now);

// ---- Financial Data Hub ----
$stmt = $pdo->query("
    SELECT id FROM menus
    WHERE parent_id IS NULL
      AND (title = 'Financial Data Hub' OR title = 'ศูนย์ข้อมูลการเงิน' OR route = 'finance.data-hub')
    LIMIT 1
");
$hubParentId = $stmt->fetchColumn();

if (! $hubParentId) {
    $insert = $pdo->prepare('
        INSERT INTO menus (title, icon, route, parent_id, `order`, permission_name, created_at, updated_at)
        VALUES (?, ?, NULL, NULL, 91, NULL, ?, ?)
    ');
    $insert->execute(['Financial Data Hub', 'Wallet', $now, $now]);
    $hubParentId = (int) $pdo->lastInsertId();
    echo "\nสร้างเมนูหลัก Financial Data Hub (id={$hubParentId})\n";
} else {
    $hubParentId = (int) $hubParentId;
    $pdo->prepare('
        UPDATE menus SET title = ?, icon = ?, route = NULL, `order` = 91, permission_name = NULL, updated_at = ?
        WHERE id = ?
    ')->execute(['Financial Data Hub', 'Wallet', $now, $hubParentId]);
    echo "\nอัปเดตเมนูหลัก Financial Data Hub (id={$hubParentId})\n";
}

// ย้าย/ลบเมนูที่ยังอยู่ใต้ parent อื่น
$pdo->prepare("
    DELETE FROM menus
    WHERE route IN (
        'finance.data-hub',
        'finance.cgd.dashboard',
        'finance.cgd.precheck',
        'finance.cgd.import',
        'finance.lgo.dashboard',
        'finance.sso.dashboard',
        'finance.uc.dashboard'
    )
      AND parent_id != ?
")->execute([$hubParentId]);

syncMenuGroup($pdo, $hubParentId, [
    [
        'title' => 'ภาพรวมศูนย์ข้อมูลการเงิน',
        'icon' => 'Layout',
        'route' => 'finance.data-hub',
        'order' => 1,
        'permission_name' => 'finance.data-hub',
    ],
    [
        'title' => 'ตรวจเบิกจ่ายตรง กรมบัญชีกลาง',
        'icon' => 'ClipboardList',
        'route' => 'finance.cgd.dashboard',
        'order' => 2,
        'permission_name' => 'finance.cgd.dashboard',
    ],
    [
        'title' => 'ตรวจก่อนเบิก C Deny',
        'icon' => 'ShieldAlert',
        'route' => 'finance.cgd.precheck',
        'order' => 3,
        'permission_name' => 'finance.cgd.precheck',
    ],
    [
        'title' => 'ตรวจข้อมูล อปท.',
        'icon' => 'Building2',
        'route' => 'finance.lgo.dashboard',
        'order' => 4,
        'permission_name' => 'finance.lgo.dashboard',
    ],
    [
        'title' => 'ตรวจข้อมูล ประกันสังคม',
        'icon' => 'Shield',
        'route' => 'finance.sso.dashboard',
        'order' => 5,
        'permission_name' => 'finance.sso.dashboard',
    ],
    [
        'title' => 'ตรวจข้อมูล บัตรทอง',
        'icon' => 'Heart',
        'route' => 'finance.uc.dashboard',
        'order' => 6,
        'permission_name' => 'finance.uc.dashboard',
    ],
], 'ศูนย์ข้อมูลการเงิน', $now);

// สิทธิ์หน้าต่างนำเข้าแยกโมดูล (ไม่ขึ้น sidebar)
foreach (['finance.cgd.import', 'finance.lgo.import', 'finance.sso.import', 'finance.uc.import'] as $permName) {
    $permCheck = $pdo->prepare('SELECT id FROM permissions WHERE name = ? AND guard_name = ? LIMIT 1');
    $permCheck->execute([$permName, 'web']);
    $permId = $permCheck->fetchColumn();
    if (! $permId) {
        $pdo->prepare('INSERT INTO permissions (name, guard_name, `group`, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
            ->execute([$permName, 'web', 'ศูนย์ข้อมูลการเงิน', $now, $now]);
        $permId = (int) $pdo->lastInsertId();
        echo "  + สร้าง permission: {$permName}\n";
    }
    foreach (['admin', 'Admin', 'user', 'header', 'Header'] as $roleName) {
        $roleStmt = $pdo->prepare('SELECT id FROM roles WHERE name = ? LIMIT 1');
        $roleStmt->execute([$roleName]);
        $roleId = $roleStmt->fetchColumn();
        if (! $roleId) {
            continue;
        }
        $linkCheck = $pdo->prepare('SELECT 1 FROM role_has_permissions WHERE permission_id = ? AND role_id = ?');
        $linkCheck->execute([$permId, $roleId]);
        if (! $linkCheck->fetchColumn()) {
            $pdo->prepare('INSERT INTO role_has_permissions (permission_id, role_id) VALUES (?, ?)')
                ->execute([$permId, $roleId]);
        }
    }
}

$base = rtrim($env['APP_URL'] ?? 'http://localhost', '/');
echo "\nเสร็จสิ้น!\n";
echo "Sidebar → Financial Data Hub\n";
echo "URL: {$base}/finance/data-hub\n";
echo "CGD: {$base}/finance/data-hub/cgd-claim\n";
echo "LGO: {$base}/finance/data-hub/lgo\n";
echo "SSO: {$base}/finance/data-hub/sso\n";
echo "UC:  {$base}/finance/data-hub/uc\n";
