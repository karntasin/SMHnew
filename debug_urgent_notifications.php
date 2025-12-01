<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Carbon\Carbon;

// Login as the first admin user
$user = User::role('admin')->first();
if (!$user) {
    echo "No admin user found.\n";
    exit;
}
Auth::login($user);
echo "Logged in as: {$user->name} (ID: {$user->id})\n";

try {
    $oneHourAgo = Carbon::now()->subHour();
    echo "Checking for notifications older than: {$oneHourAgo}\n";

    $query = $user->unreadNotifications()
        ->where('created_at', '<=', $oneHourAgo);
    
    echo "Base query count: " . $query->count() . "\n";

    // Test whereJsonContains
    try {
        $urgentNotifications = $query->whereJsonContains('data->type', 'maintenance')
            ->latest()
            ->get();
        
        echo "Urgent notifications count: " . $urgentNotifications->count() . "\n";
        
        foreach ($urgentNotifications as $notification) {
            echo " - ID: {$notification->id} | Type: " . ($notification->data['type'] ?? 'N/A') . "\n";
        }
    } catch (\Exception $e) {
        echo "Error with whereJsonContains: " . $e->getMessage() . "\n";
        
        // Fallback test: Get all and filter in PHP
        echo "Fallback: Fetching all unread and filtering in PHP...\n";
        $allUnread = $user->unreadNotifications()
            ->where('created_at', '<=', $oneHourAgo)
            ->get();
            
        $filtered = $allUnread->filter(function ($n) {
            return isset($n->data['type']) && $n->data['type'] === 'maintenance';
        });
        
        echo "Filtered count (PHP): " . $filtered->count() . "\n";
    }

} catch (\Exception $e) {
    echo "General Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
