<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('mysql')->table('tv_display_settings', function (Blueprint $table) {
            // Font size settings (value = 'auto' means use default CSS, otherwise px value like '48')
            $table->string('font_room_title', 10)->default('auto')->after('queue_poll_seconds');
            $table->string('font_calling_no', 10)->default('auto')->after('font_room_title');
            $table->string('font_calling_name', 10)->default('auto')->after('font_calling_no');
            $table->string('font_waiting_no', 10)->default('auto')->after('font_calling_name');
            $table->string('font_waiting_name', 10)->default('auto')->after('font_waiting_no');

            // Background color (null = use default theme color)
            $table->string('bg_color', 30)->nullable()->after('font_waiting_name');

            // Show/hide wait badge ("รอ 43")
            $table->boolean('show_wait_badge')->default(false)->after('bg_color');
        });
    }

    public function down(): void
    {
        Schema::connection('mysql')->table('tv_display_settings', function (Blueprint $table) {
            $table->dropColumn([
                'font_room_title',
                'font_calling_no',
                'font_calling_name',
                'font_waiting_no',
                'font_waiting_name',
                'bg_color',
                'show_wait_badge',
            ]);
        });
    }
};
