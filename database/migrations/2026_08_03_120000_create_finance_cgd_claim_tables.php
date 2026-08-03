<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('finance_cgd_stm_batches', function (Blueprint $table) {
            $table->id();
            $table->string('filename');
            $table->string('stored_path')->nullable();
            $table->string('document_no')->nullable()->index();
            $table->string('hcode', 16)->nullable();
            $table->string('period_label')->nullable();
            $table->string('channel', 16)->default('OP');
            $table->unsignedInteger('row_count')->default(0);
            $table->decimal('total_claim', 14, 2)->default(0);
            $table->decimal('total_approved', 14, 2)->default(0);
            $table->date('visit_date_min')->nullable();
            $table->date('visit_date_max')->nullable();
            $table->string('status', 32)->default('imported');
            $table->text('notes')->nullable();
            $table->foreignId('imported_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('finance_cgd_stm_rows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_id')->constrained('finance_cgd_stm_batches')->cascadeOnDelete();
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
            $table->decimal('amount_approved', 14, 2)->default(0);
            $table->string('seq_no', 32)->nullable()->index();
            $table->string('match_key', 96)->nullable()->index();
            $table->timestamps();
        });

        Schema::create('finance_cgd_reconciliations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_id')->constrained('finance_cgd_stm_batches')->cascadeOnDelete();
            $table->date('start_date');
            $table->date('end_date');
            $table->string('pttype_like', 32)->default('12%');
            $table->string('exclude_deps')->default('021');
            $table->unsignedInteger('hosxp_count')->default(0);
            $table->unsignedInteger('stm_count')->default(0);
            $table->unsignedInteger('matched_ok')->default(0);
            $table->unsignedInteger('matched_short')->default(0);
            $table->unsignedInteger('matched_over')->default(0);
            $table->unsignedInteger('only_hosxp')->default(0);
            $table->unsignedInteger('only_stm')->default(0);
            $table->decimal('total_hosxp', 14, 2)->default(0);
            $table->decimal('total_stm_claim', 14, 2)->default(0);
            $table->decimal('total_stm_approved', 14, 2)->default(0);
            $table->decimal('total_shortfall', 14, 2)->default(0);
            $table->decimal('total_claim_diff', 14, 2)->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('finance_cgd_reconcile_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reconciliation_id')->constrained('finance_cgd_reconciliations')->cascadeOnDelete();
            $table->string('status', 32)->index();
            $table->string('hn', 32)->nullable()->index();
            $table->string('pid', 32)->nullable()->index();
            $table->string('seq_no', 32)->nullable()->index();
            $table->string('match_key', 96)->nullable()->index();
            $table->string('patient_name')->nullable();
            $table->date('visit_date')->nullable();
            $table->string('department')->nullable();
            $table->string('pttype')->nullable();
            $table->decimal('hosxp_drug', 14, 2)->nullable();
            $table->decimal('hosxp_organ', 14, 2)->nullable();
            $table->decimal('hosxp_service', 14, 2)->nullable();
            $table->decimal('hosxp_total', 14, 2)->nullable();
            $table->decimal('hosxp_paid', 14, 2)->nullable();
            $table->decimal('hosxp_debt', 14, 2)->nullable();
            $table->decimal('stm_claim', 14, 2)->nullable();
            $table->decimal('stm_approved', 14, 2)->nullable();
            $table->decimal('stm_drug', 14, 2)->nullable();
            $table->decimal('stm_organ', 14, 2)->nullable();
            $table->decimal('stm_treat', 14, 2)->nullable();
            $table->string('rep_no')->nullable();
            $table->decimal('diff_claim', 14, 2)->default(0);
            $table->decimal('diff_approved', 14, 2)->default(0);
            $table->decimal('shortfall', 14, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('finance_cgd_reconcile_items');
        Schema::dropIfExists('finance_cgd_reconciliations');
        Schema::dropIfExists('finance_cgd_stm_rows');
        Schema::dropIfExists('finance_cgd_stm_batches');
    }
};
