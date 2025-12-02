<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * ตาราง mra_settings - ค่าเป้าหมายและการตั้งค่า MRA
     */
    public function up(): void
    {
        Schema::create('mra_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique(); // เช่น target_accuracy, sample_size_opd
            $table->string('value'); // ค่า
            $table->string('type')->default('string'); // string, integer, decimal, boolean
            $table->string('group')->default('general'); // กลุ่ม: general, target, sampling
            $table->string('label'); // ชื่อแสดงผล
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // Insert default settings
        \DB::table('mra_settings')->insert([
            [
                'key' => 'target_accuracy',
                'value' => '90',
                'type' => 'integer',
                'group' => 'target',
                'label' => 'เป้าหมายความถูกต้อง (%)',
                'description' => 'เปอร์เซ็นต์ความถูกต้องที่ตั้งเป้าหมาย (ตามเกณฑ์ สรพ. ≥90%)',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'sample_size_opd',
                'value' => '30',
                'type' => 'integer',
                'group' => 'sampling',
                'label' => 'จำนวนตัวอย่าง OPD ต่อเดือน',
                'description' => 'จำนวนเวชระเบียน OPD ที่ต้องสุ่มตรวจต่อเดือน',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'sample_size_ipd',
                'value' => '20',
                'type' => 'integer',
                'group' => 'sampling',
                'label' => 'จำนวนตัวอย่าง IPD ต่อเดือน',
                'description' => 'จำนวนเวชระเบียน IPD ที่ต้องสุ่มตรวจต่อเดือน',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'auto_fetch_hosxp',
                'value' => 'true',
                'type' => 'boolean',
                'group' => 'general',
                'label' => 'ดึงข้อมูลจาก HOSxP อัตโนมัติ',
                'description' => 'เปิดใช้งานการดึงข้อมูลจากฐานข้อมูล HOSxP อัตโนมัติ',
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
        Schema::dropIfExists('mra_settings');
    }
};
