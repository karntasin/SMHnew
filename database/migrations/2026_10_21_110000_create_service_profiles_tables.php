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
        // 1. service_profiles: ตารางข้อมูลการจัดบริการของแต่ละแผนกและทีม
        if (!Schema::connection('mysql')->hasTable('service_profiles')) {
            Schema::connection('mysql')->create('service_profiles', function (Blueprint $table) {
                $table->id();
                $table->string('code', 50)->unique()->comment('รหัสแผนก เช่น OPD, IPD, ER, LAB, PY, TCM');
                $table->string('name')->comment('ชื่อแผนก / หน่วยงาน');
                $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
                $table->foreignId('team_ha_id')->nullable()->constrained('teamha')->nullOnDelete();
                $table->enum('service_group', [
                    'clinical',           // กลุ่มบริการทางคลินิก
                    'diagnostic_support', // กลุ่มบริการวินิจฉัยและสนับสนุนทางการแพทย์
                    'general_support',    // กลุ่มสนับสนุนทั่วไปและบริหารจัดการ
                    'quality_safety'      // กลุ่มงานคุณภาพและความปลอดภัย
                ])->default('clinical')->comment('กลุ่มสายงาน');
                
                $table->string('cycle_year', 10)->default('2569')->comment('รอบปีการประเมิน');
                $table->string('leader_name')->nullable()->comment('หัวหน้าแผนก/ผู้ประสานงานหลัก');

                // 5 ส่วนมาตรฐานตามเกณฑ์ สรพ.
                // ส่วนที่ 1: บริบท (Context)
                $table->longText('purpose')->nullable()->comment('ก. หน้าที่และเป้าหมาย');
                $table->longText('scope_of_service')->nullable()->comment('ข. ขอบเขตการให้บริการ');
                $table->json('target_customers')->nullable()->comment('ค. ผู้รับผลงานและความต้องการสำคัญ (ลูกค้าภายนอก/ภายใน)');
                $table->longText('key_quality_issues')->nullable()->comment('ง. ประเด็นคุณภาพสำคัญ');
                $table->longText('key_risks_challenges')->nullable()->comment('จ. ความท้าทายและความเสี่ยงสำคัญ (clinic & non-clinic)');
                $table->json('workload_and_resources')->nullable()->comment('ฉ. ปริมาณงาน สถิติ และทรัพยากร (คน เครื่องมือ สถานที่)');

                // ส่วนที่ 2: กระบวนการสำคัญ (Key Processes)
                $table->json('key_processes')->nullable()->comment('ตารางกระบวนการสำคัญ สิ่งที่คาดหวัง และตัวชี้วัดกำกับ');

                // ส่วนที่ 3: ตัวชี้วัดผลการดำเนินงาน 5-6 ปีย้อนหลัง (Performance Indicators)
                $table->json('performance_indicators')->nullable()->comment('ตารางตัวชี้วัดย้อนหลัง พ.ศ. 2564-2569');

                // ส่วนที่ 4: ระบบงานและ CQI (Current Systems & CQI Projects)
                $table->longText('current_systems')->nullable()->comment('4.1 ระบบงานปัจจุบัน/CQI ที่เสร็จสิ้นแล้ว');
                $table->longText('ongoing_improvements')->nullable()->comment('4.2 การพัฒนาคุณภาพที่อยู่ระหว่างดำเนินการ');

                // ส่วนที่ 5: แผนการพัฒนาต่อเนื่อง (Future CQI Plans)
                $table->longText('future_plans')->nullable()->comment('5. แผนการพัฒนาต่อเนื่อง 1-3 ปีข้างหน้า');

                $table->enum('status', ['draft', 'review', 'published'])->default('published');
                $table->integer('current_version')->default(1);
                $table->integer('order')->default(0);
                $table->foreignId('last_modified_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        // 2. service_profile_revisions: บันทึก Snapshot ประวัติการแก้ไขและกู้คืน (Restore)
        if (!Schema::connection('mysql')->hasTable('service_profile_revisions')) {
            Schema::connection('mysql')->create('service_profile_revisions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('service_profile_id')->constrained('service_profiles')->cascadeOnDelete();
                $table->integer('version_number');
                $table->string('change_summary')->nullable()->comment('บันทึกสรุปการแก้ไข');
                $table->json('snapshot_data')->comment('สำรองข้อมูลทุกฟิลด์ ณ เวอร์ชันนั้นสำหรับ Restore');
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('created_at')->useCurrent();
            });
        }

        // 3. service_profile_attachments: ไฟล์เอกสารแนบประจำหน่วยงาน
        if (!Schema::connection('mysql')->hasTable('service_profile_attachments')) {
            Schema::connection('mysql')->create('service_profile_attachments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('service_profile_id')->constrained('service_profiles')->cascadeOnDelete();
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
        Schema::connection('mysql')->dropIfExists('service_profile_attachments');
        Schema::connection('mysql')->dropIfExists('service_profile_revisions');
        Schema::connection('mysql')->dropIfExists('service_profiles');
    }
};
