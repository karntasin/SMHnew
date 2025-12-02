<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * ตาราง mra_categories - หมวดหมู่การตรวจสอบตามเกณฑ์ สรพ. 2563
     */
    public function up(): void
    {
        Schema::create('mra_categories', function (Blueprint $table) {
            $table->id();
            $table->string('code', 10)->unique(); // เช่น CAT01, CAT02
            $table->string('name'); // ชื่อหมวด เช่น "ข้อมูลทั่วไปผู้ป่วย"
            $table->string('name_en')->nullable(); // ชื่อภาษาอังกฤษ
            $table->text('description')->nullable(); // คำอธิบาย
            $table->integer('sort_order')->default(0); // ลำดับการแสดงผล
            $table->decimal('weight', 5, 2)->default(1.00); // น้ำหนักคะแนน
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mra_categories');
    }
};
