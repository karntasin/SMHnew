<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. ตารางชุดการส่งเบิก (Claim Batches)
        Schema::create('rcm_claim_batches', function (Blueprint $table) {
            $table->id();
            $table->string('batch_no', 64)->unique();
            $table->string('claim_type', 16); // CSOP, CIPN
            $table->string('scheme_code', 16)->default('OFC'); // OFC, LGO, BKK, PTY
            $table->date('period_start');
            $table->date('period_end');
            $table->unsignedInteger('total_cases')->default(0);
            $table->decimal('total_claim_amount', 14, 2)->default(0);
            $table->decimal('total_approved_amount', 14, 2)->default(0);
            $table->decimal('clean_claim_rate', 5, 2)->default(0); // ร้อยละเคสที่ผ่านการ Audit
            $table->string('status', 32)->default('draft'); // draft, scrubbed, exported, reconciled, closed
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 2. ตารางรายการเคลมรายบุคคล (Claim Items)
        Schema::create('rcm_claim_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_id')->nullable()->constrained('rcm_claim_batches')->nullOnDelete();
            $table->string('claim_type', 16); // CSOP, CIPN
            $table->string('scheme_code', 16)->default('OFC');
            $table->string('vn', 32)->nullable()->index();
            $table->string('an', 32)->nullable()->index();
            $table->string('hn', 32)->index();
            $table->string('pid', 32)->nullable()->index();
            $table->string('patient_name')->nullable();
            $table->date('service_date')->index();
            $table->string('pttype', 16)->nullable();
            $table->string('pttype_name')->nullable();
            $table->decimal('total_amount', 14, 2)->default(0);
            $table->decimal('claim_amount', 14, 2)->default(0);
            $table->decimal('approved_amount', 14, 2)->default(0);
            $table->decimal('shortfall_amount', 14, 2)->default(0);
            $table->string('drg', 16)->nullable();
            $table->decimal('adj_rw', 8, 4)->nullable();
            $table->string('auth_code', 64)->nullable();
            $table->string('project_code', 32)->nullable();
            $table->string('audit_status', 16)->default('pending'); // pass, warning, error, pending
            $table->json('audit_findings')->nullable();
            $table->string('reconcile_status', 32)->default('pending'); // pending, matched_full, matched_partial, rejected
            $table->string('denial_code', 64)->nullable();
            $table->text('denial_description')->nullable();
            $table->timestamps();
        });

        // 3. ตารางแค็ตตาล็อกกฎการ Audit (Audit Rules)
        Schema::create('rcm_audit_rules', function (Blueprint $table) {
            $table->id();
            $table->string('rule_code', 64)->unique();
            $table->string('category', 16)->default('COMMON'); // CSOP, CIPN, COMMON
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('severity', 16)->default('warning'); // error (ห้ามส่ง), warning (เตือน)
            $table->text('fix_instruction')->nullable(); // คำแนะนำการแก้ไขใน HOSxP
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 4. ตารางติดตามการอุทธรณ์ (Appeal Cases)
        Schema::create('rcm_appeal_cases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('claim_item_id')->constrained('rcm_claim_items')->cascadeOnDelete();
            $table->string('denial_code', 64)->nullable();
            $table->text('denial_detail')->nullable();
            $table->decimal('shortfall_amount', 14, 2)->default(0);
            $table->string('appeal_status', 32)->default('pending'); // pending, submitted, approved, rejected
            $table->text('appeal_reason')->nullable();
            $table->decimal('recovered_amount', 14, 2)->default(0);
            $table->dateTime('submitted_at')->nullable();
            $table->dateTime('resolved_at')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rcm_appeal_cases');
        Schema::dropIfExists('rcm_audit_rules');
        Schema::dropIfExists('rcm_claim_items');
        Schema::dropIfExists('rcm_claim_batches');
    }
};
