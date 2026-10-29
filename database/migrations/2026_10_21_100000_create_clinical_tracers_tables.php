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
        // 1. clinical_tracers: ตารางการติดตามทางคลินิก 13 กลุ่มโรค
        if (!Schema::connection('mysql')->hasTable('clinical_tracers')) {
            Schema::connection('mysql')->create('clinical_tracers', function (Blueprint $table) {
                $table->id();
                $table->string('code', 50)->unique()->comment('รหัสเช่น SEPSIS, STEMI, STROKE, DM, ESRD');
                $table->string('title')->comment('ชื่อกลุ่มโรค / หัวข้อ Tracer');
                $table->string('subtitle')->nullable()->comment('คำอธิบายย่อย หรือชื่อภาษาอังกฤษ');
                $table->enum('category', ['emergency', 'chronic', 'infectious', 'mental_health', 'surgical', 'other'])
                    ->default('emergency')
                    ->comment('หมวดหมู่กลุ่มโรค');
                $table->foreignId('team_ha_id')->nullable()->constrained('teamha')->nullOnDelete();
                $table->string('lead_doctor_name')->nullable()->comment('แพทย์ผู้รับผิดชอบ');
                $table->string('lead_nurse_name')->nullable()->comment('พยาบาล/ผู้ประสานงานหลัก');
                
                // 6 มิติมาตรฐานของ Clinical Tracer
                $table->longText('context')->nullable()->comment('1. บริบทและสถิติผู้รับบริการ');
                $table->longText('key_issues')->nullable()->comment('2. ประเด็นสำคัญและความเสี่ยงทางคลินิก');
                $table->longText('goals')->nullable()->comment('3. เป้าหมายการพัฒนา');
                $table->longText('processes')->nullable()->comment('4. กระบวนการคุณภาพ / CPG / Standing Order');
                $table->json('kpi_data')->nullable()->comment('5. ตารางตัวชี้วัดผลลัพธ์รายปี 2565-2569');
                $table->longText('results_analysis')->nullable()->comment('5. บทวิเคราะห์ผลลัพธ์และ PDCA');
                $table->longText('next_plans')->nullable()->comment('6. แผนการพัฒนาต่อเนื่อง / CQI');
                $table->json('case_reviews_data')->nullable()->comment('สรุปการทบทวนเคสทางคลินิก (Masked PII)');

                $table->enum('status', ['draft', 'in_progress', 'completed', 'approved'])->default('completed');
                $table->integer('current_version')->default(1);
                $table->foreignId('last_modified_by')->nullable()->constrained('users')->nullOnDelete();
                $table->integer('order')->default(0);
                $table->timestamps();
            });
        }

        // 2. clinical_tracer_revisions: ตารางเก็บประวัติการแก้ไขและกู้คืน (Restore)
        if (!Schema::connection('mysql')->hasTable('clinical_tracer_revisions')) {
            Schema::connection('mysql')->create('clinical_tracer_revisions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('clinical_tracer_id')->constrained('clinical_tracers')->cascadeOnDelete();
                $table->integer('version_number');
                $table->string('change_summary')->nullable()->comment('หมายเหตุ/เหตุผลที่แก้ไข');
                $table->json('snapshot_data')->comment('สำรองข้อมูลทุกฟิลด์ ณ เวอร์ชันนั้นสำหรับ Restore');
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('created_at')->useCurrent();
            });
        }

        // 3. clinical_tracer_attachments: เอกสารแนบ CPG และหลักฐาน
        if (!Schema::connection('mysql')->hasTable('clinical_tracer_attachments')) {
            Schema::connection('mysql')->create('clinical_tracer_attachments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('clinical_tracer_id')->constrained('clinical_tracers')->cascadeOnDelete();
                $table->string('file_name');
                $table->string('file_path');
                $table->bigInteger('file_size')->default(0);
                $table->string('mime_type')->nullable();
                $table->string('description')->nullable();
                $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('mysql')->dropIfExists('clinical_tracer_attachments');
        Schema::connection('mysql')->dropIfExists('clinical_tracer_revisions');
        Schema::connection('mysql')->dropIfExists('clinical_tracers');
    }
};
