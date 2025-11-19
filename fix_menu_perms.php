<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Updating menu permissions...\n";

$menu1 = \App\Models\Menu::where('route', '/administration/rooms')->first();
if ($menu1) {
    $menu1->permission_name = 'administration.rooms.view';
    $menu1->save();
    echo " Updated: $menu1->title\n";
}

$menu2 = \App\Models\Menu::where('route', '/documents/drafts')->first();
if ($menu2) {
    $menu2->permission_name = 'documents.drafts.view';
    $menu2->save();
    echo " Updated: $menu2->title\n";
}

$menu3 = \App\Models\Menu::where('route', '/documents/templates')->first();
if ($menu3) {
    $menu3->permission_name = 'documents.templates.view';
    $menu3->save();
    echo " Updated: $menu3->title\n";
}

echo "\nDone!\n";
