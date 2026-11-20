<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('quality_document_taxonomies')) {
            Schema::create('quality_document_taxonomies', function (Blueprint $table) {
                $table->id();
                $table->string('type', 50)->index(); // 'standard' or 'document_type'
                $table->string('code', 50);
                $table->string('name', 255);
                $table->text('description')->nullable();
                $table->string('color', 50)->default('blue');
                $table->integer('sort_order')->default(0);
                $table->boolean('is_active')->default(true);
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->unique(['type', 'code']);
            });

            // Seed default taxonomies
            $now = now();
            $defaults = [
                // Standards (หมวดหมู่มาตรฐาน)
                ['type' => 'standard', 'code' => 'HA', 'name' => 'HA (Hospital Accreditation)', 'description' => 'มาตรฐานการรับรองกระบวนการคุณภาพโรงพยาบาล', 'color' => 'blue', 'sort_order' => 1, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
                ['type' => 'standard', 'code' => 'JCI', 'name' => 'JCI (Joint Commission International)', 'description' => 'มาตรฐานสากลด้านความปลอดภัยและการรักษาพยาบาล', 'color' => 'indigo', 'sort_order' => 2, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
                ['type' => 'standard', 'code' => 'ISO', 'name' => 'มาตรฐาน ISO', 'description' => 'มาตรฐานระบบการจัดการระดับสากล', 'color' => 'emerald', 'sort_order' => 3, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
                ['type' => 'standard', 'code' => '2P Safety', 'name' => 'ความปลอดภัย 2P Safety', 'description' => 'Patient and Personnel Safety', 'color' => 'amber', 'sort_order' => 4, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
                ['type' => 'standard', 'code' => 'General', 'name' => 'ทั่วไป', 'description' => 'งานพัฒนาคุณภาพทั่วไป', 'color' => 'slate', 'sort_order' => 5, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],

                // Document Types (ประเภทเอกสาร)
                ['type' => 'document_type', 'code' => 'Policy', 'name' => 'นโยบาย (Policy)', 'description' => 'แนวนโยบายและแนวทางการดำเนินงานขององค์กร', 'color' => 'rose', 'sort_order' => 1, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
                ['type' => 'document_type', 'code' => 'Procedure', 'name' => 'ระเบียบปฏิบัติ (Procedure)', 'description' => 'ขั้นตอนการปฏิบัติงานระหว่างหน่วยงาน', 'color' => 'blue', 'sort_order' => 2, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
                ['type' => 'document_type', 'code' => 'Work Instruction', 'name' => 'วิธีปฏิบัติงาน (WI)', 'description' => 'คำแนะนำและวิธีการทำงานอย่างละเอียดเฉพาะงาน', 'color' => 'emerald', 'sort_order' => 3, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
                ['type' => 'document_type', 'code' => 'Form', 'name' => 'แบบฟอร์ม (Form)', 'description' => 'แบบบันทึกและแบบฟอร์มการปฏิบัติงาน', 'color' => 'purple', 'sort_order' => 4, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
                ['type' => 'document_type', 'code' => 'Manual', 'name' => 'คู่มือ (Manual)', 'description' => 'คู่มือมาตรฐานการทำงานและแนวทางปฏิบัติ', 'color' => 'amber', 'sort_order' => 5, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
                ['type' => 'document_type', 'code' => 'CPG', 'name' => 'แนวทางเวชปฏิบัติ (CPG)', 'description' => 'Clinical Practice Guideline', 'color' => 'teal', 'sort_order' => 6, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
                ['type' => 'document_type', 'code' => 'SOP', 'name' => 'ขั้นตอนการปฏิบัติงานมาตรฐาน (SOP)', 'description' => 'Standard Operating Procedure', 'color' => 'indigo', 'sort_order' => 7, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ];

            DB::table('quality_document_taxonomies')->insert($defaults);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('quality_document_taxonomies');
    }
};
