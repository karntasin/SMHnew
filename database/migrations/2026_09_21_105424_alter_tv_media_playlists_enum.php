<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE tv_media_playlists MODIFY COLUMN media_type ENUM('video', 'image', 'youtube') NOT NULL");
    }

    public function down(): void
    {
        // ...
    }
};

