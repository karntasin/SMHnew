<?php

/**
 * ติดตั้งเมนู RDU (ไม่ต้องใช้ artisan seeder เต็มถ้า PHP ต่ำกว่า)
 * ใช้: .php82\php.exe run_rdu_menus.php
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

echo "=== RDU Menus Setup ===\n\n";

$now = date('Y-m-d H:i:s');

$qualityStmt = $pdo->query("
    SELECT id FROM menus
    WHERE parent_id IS NULL
      AND (title IN ('ศูนย์พัฒนาคุณภาพ', 'ศูนย์คุณภาพ', 'ศูนย์รวมงานคุณภาพ', 'Quality Hub') OR route = 'quality.index')
    LIMIT 1
");
$qualityId = $qualityStmt->fetchColumn();

if (! $qualityId) {
    $insertQuality = $pdo->prepare('
        INSERT INTO menus (title, icon, route, parent_id, `order`, permission_name, created_at, updated_at)
        VALUES (?, ?, NULL, NULL, 10, NULL, ?, ?)
    ');
    $insertQuality->execute(['ศูนย์พัฒนาคุณภาพ', 'Award', $now, $now]);
    $qualityId = (int) $pdo->lastInsertId();
    echo "สร้างเมนูหลัก ศูนย์พัฒนาคุณภาพ (id={$qualityId})\n";
} else {
    $qualityId = (int) $qualityId;
}

$stmt = $pdo->query("
    SELECT id FROM menus
    WHERE (title = 'RDU Reports' OR title = 'รายงาน RDU' OR title LIKE '%RDU%' OR route = 'rdu.index')
      AND (parent_id IS NULL OR parent_id = {$qualityId})
    LIMIT 1
");
$parentId = $stmt->fetchColumn();

if (! $parentId) {
    $insert = $pdo->prepare('
        INSERT INTO menus (title, icon, route, parent_id, `order`, permission_name, created_at, updated_at)
        VALUES (?, ?, NULL, ?, 7, NULL, ?, ?)
    ');
    $insert->execute(['รายงาน RDU', 'Pill', $qualityId, $now, $now]);
    $parentId = (int) $pdo->lastInsertId();
    echo "สร้างเมนูรายงาน RDU ใต้ศูนย์พัฒนาคุณภาพ (id={$parentId})\n";
} else {
    $parentId = (int) $parentId;
    $pdo->prepare('
        UPDATE menus SET title = ?, icon = ?, route = NULL, parent_id = ?, `order` = 7, permission_name = NULL, updated_at = ?
        WHERE id = ?
    ')->execute(['รายงาน RDU', 'Pill', $qualityId, $now, $parentId]);
    echo "อัปเดตเมนูรายงาน RDU ใต้ศูนย์พัฒนาคุณภาพ (id={$parentId})\n";
}

$children = [
    [
        'title' => 'RDU Dashboard',
        'icon' => 'Activity',
        'route' => 'rdu.index',
        'order' => 1,
        'permission_name' => 'rdu.index',
    ],
    [
        'title' => 'Case Audit',
        'icon' => 'ClipboardList',
        'route' => 'rdu.cases',
        'order' => 2,
        'permission_name' => 'rdu.cases',
    ],
    [
        'title' => 'Drug Utilization',
        'icon' => 'Pill',
        'route' => 'rdu.drugs',
        'order' => 3,
        'permission_name' => 'rdu.drugs',
    ],
    [
        'title' => 'Antibiotic Report',
        'icon' => 'Syringe',
        'route' => 'rdu.drugs.antibiotics',
        'order' => 4,
        'permission_name' => 'rdu.drugs.antibiotics',
    ],
    [
        'title' => 'Drugs by Department',
        'icon' => 'Building2',
        'route' => 'rdu.drugs.by-department',
        'order' => 5,
        'permission_name' => 'rdu.drugs.by-department',
    ],
];

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

    $permCheck = $pdo->prepare('SELECT id FROM permissions WHERE name = ? AND guard_name = ? LIMIT 1');
    $permCheck->execute([$child['permission_name'], 'web']);
    $permId = $permCheck->fetchColumn();

    if (! $permId) {
        $pdo->prepare('INSERT INTO permissions (name, guard_name, `group`, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
            ->execute([$child['permission_name'], 'web', 'รายงาน RDU', $now, $now]);
        $permId = (int) $pdo->lastInsertId();
        echo "    + สร้าง permission: {$child['permission_name']}\n";
    } else {
        $pdo->prepare('UPDATE permissions SET `group` = ?, updated_at = ? WHERE id = ?')
            ->execute(['รายงาน RDU', $now, $permId]);
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

echo "\nเสร็จสิ้น! เปิด Sidebar → ศูนย์พัฒนาคุณภาพ → รายงาน RDU\n";
echo "Dashboard: /rdu\n";
echo "Case Audit: /rdu/cases\n";
echo "Drug Utilization: /rdu/drugs\n";
echo "Antibiotics: /rdu/drugs/antibiotics\n";
echo "By Department: /rdu/drugs/by-department\n";
