<?php

require __DIR__ . '/vendor/autoload.php';

use App\Models\Menu;
use Illuminate\Support\Facades\DB;

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Checking for incorrect HRD menu routes...\n";

$menus = Menu::where('route', 'like', '%hrd%')->orWhere('title', 'like', '%HRD%')->orWhere('title', 'like', '%E-Learning%')->get();

if ($menus->isEmpty()) {
    echo "No menus found with 'hrd' in route or title.\n";
} else {
    foreach ($menus as $menu) {
        echo "Found menu: ID={$menu->id}, Title={$menu->title}, Route={$menu->route}\n";
        
        if ($menu->route === '/hrd/dashboard') {
            echo "  -> Updating route to '/km/learn/dashboard'...\n";
            $menu->route = '/km/learn/dashboard';
            $menu->save();
            echo "  -> Updated.\n";
        } elseif ($menu->route === '/hrd') {
             echo "  -> Updating route to '/km/learn/dashboard'...\n";
            $menu->route = '/km/learn/dashboard';
            $menu->save();
            echo "  -> Updated.\n";
        } elseif ($menu->route === '/hrd/courses') {
            echo "  -> Updating route to '/km/learn/courses'...\n";
            $menu->route = '/km/learn/courses';
            $menu->save();
            echo "  -> Updated.\n";
        } elseif ($menu->route === '/hrd/my-training') {
            echo "  -> Updating route to '/km/learn/my-training'...\n";
            $menu->route = '/km/learn/my-training';
            $menu->save();
            echo "  -> Updated.\n";
        } elseif ($menu->route === '/hrd/my-skills') {
            echo "  -> Updating route to '/km/learn/my-skills'...\n";
            $menu->route = '/km/learn/my-skills';
            $menu->save();
            echo "  -> Updated.\n";
        }
    }
}

// Also check for KM menus that might be pointing wrong
$kmMenus = Menu::where('route', 'like', '%km%')->get();
foreach ($kmMenus as $menu) {
    echo "Found KM menu: ID={$menu->id}, Title={$menu->title}, Route={$menu->route}\n";
}

echo "Done.\n";
