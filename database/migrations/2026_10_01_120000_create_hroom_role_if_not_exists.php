<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    public function up(): void
    {
        Role::firstOrCreate(['name' => 'hroom', 'guard_name' => 'web']);
    }

    public function down(): void
    {
        // Keep role to avoid breaking user assignments
    }
};
