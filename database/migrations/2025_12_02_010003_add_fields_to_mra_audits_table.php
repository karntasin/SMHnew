<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * ปรับปรุงตาราง mra_audits ให้รองรับมาตรฐาน สรพ. 2563
     */
    public function up(): void
    {
        Schema::table('mra_audits', function (Blueprint $table) {
            // เพิ่มข้อมูลเพิ่มเติม
            $table->string('cid', 13)->nullable()->after('hn'); // เลขบัตรประชาชน
            $table->date('birthdate')->nullable()->after('patient_name'); // วันเกิด
            $table->string('pttype')->nullable()->after('birthdate'); // สิทธิการรักษา
            $table->string('pttype_name')->nullable()->after('pttype'); // ชื่อสิทธิ
            
            // ข้อมูลการรักษา
            $table->string('doctor_code')->nullable()->after('doctor_name'); // รหัสแพทย์
            $table->string('department_code')->nullable()->after('department'); // รหัสแผนก
            $table->time('visit_time')->nullable()->after('visit_date'); // เวลารับบริการ
            
            // ข้อมูล Clinical
            $table->text('chief_complaint')->nullable()->after('visit_time'); // อาการสำคัญ
            $table->string('pdx')->nullable(); // Principal Diagnosis
            $table->string('pdx_icd10')->nullable(); // ICD-10 ของ PDx
            
            // Vital Signs
            $table->integer('bp_systolic')->nullable(); // ความดันตัวบน
            $table->integer('bp_diastolic')->nullable(); // ความดันตัวล่าง
            $table->decimal('pulse', 5, 1)->nullable(); // ชีพจร
            $table->decimal('temperature', 4, 1)->nullable(); // อุณหภูมิ
            $table->integer('respiratory_rate')->nullable(); // อัตราการหายใจ
            
            // คะแนน MRA
            $table->decimal('total_max_score', 5, 1)->default(0); // คะแนนเต็มรวม
            $table->decimal('total_obtained_score', 5, 1)->default(0); // คะแนนที่ได้
            $table->decimal('accuracy_percentage', 5, 2)->default(0); // เปอร์เซ็นต์ความถูกต้อง
            
            // เพิ่ม audit type (OPD/IPD)
            $table->enum('audit_type', ['opd', 'ipd'])->default('opd')->after('status');
            
            // เพิ่มวันที่ตรวจสอบเสร็จ
            $table->timestamp('audited_at')->nullable();
            
            // Index
            $table->index('cid');
            $table->index('audit_type');
            $table->index('audited_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('mra_audits', function (Blueprint $table) {
            $table->dropColumn([
                'cid', 'birthdate', 'pttype', 'pttype_name',
                'doctor_code', 'department_code', 'visit_time',
                'chief_complaint', 'pdx', 'pdx_icd10',
                'bp_systolic', 'bp_diastolic', 'pulse', 'temperature', 'respiratory_rate',
                'total_max_score', 'total_obtained_score', 'accuracy_percentage',
                'audit_type', 'audited_at'
            ]);
        });
    }
};
