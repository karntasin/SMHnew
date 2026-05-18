<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

$admin = User::where('email', 'admin@admin.com')->first();
if ($admin) {
    $admin->password = Hash::make('admin123');
    $admin->save();
    echo "✅ Admin password reset successfully!\n";
    echo "Email: admin@admin.com\n";
    echo "Password: admin123\n";
} else {
    echo "❌ Admin user not found.\n";
}
