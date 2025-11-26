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
        // Insert Quality Hub Menu
        DB::table('menus')->insert([
            [
                'title' => 'ศูนย์รวมงานคุณภาพ',
                'icon' => 'LayoutGrid', // Using LayoutGrid to represent a hub/dashboard
                'route' => '/quality',
                'parent_id' => null, // Top level
                'order' => 4, // Placing it before "งานคุณภาพ" (which was 5 in the previous migration check)
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('menus')->where('route', '/quality')->delete();
    }
};
