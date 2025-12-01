<?php

use App\Models\User;
use Spatie\Permission\Models\Role;

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = User::where('name', 'Admin')->first();
if ($user) {
    echo "User: " . $user->name . "\n";
    echo "Roles: " . implode(', ', $user->getRoleNames()->toArray()) . "\n";
    echo "Has admin role? " . ($user->hasRole('admin') ? 'Yes' : 'No') . "\n";
    echo "Has headtec role? " . ($user->hasRole('headtec') ? 'Yes' : 'No') . "\n";
} else {
    echo "User Admin not found.\n";
}
