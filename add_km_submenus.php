<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Menu;

// 1. Find the main KM menu
$kmMenu = Menu::where('route', '/km/dashboard')->first();

if (!$kmMenu) {
    echo "KM Menu not found. Please run add_km_menu.php first.\n";
    exit;
}

// 2. Create Submenus
$submenus = [
    [
        'title' => 'แดชบอร์ด',
        'route' => '/km/dashboard',
        'icon' => 'LayoutDashboard',
        'order' => 1
    ],
    [
        'title' => 'คลังเอกสารความรู้',
        'route' => '/km/assets',
        'icon' => 'FileText',
        'order' => 2
    ],
    [
        'title' => 'ระบบการเรียนรู้ (E-Learning)',
        'route' => '/km/learn/dashboard',
        'icon' => 'GraduationCap',
        'order' => 3,
        'children' => [
            [
                'title' => 'แดชบอร์ด',
                'route' => '/km/learn/dashboard',
                'icon' => 'LayoutDashboard',
                'order' => 1
            ],
            [
                'title' => 'การฝึกอบรมของฉัน',
                'route' => '/km/learn/my-training',
                'icon' => 'UserCheck',
                'order' => 2
            ],
            [
                'title' => 'หลักสูตรทั้งหมด',
                'route' => '/km/learn',
                'icon' => 'Library',
                'order' => 3
            ],
            [
                'title' => 'สร้างหลักสูตรใหม่',
                'route' => '/km/learn/courses/create',
                'icon' => 'PenTool',
                'order' => 4
            ]
        ]
    ]
];

foreach ($submenus as $menuData) {
    $children = $menuData['children'] ?? [];
    unset($menuData['children']);

    $menuData['parent_id'] = $kmMenu->id;
    
    // Check if exists
    $menu = Menu::updateOrCreate(
        ['route' => $menuData['route'], 'parent_id' => $kmMenu->id],
        $menuData
    );
    
    echo "Created/Updated submenu: {$menu->title}\n";

    if (!empty($children)) {
        foreach ($children as $childData) {
            $childData['parent_id'] = $menu->id;
            Menu::updateOrCreate(
                ['route' => $childData['route'], 'parent_id' => $menu->id],
                $childData
            );
            echo "  - Created/Updated child menu: {$childData['title']}\n";
        }
    }
}

echo "KM Submenus structure updated successfully.\n";
