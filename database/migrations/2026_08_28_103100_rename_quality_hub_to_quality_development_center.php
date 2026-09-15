<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('menus')
            ->whereNull('parent_id')
            ->whereIn('title', [
                'ศูนย์คุณภาพ',
                'ศูนย์รวมงานคุณภาพ',
                'Quality Hub',
                'ศูนย์รวมงานคุณภาพ (Quality Hub)',
            ])
            ->update(['title' => 'ศูนย์พัฒนาคุณภาพ']);

        DB::table('menus')
            ->where('title', 'ภาพรวมศูนย์คุณภาพ')
            ->update(['title' => 'ภาพรวมศูนย์พัฒนาคุณภาพ']);
    }

    public function down(): void
    {
        DB::table('menus')
            ->where('title', 'ศูนย์พัฒนาคุณภาพ')
            ->whereNull('parent_id')
            ->update(['title' => 'ศูนย์คุณภาพ']);

        DB::table('menus')
            ->where('title', 'ภาพรวมศูนย์พัฒนาคุณภาพ')
            ->update(['title' => 'ภาพรวมศูนย์คุณภาพ']);
    }
};
