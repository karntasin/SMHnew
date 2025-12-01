<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Position;
use App\Models\MaintenanceRequest;
use Spatie\Permission\Models\Role;

echo "=== ROLES ===\n";
$roles = Role::all()->pluck('name');
echo $roles->implode(', ') . "\n\n";

echo "=== USERS WITH ADMIN/HEADTEC ROLE ===\n";
$admins = User::role(['admin', 'headtec'])->get();
foreach ($admins as $u) {
    echo "ID: {$u->id} | Name: {$u->name} | Roles: " . $u->getRoleNames()->implode(', ') . "\n";
}
echo "\n";

echo "=== POSITIONS ===\n";
$positions = Position::all()->pluck('name');
echo $positions->implode(', ') . "\n\n";

echo "=== TECHNICIANS (Based on hardcoded positions) ===\n";
$targetPositions = ['ช่างส่งกำลัง', 'ช่างIT', 'ช่างไฟฟ้า', 'ช่างประปา', 'ช่างทั่วไป'];
$techs = User::whereHas('positions', function($q) use ($targetPositions) {
    $q->whereIn('name', $targetPositions);
})->get();
foreach ($techs as $t) {
    echo "ID: {$t->id} | Name: {$t->name} | Positions: " . $t->positions->pluck('name')->implode(', ') . "\n";
}
echo "\n";

echo "=== PENDING MAINTENANCE REQUESTS ===\n";
$requests = MaintenanceRequest::where('status', 'pending')->latest()->take(5)->get();
if ($requests->isEmpty()) {
    echo "No pending requests found.\n";
} else {
    foreach ($requests as $r) {
        echo "ID: {$r->id} | Ticket: {$r->ticket_number} | Status: {$r->status}\n";
    }
}
