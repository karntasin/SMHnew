<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('mysql')->create('tv_media_playlists', function (Blueprint $table) {
            $table->id();
            $table->string('board_key')->default('default');
            $table->enum('media_type', ['video', 'image']);
            $table->string('title')->nullable();
            $table->string('file_path'); // เก็บ path ใน storage/app/public/tv-media หรือ URL เต็ม
            $table->unsignedInteger('duration_seconds')->default(10); // ใช้กับ image เท่านั้น, video เล่นจนจบคลิป
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['board_key', 'is_active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::connection('mysql')->dropIfExists('tv_media_playlists');
    }
};
