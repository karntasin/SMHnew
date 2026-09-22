<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('pharmacy_items', function (Blueprint $table) {
            $table->boolean('is_had')->default(false)->after('drug_group')->comment('ยาความเสี่ยงสูง High Alert Drug');
            $table->boolean('is_cold_chain')->default(false)->after('is_had')->comment('ยาแช่เย็นควบคุมอุณหภูมิ');
            $table->string('storage_temp', 60)->nullable()->after('is_cold_chain')->comment('อุณหภูมิจัดเก็บ เช่น 2-8°C');
            $table->boolean('is_narcotic')->default(false)->after('storage_temp')->comment('ยาเสพติด/วัตถุออกฤทธิ์');
            $table->string('had_alert_text', 255)->nullable()->after('is_narcotic')->comment('ข้อความเตือนความปลอดภัยพิเศษ');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pharmacy_items', function (Blueprint $table) {
            $table->dropColumn(['is_had', 'is_cold_chain', 'storage_temp', 'is_narcotic', 'had_alert_text']);
        });
    }
};
