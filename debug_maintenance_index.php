<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\MaintenanceRequest;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

// Login as Admin
$user = User::find(1);
Auth::login($user);

echo "User: {$user->name}\n";
echo "Can view maintenance? " . ($user->can('maintenance-view') ? 'YES' : 'NO') . "\n";

try {
    echo "Fetching requests...\n";
    $requests = MaintenanceRequest::with(['category', 'priority', 'requester', 'technician'])
        ->latest()
        ->get();
    
    echo "Count: " . $requests->count() . "\n";
    
    if ($requests->isNotEmpty()) {
        $first = $requests->first();
        echo "First Request: {$first->ticket_number}\n";
        echo "Category: " . ($first->category ? $first->category->name : 'NULL') . "\n";
        echo "Priority: " . ($first->priority ? $first->priority->name : 'NULL') . "\n";
        echo "Requester: " . ($first->requester ? $first->requester->name : 'NULL') . "\n";
    }

} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
