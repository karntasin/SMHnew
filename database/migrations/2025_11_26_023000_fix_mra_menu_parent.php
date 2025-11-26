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
        // Find the main "Quality System" menu
        $mainQualityMenuId = DB::table('menus')->where('title', 'ระบบงานคุณภาพ')->value('id');

        if ($mainQualityMenuId) {
            // Move MRA menu to the main Quality System menu
            DB::table('menus')
                ->where('route', '/mra')
                ->update(['parent_id' => $mainQualityMenuId]);

            // Delete the duplicate "Quality Work" menu if it has no children left
            // (We created it in the previous migration with title 'งานคุณภาพ')
            $duplicateParent = DB::table('menus')->where('title', 'งานคุณภาพ')->first();
            
            if ($duplicateParent) {
                // Check if it has any other children
                $hasChildren = DB::table('menus')->where('parent_id', $duplicateParent->id)->exists();
                
                if (!$hasChildren) {
                    DB::table('menus')->where('id', $duplicateParent->id)->delete();
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No need to reverse really, as this is a fix.
    }
};
