<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('mysql')->table('tv_display_settings', function (Blueprint $table) {
            if (!Schema::connection('mysql')->hasColumn('tv_display_settings', 'screening_enabled')) {
                $table->boolean('screening_enabled')->default(true)->after('font_lab_name');
                $table->unsignedSmallInteger('screening_rotate_seconds')->default(60)->after('screening_enabled');
                $table->string('screening_title', 100)->nullable()->default('ผู้ป่วยรอซักประวัติ / คัดกรอง')->after('screening_rotate_seconds');
                $table->string('screening_subtitle', 255)->nullable()->default('จุดคัดกรองห้องตรวจโรคภายนอก (002)')->after('screening_title');
                $table->boolean('screening_show_appointment')->default(true)->after('screening_subtitle');
                $table->boolean('screening_show_order_time')->default(true)->after('screening_show_appointment');
                $table->string('font_screening_oqueue', 10)->default('auto')->after('screening_show_order_time');
                $table->string('font_screening_name', 10)->default('auto')->after('font_screening_oqueue');
            }
        });
    }

    public function down(): void
    {
        Schema::connection('mysql')->table('tv_display_settings', function (Blueprint $table) {
            $table->dropColumn([
                'screening_enabled',
                'screening_rotate_seconds',
                'screening_title',
                'screening_subtitle',
                'screening_show_appointment',
                'screening_show_order_time',
                'font_screening_oqueue',
                'font_screening_name',
            ]);
        });
    }
};
