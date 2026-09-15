<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('finance_stm_imports', function (Blueprint $table) {
            $table->id();
            $table->string('claim_submission_no')->index()->comment('เลขที่นำเบิก (= เลขที่เอกสาร)');
            $table->string('filename');
            $table->string('stored_path')->nullable();
            $table->string('hcode', 16)->nullable()->index();
            $table->string('hospital_name')->nullable();
            $table->string('province')->nullable();
            $table->string('channel', 16)->nullable();
            $table->string('period_label')->nullable();
            $table->dateTime('reported_at')->nullable();
            $table->unsignedInteger('detail_count')->default(0);
            $table->unsignedInteger('summary_count')->default(0);
            $table->unsignedInteger('rep_count')->default(0);
            $table->decimal('total_claim', 14, 2)->default(0);
            $table->decimal('total_approved', 14, 2)->default(0);
            $table->date('visit_date_min')->nullable();
            $table->date('visit_date_max')->nullable();
            $table->json('sheet_names')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('imported_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique('claim_submission_no');
        });

        Schema::create('finance_stm_detail_rows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('import_id')->constrained('finance_stm_imports')->cascadeOnDelete();
            $table->string('claim_submission_no')->index()->comment('เลขที่นำเบิก');
            $table->string('sheet_name')->nullable();
            $table->string('rep_no')->nullable()->index();
            $table->unsignedInteger('row_no')->nullable();
            $table->string('hn', 32)->nullable()->index();
            $table->string('an', 32)->nullable();
            $table->string('pid', 32)->nullable()->index();
            $table->string('patient_name')->nullable();
            $table->dateTime('visit_at')->nullable();
            $table->date('visit_date')->nullable()->index();
            $table->dateTime('discharge_at')->nullable();
            $table->string('projcode')->nullable();
            $table->decimal('adj_rw', 12, 4)->nullable();
            $table->decimal('amount_claim', 14, 2)->default(0);
            $table->decimal('amount_act', 14, 2)->default(0);
            $table->decimal('amount_room', 14, 2)->default(0);
            $table->decimal('amount_organ', 14, 2)->default(0);
            $table->decimal('amount_drug', 14, 2)->default(0);
            $table->decimal('amount_treat', 14, 2)->default(0);
            $table->decimal('amount_transport', 14, 2)->default(0);
            $table->decimal('amount_wait', 14, 2)->default(0);
            $table->decimal('amount_other', 14, 2)->default(0);
            $table->decimal('amount_approved', 14, 2)->default(0)->comment('พึงรับทั้งหมด');
            $table->string('seq_no', 32)->nullable()->index();
            $table->string('match_key', 96)->nullable()->index();
            $table->timestamps();

            $table->index(['import_id', 'rep_no']);
            $table->index(['claim_submission_no', 'seq_no']);
        });

        Schema::create('finance_stm_summary_rows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('import_id')->constrained('finance_stm_imports')->cascadeOnDelete();
            $table->string('claim_submission_no')->index()->comment('เลขที่นำเบิก');
            $table->string('sheet_name')->nullable();
            $table->string('period')->nullable()->comment('งวด');
            $table->string('hcode', 16)->nullable();
            $table->string('rep_no')->nullable()->index();
            $table->unsignedInteger('count_total')->default(0);
            $table->unsignedInteger('count_pass')->default(0);
            $table->unsignedInteger('count_fail')->default(0);
            $table->decimal('amount_claim', 14, 2)->default(0);
            $table->decimal('amount_act', 14, 2)->default(0);
            $table->decimal('amount_room', 14, 2)->default(0);
            $table->decimal('amount_organ', 14, 2)->default(0);
            $table->decimal('amount_drug', 14, 2)->default(0);
            $table->decimal('amount_treat', 14, 2)->default(0);
            $table->decimal('amount_transport', 14, 2)->default(0);
            $table->decimal('amount_wait', 14, 2)->default(0);
            $table->decimal('amount_other', 14, 2)->default(0);
            $table->decimal('amount_paid_total', 14, 2)->default(0)->comment('จ่ายชดเชยทั้งสิ้น');
            $table->timestamps();

            $table->index(['import_id', 'rep_no']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('finance_stm_summary_rows');
        Schema::dropIfExists('finance_stm_detail_rows');
        Schema::dropIfExists('finance_stm_imports');
    }
};
