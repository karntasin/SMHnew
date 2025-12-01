<?php

use Illuminate\Support\Facades\Auth;
use App\Models\User;

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Login as the first user (likely admin)
$user = User::first();
Auth::login($user);

echo "User: " . $user->name . "\n";

try {
    echo "Fetching unread notifications...\n";
    $unreadNotifications = $user->unreadNotifications()
        ->latest()
        ->take(10)
        ->get();
    
    echo "Count: " . $unreadNotifications->count() . "\n";

    $mapped = $unreadNotifications->map(function ($notification) {
        return [
            'id' => $notification->id,
            'data' => $notification->data,
            'created_at' => $notification->created_at->diffForHumans(),
        ];
    });
    
    echo "Mapped successfully.\n";
    // print_r($mapped->toArray());

    echo "Fetching read notifications...\n";
    $readNotifications = $user->readNotifications()
        ->latest()
        ->take(10)
        ->get();
    
    echo "Read Count: " . $readNotifications->count() . "\n";

    $mappedRead = $readNotifications->map(function ($notification) {
        return [
            'id' => $notification->id,
            'data' => $notification->data,
            'created_at' => $notification->created_at->diffForHumans(),
        ];
    });
    echo "Mapped read successfully.\n";

} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
