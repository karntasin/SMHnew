<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('mysql')->create('tv_display_settings', function (Blueprint $table) {
            $table->id();
            $table->string('board_key')->unique()->default('default'); // รองรับหลายจอในอนาคต
            $table->enum('left_media_mode', ['video', 'image_slider', 'rss_news'])->default('image_slider');
            $table->unsignedTinyInteger('left_panel_width_percent')->default(40); // 40 หรือ 45
            $table->unsignedTinyInteger('right_panel_width_percent')->default(60);
            $table->boolean('chime_enabled')->default(true);
            $table->boolean('tts_enabled')->default(true);
            $table->string('tts_voice_locale')->default('th-TH');
            $table->string('rss_feed_url')->nullable();
            $table->unsignedInteger('queue_poll_seconds')->default(5);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::connection('mysql')->dropIfExists('tv_display_settings');
    }
};
