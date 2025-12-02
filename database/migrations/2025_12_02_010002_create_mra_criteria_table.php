<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * ตาราง mra_criteria - เกณฑ์การตรวจสอบรายข้อ ตามมาตรฐาน สรพ. 2563
     */
    public function up(): void
    {
        Schema::create('mra_criteria', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mra_category_id')->constrained('mra_categories')->onDelete('cascade');
            $table->string('code', 20)->unique(); // เช่น 1.1, 1.2, 2.1
            $table->string('name'); // ชื่อเกณฑ์ เช่น "ชื่อ-นามสกุล ถูกต้อง ครบถ้วน"
            $table->string('name_en')->nullable();
            $table->text('description')->nullable(); // คำอธิบายเพิ่มเติม
            $table->text('audit_guide')->nullable(); // แนวทางการตรวจ
            $table->string('hosxp_table')->nullable(); // ตาราง HOSxP ที่เกี่ยวข้อง
            $table->string('hosxp_field')->nullable(); // ฟิลด์ HOSxP ที่เกี่ยวข้อง
            $table->enum('data_type', ['auto', 'manual', 'both'])->default('manual'); // วิธีการตรวจ
            $table->integer('max_score')->default(1); // คะแนนเต็ม
            $table->integer('sort_order')->default(0);
            $table->boolean('is_required')->default(true); // บังคับตรวจหรือไม่
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mra_criteria');
    }
};
