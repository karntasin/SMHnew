<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('mysql')->table('tv_display_settings', function (Blueprint $table) {
            if (!Schema::connection('mysql')->hasColumn('tv_display_settings', 'lab_xray_enabled')) {
                $table->boolean('lab_xray_enabled')->default(true)->after('show_wait_badge');
                $table->unsignedSmallInteger('lab_xray_rotate_seconds')->default(60)->after('lab_xray_enabled');
                $table->string('lab_xray_title', 100)->nullable()->default('ผู้ป่วยรอผลตรวจ LAB & X-RAY')->after('lab_xray_rotate_seconds');
                $table->string('lab_xray_subtitle', 255)->nullable()->default('รายชื่อจะหายไปโดยอัตโนมัติเมื่อผลการตรวจออกครบทุกรายการ และสามารถเข้าตรวจต่อได้ทันที')->after('lab_xray_title');
                $table->boolean('lab_xray_show_confirmed')->default(true)->after('lab_xray_subtitle');
                $table->boolean('lab_xray_show_order_time')->default(true)->after('lab_xray_show_confirmed');
                $table->string('font_lab_oqueue', 10)->default('auto')->after('lab_xray_show_order_time');
                $table->string('font_lab_name', 10)->default('auto')->after('font_lab_oqueue');
            }
        });
    }

    public function down(): void
    {
        Schema::connection('mysql')->table('tv_display_settings', function (Blueprint $table) {
            $table->dropColumn([
                'lab_xray_enabled',
                'lab_xray_rotate_seconds',
                'lab_xray_title',
                'lab_xray_subtitle',
                'lab_xray_show_confirmed',
                'lab_xray_show_order_time',
                'font_lab_oqueue',
                'font_lab_name',
            ]);
        });
    }
};
