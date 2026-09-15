<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('finance_cgd_stm_batches', function (Blueprint $table) {
            if (! Schema::hasColumn('finance_cgd_stm_batches', 'file_kind')) {
                $table->string('file_kind', 16)->default('rep')->after('source_format')->index();
            }
            if (! Schema::hasColumn('finance_cgd_stm_batches', 'parent_document_hint')) {
                $table->string('parent_document_hint', 191)->nullable()->after('file_kind');
            }
        });

        if (! Schema::hasTable('finance_cgd_error_cases')) {
            Schema::create('finance_cgd_error_cases', function (Blueprint $table) {
                $table->id();
                $table->string('match_key', 191)->index();
                $table->string('hn', 64)->nullable()->index();
                $table->string('pid', 32)->nullable();
                $table->string('seq_no', 64)->nullable()->index();
                $table->string('patient_name')->nullable();
                $table->string('rep_no', 64)->nullable()->index();
                $table->string('claim_submission_no', 64)->nullable()->index();
                $table->foreignId('original_batch_id')->nullable()->constrained('finance_cgd_stm_batches')->nullOnDelete();
                $table->string('original_error_code', 64)->nullable();
                $table->decimal('original_amount_claim', 14, 2)->default(0);
                $table->decimal('original_amount_approved', 14, 2)->default(0);
                $table->string('current_status', 32)->default('open')->index();
                $table->string('current_error_code', 64)->nullable()->index();
                $table->decimal('current_amount_approved', 14, 2)->default(0);
                $table->foreignId('latest_batch_id')->nullable()->constrained('finance_cgd_stm_batches')->nullOnDelete();
                $table->unsignedInteger('appeal_count')->default(0);
                $table->timestamp('first_seen_at')->nullable();
                $table->timestamp('last_updated_at')->nullable();
                $table->timestamps();

                $table->unique(['match_key', 'rep_no'], 'cgd_error_cases_match_rep_unique');
            });
        }

        if (! Schema::hasTable('finance_cgd_error_events')) {
            Schema::create('finance_cgd_error_events', function (Blueprint $table) {
                $table->id();
                $table->foreignId('error_case_id')->constrained('finance_cgd_error_cases')->cascadeOnDelete();
                $table->string('event_type', 32)->index();
                $table->foreignId('batch_id')->nullable()->constrained('finance_cgd_stm_batches')->nullOnDelete();
                $table->string('error_code_before', 64)->nullable();
                $table->string('error_code_after', 64)->nullable();
                $table->decimal('amount_approved_before', 14, 2)->nullable();
                $table->decimal('amount_approved_after', 14, 2)->nullable();
                $table->text('note')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index(['error_case_id', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('finance_cgd_error_events');
        Schema::dropIfExists('finance_cgd_error_cases');

        Schema::table('finance_cgd_stm_batches', function (Blueprint $table) {
            if (Schema::hasColumn('finance_cgd_stm_batches', 'parent_document_hint')) {
                $table->dropColumn('parent_document_hint');
            }
            if (Schema::hasColumn('finance_cgd_stm_batches', 'file_kind')) {
                $table->dropColumn('file_kind');
            }
        });
    }
};
