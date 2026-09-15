<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ---- หมวดที่ 1: IT Master Plan & Strategy ----
        Schema::create('im_it_plans', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('year')->index();
            $table->string('title');
            $table->text('vision')->nullable();
            $table->string('status', 24)->default('active')->index(); // draft|active|closed
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('im_strategic_mappings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('it_plan_id')->constrained('im_it_plans')->cascadeOnDelete();
            $table->text('hospital_strategy');
            $table->text('it_strategy');
            $table->text('success_factor')->nullable();
            $table->decimal('analysis_accuracy', 5, 2)->default(0); // % ความถูกต้อง (ต้อง >= 50)
            $table->text('note')->nullable();
            $table->timestamps();
        });

        Schema::create('im_action_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('it_plan_id')->constrained('im_it_plans')->cascadeOnDelete();
            $table->string('project');
            $table->text('objective')->nullable();
            $table->decimal('budget', 14, 2)->default(0);
            $table->decimal('actual_budget', 14, 2)->nullable();
            $table->string('owner')->nullable();
            $table->date('start_date');
            $table->date('end_date');
            $table->string('status', 24)->default('planned')->index(); // planned|in_progress|done|cancelled
            $table->unsignedTinyInteger('progress')->default(0); // 0-100
            $table->string('pdca_stage', 12)->default('plan'); // plan|do|check|act
            $table->text('problems')->nullable();
            $table->text('lessons_learned')->nullable();
            $table->timestamps();
        });

        // ---- หมวดที่ 2: IT Risk Management ----
        Schema::create('im_risks', function (Blueprint $table) {
            $table->id();
            $table->string('code', 32)->index();
            $table->unsignedSmallInteger('year')->index();
            $table->string('category')->nullable();
            $table->text('description');
            $table->boolean('is_incident')->default(false); // true = อุบัติการณ์ที่เกิดแล้ว (บล็อกไม่ให้ประเมิน)
            $table->unsignedTinyInteger('likelihood')->default(1); // P 1-5
            $table->unsignedTinyInteger('impact')->default(1);     // I 1-5
            $table->unsignedSmallInteger('score')->default(1);     // P x I
            $table->string('strategy', 12)->nullable(); // avoid|reduce|share|accept
            $table->text('mitigation')->nullable();
            $table->unsignedTinyInteger('residual_likelihood')->nullable();
            $table->unsignedTinyInteger('residual_impact')->nullable();
            $table->unsignedSmallInteger('residual_score')->nullable();
            $table->unsignedTinyInteger('pdca_round')->default(1);
            $table->foreignId('previous_risk_id')->nullable()->constrained('im_risks')->nullOnDelete();
            $table->string('owner')->nullable();
            $table->string('status', 24)->default('open')->index(); // open|mitigating|closed
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // ---- หมวดที่ 3: IT Security, PDPA & Business Continuity ----
        Schema::create('im_policies', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('type', 24)->default('security')->index(); // security|pdpa|other
            $table->string('version', 24)->default('1.0');
            $table->text('summary')->nullable();
            $table->string('file_path')->nullable();
            $table->date('effective_date')->nullable();
            $table->string('status', 24)->default('published')->index(); // draft|published|archived
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('im_awareness_records', function (Blueprint $table) {
            $table->id();
            $table->string('staff_name');
            $table->string('department')->nullable();
            $table->foreignId('policy_id')->nullable()->constrained('im_policies')->nullOnDelete();
            $table->unsignedSmallInteger('score')->default(0);
            $table->unsignedSmallInteger('max_score')->default(100);
            $table->boolean('passed')->default(false);
            $table->date('tested_at')->nullable();
            $table->timestamps();
        });

        Schema::create('im_bcp_drills', function (Blueprint $table) {
            $table->id();
            $table->string('system_name');
            $table->string('type', 8)->default('BCP'); // BCP|DRP
            $table->text('scope')->nullable();
            $table->date('drill_date');
            $table->unsignedInteger('duration_seconds')->default(0);
            $table->unsignedInteger('rto_target_minutes')->nullable();
            $table->string('result', 12)->default('pass'); // pass|partial|fail
            $table->text('report')->nullable();
            $table->text('improvements')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('im_backup_logs', function (Blueprint $table) {
            $table->id();
            $table->date('backup_date')->index();
            $table->string('type', 12)->default('offline'); // offline|online
            $table->string('scope')->nullable();
            $table->string('status', 12)->default('success'); // success|partial|failed
            $table->decimal('size_gb', 10, 2)->nullable();
            $table->text('notes')->nullable();
            $table->string('performed_by')->nullable();
            $table->timestamps();
        });

        // ---- หมวดที่ 4: IT Service Desk & Incident Management ----
        Schema::create('im_service_tickets', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_no', 32)->unique();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('requester')->nullable();
            $table->string('department')->nullable();
            $table->string('category')->nullable();
            $table->string('priority', 12)->default('medium'); // low|medium|high|critical
            $table->unsignedSmallInteger('sla_hours')->default(24);
            $table->string('status', 16)->default('open')->index(); // open|in_progress|resolved|closed
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('opened_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });

        Schema::create('im_incidents', function (Blueprint $table) {
            $table->id();
            $table->string('incident_no', 32)->unique();
            $table->string('title');
            $table->string('hait_category')->nullable(); // หัวข้อตามมาตรฐาน HAIT
            $table->timestamp('occurred_at')->nullable();
            $table->unsignedInteger('downtime_minutes')->default(0);
            $table->string('severity', 12)->default('minor'); // minor|major|critical
            $table->text('impact')->nullable();
            $table->text('root_cause')->nullable();
            $table->text('problem_action')->nullable(); // Problem Management ป้องกันเกิดซ้ำ
            $table->string('status', 16)->default('open')->index(); // open|investigating|resolved
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('im_timesheets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('staff_name')->nullable();
            $table->date('work_date')->index();
            $table->decimal('hours', 4, 2)->default(0);
            $table->string('category')->nullable();
            $table->string('activity');
            $table->text('note')->nullable();
            $table->timestamps();
        });

        // ---- หมวดที่ 5: Medical Record Quality Control ----
        Schema::create('im_mr_audits', function (Blueprint $table) {
            $table->id();
            $table->string('record_type', 8)->default('OPD'); // OPD|IPD
            $table->string('patient_ref', 32)->nullable(); // HN/AN
            $table->string('doctor')->nullable();
            $table->date('audit_date');
            $table->string('auditor')->nullable();
            $table->json('items')->nullable(); // รายหัวข้อ + คะแนน
            $table->decimal('total_score', 6, 2)->default(0);
            $table->decimal('max_score', 6, 2)->default(100);
            $table->decimal('percent', 5, 2)->default(0);
            $table->unsignedTinyInteger('star_level')->default(1);
            $table->text('note')->nullable();
            $table->boolean('print_checked')->default(false); // Print Preview & Discrepancy
            $table->text('discrepancy')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // ---- หมวดที่ 6: Software Development Quality Assurance ----
        Schema::create('im_sdlc_documents', function (Blueprint $table) {
            $table->id();
            $table->string('project')->index();
            $table->string('doc_type', 32)->default('other'); // sa|context_diagram|dfd|er|sequence|data_dictionary|user_manual|other
            $table->string('title');
            $table->string('version', 24)->default('1.0');
            $table->string('file_path')->nullable();
            $table->string('repo_url')->nullable();
            $table->text('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('im_code_reviews', function (Blueprint $table) {
            $table->id();
            $table->string('project')->index();
            $table->string('repo_url')->nullable();
            $table->string('reviewer')->nullable();
            $table->boolean('is_external')->default(true);
            $table->decimal('comment_score', 5, 2)->default(0); // คะแนนคุณภาพ comment
            $table->text('findings')->nullable();
            $table->text('recommendation')->nullable();
            $table->date('reviewed_at')->nullable();
            $table->timestamps();
        });

        // ---- หมวดที่ 7: IT Resource, Competency & Change Management ----
        Schema::create('im_assets', function (Blueprint $table) {
            $table->id();
            $table->string('asset_code', 48)->nullable()->index();
            $table->string('name');
            $table->string('type', 16)->default('hardware'); // hardware|software|network
            $table->text('spec')->nullable();
            $table->string('license_status', 16)->default('na'); // licensed|free|expired|na
            $table->unsignedInteger('quantity')->default(1);
            $table->string('capacity')->nullable();
            $table->decimal('utilization', 5, 2)->nullable(); // %
            $table->string('location')->nullable();
            $table->string('status', 16)->default('active'); // active|retired|repair
            $table->text('note')->nullable();
            $table->timestamps();
        });

        Schema::create('im_competencies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('staff_name');
            $table->string('competency');
            $table->unsignedTinyInteger('required_level')->default(3);
            $table->unsignedTinyInteger('actual_level')->default(1);
            $table->smallInteger('gap')->default(0); // actual - required
            $table->text('idp')->nullable(); // Individual Development Plan
            $table->date('assessed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('im_change_requests', function (Blueprint $table) {
            $table->id();
            $table->string('cr_no', 32)->unique();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('requested_by')->nullable();
            $table->string('category')->nullable();
            $table->string('impact', 12)->default('low'); // low|medium|high
            $table->text('risk_note')->nullable();
            $table->string('status', 16)->default('pending')->index(); // pending|approved|rejected|implemented
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->date('planned_date')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('im_change_requests');
        Schema::dropIfExists('im_competencies');
        Schema::dropIfExists('im_assets');
        Schema::dropIfExists('im_code_reviews');
        Schema::dropIfExists('im_sdlc_documents');
        Schema::dropIfExists('im_mr_audits');
        Schema::dropIfExists('im_timesheets');
        Schema::dropIfExists('im_incidents');
        Schema::dropIfExists('im_service_tickets');
        Schema::dropIfExists('im_backup_logs');
        Schema::dropIfExists('im_bcp_drills');
        Schema::dropIfExists('im_awareness_records');
        Schema::dropIfExists('im_policies');
        Schema::dropIfExists('im_risks');
        Schema::dropIfExists('im_action_plans');
        Schema::dropIfExists('im_strategic_mappings');
        Schema::dropIfExists('im_it_plans');
    }
};
