<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('menus')
            ->where('route', '/maintenance/dashboard')
            ->update(['title' => 'แดชบอร์ด']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('menus')
            ->where('route', '/maintenance/dashboard')
            ->update(['title' => 'Dashboard']);
    }
};
