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
        // 1. sar_cycles: รอบปีประเมิน SAR
        if (!Schema::connection('mysql')->hasTable('sar_cycles')) {
            Schema::connection('mysql')->create('sar_cycles', function (Blueprint $table) {
                $table->id();
                $table->string('year', 10)->comment('ปี พ.ศ. เช่น 2569');
                $table->string('title')->comment('ชื่อรอบ เช่น SAR ประจำปี 2569');
                $table->string('hospital_name')->default('โรงพยาบาลค่ายสุรสิงหนาท');
                $table->string('bed_count')->nullable()->default('60 เตียง (เปิดให้บริการจริง 30 เตียง)');
                $table->enum('status', ['draft', 'active', 'archived'])->default('active');
                $table->boolean('is_current')->default(true);
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        // 2. sar_parts: ตอนที่ 1 - 4
        if (!Schema::connection('mysql')->hasTable('sar_parts')) {
            Schema::connection('mysql')->create('sar_parts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('sar_cycle_id')->constrained('sar_cycles')->cascadeOnDelete();
                $table->string('part_number', 10)->comment('I, II, III, IV');
                $table->string('part_name')->comment('ชื่อตอน');
                $table->text('description')->nullable();
                $table->integer('order')->default(1);
                $table->timestamps();
            });
        }

        // 3. sar_sections: หมวดมาตรฐานรายข้อ
        if (!Schema::connection('mysql')->hasTable('sar_sections')) {
            Schema::connection('mysql')->create('sar_sections', function (Blueprint $table) {
                $table->id();
                $table->foreignId('sar_part_id')->constrained('sar_parts')->cascadeOnDelete();
                $table->string('code', 50)->comment('เช่น I-1, II-1, III-1, IV-1');
                $table->string('title')->comment('ชื่อหมวดมาตรฐาน');
                $table->longText('requirement')->nullable()->comment('ข้อกำหนดโดยรวมของมาตรฐาน');
                $table->longText('context')->nullable()->comment('i. บริบท');
                $table->json('self_assessment_data')->nullable()->comment('ตารางประเมินตนเอง: ข้อกำหนด, Score, DALI Gap, ประเด็นพัฒนา');
                $table->longText('process_content')->nullable()->comment('ii. กระบวนการปฏิบัติตามมาตรฐาน');
                $table->longText('achievements')->nullable()->comment('iii. ผลการพัฒนาที่โดดเด่นและภาคภูมิใจ');
                $table->json('results_kpi_data')->nullable()->comment('iv. ผลลัพธ์และตัวชี้วัดสำคัญ พร้อม PDCA');
                $table->foreignId('lead_team_id')->nullable()->constrained('teamha')->nullOnDelete();
                $table->string('lead_person_name')->nullable();
                $table->enum('status', ['draft', 'in_progress', 'completed', 'approved'])->default('draft');
                $table->integer('current_version')->default(1);
                $table->foreignId('last_modified_by')->nullable()->constrained('users')->nullOnDelete();
                $table->integer('order')->default(0);
                $table->timestamps();
            });
        }

        // 4. sar_revisions: บันทึก Log การแก้ไขทุกครั้ง และใช้สำหรับกู้คืนข้อมูล
        if (!Schema::connection('mysql')->hasTable('sar_revisions')) {
            Schema::connection('mysql')->create('sar_revisions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('sar_section_id')->constrained('sar_sections')->cascadeOnDelete();
                $table->integer('version_number');
                $table->string('change_summary')->nullable()->comment('หมายเหตุ/เหตุผลที่แก้ไข');
                $table->json('snapshot_data')->comment('สำรองข้อมูลทั้งก้อน ณ เวอร์ชันนั้นสำหรับ Restore');
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('created_at')->useCurrent();
            });
        }

        // 5. sar_attachments: เอกสารแนบและหลักฐานอ้างอิง
        if (!Schema::connection('mysql')->hasTable('sar_attachments')) {
            Schema::connection('mysql')->create('sar_attachments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('sar_section_id')->constrained('sar_sections')->cascadeOnDelete();
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
        Schema::connection('mysql')->dropIfExists('sar_attachments');
        Schema::connection('mysql')->dropIfExists('sar_revisions');
        Schema::connection('mysql')->dropIfExists('sar_sections');
        Schema::connection('mysql')->dropIfExists('sar_parts');
        Schema::connection('mysql')->dropIfExists('sar_cycles');
    }
};
