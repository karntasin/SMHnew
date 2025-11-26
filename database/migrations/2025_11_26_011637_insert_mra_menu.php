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
        // Find the "Quality Work" (งานคุณภาพ) parent menu if it exists, or create it
        $parentId = DB::table('menus')->where('title', 'งานคุณภาพ')->value('id');

        if (!$parentId) {
            $parentId = DB::table('menus')->insertGetId([
                'title' => 'งานคุณภาพ',
                'icon' => 'Award', // Assuming 'Award' icon exists
                'route' => null,
                'order' => 5, // Adjust order as needed
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Insert MRA Menu
        DB::table('menus')->insert([
            [
                'title' => 'MRA (เวชระเบียน)',
                'icon' => 'FileText',
                'route' => '/mra',
                'parent_id' => $parentId,
                'order' => 10,
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
        DB::table('menus')->where('route', '/mra')->delete();
    }
};
