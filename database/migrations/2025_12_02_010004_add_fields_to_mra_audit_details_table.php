<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * ปรับปรุงตาราง mra_audit_details ให้เชื่อมกับ criteria
     */
    public function up(): void
    {
        Schema::table('mra_audit_details', function (Blueprint $table) {
            // เชื่อมกับ criteria
            $table->foreignId('mra_criteria_id')
                ->nullable()
                ->after('mra_audit_id')
                ->constrained('mra_criteria')
                ->nullOnDelete();
            
            // ข้อมูลค่าจาก HOSxP (auto-fetch)
            $table->text('hosxp_value')->nullable()->after('item_description'); // ค่าที่ดึงจาก HOSxP
            
            // คะแนน
            $table->integer('max_score')->default(1)->after('hosxp_value'); // คะแนนเต็มของข้อนี้
            $table->integer('obtained_score')->default(0)->after('max_score'); // คะแนนที่ได้
            
            // สถานะการตรวจ
            $table->enum('result', ['pass', 'fail', 'na', 'pending'])->default('pending')->after('is_correct');
            
            // Index
            $table->index('mra_criteria_id');
            $table->index('result');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('mra_audit_details', function (Blueprint $table) {
            $table->dropForeign(['mra_criteria_id']);
            $table->dropColumn(['mra_criteria_id', 'hosxp_value', 'max_score', 'obtained_score', 'result']);
        });
    }
};
