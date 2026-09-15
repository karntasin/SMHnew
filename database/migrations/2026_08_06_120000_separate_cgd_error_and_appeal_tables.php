<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('finance_cgd_appeal_cases')) {
            Schema::create('finance_cgd_appeal_cases', function (Blueprint $table) {
                $table->id();
                $table->string('match_key', 191)->index();
                $table->string('hn', 64)->nullable()->index();
                $table->string('pid', 32)->nullable();
                $table->string('seq_no', 64)->nullable()->index();
                $table->string('patient_name')->nullable();
                $table->string('rep_no', 64)->nullable()->index();
                $table->string('claim_submission_no', 64)->nullable()->index();
                $table->foreignId('original_batch_id')->nullable()->constrained('finance_cgd_stm_batches')->nullOnDelete();
                $table->decimal('original_amount_claim', 14, 2)->default(0);
                $table->decimal('original_amount_approved', 14, 2)->default(0);
                $table->decimal('original_shortfall', 14, 2)->default(0);
                $table->string('current_status', 32)->default('eligible')->index();
                $table->decimal('appeal_amount_requested', 14, 2)->default(0);
                $table->decimal('appeal_amount_approved', 14, 2)->default(0);
                $table->decimal('current_amount_approved', 14, 2)->default(0);
                $table->foreignId('latest_appeal_batch_id')->nullable()->constrained('finance_cgd_stm_batches')->nullOnDelete();
                $table->unsignedInteger('appeal_count')->default(0);
                $table->timestamp('first_seen_at')->nullable();
                $table->timestamp('last_updated_at')->nullable();
                $table->timestamps();

                $table->unique(['match_key', 'rep_no'], 'cgd_appeal_cases_match_rep_unique');
            });
        }

        if (! Schema::hasTable('finance_cgd_appeal_events')) {
            Schema::create('finance_cgd_appeal_events', function (Blueprint $table) {
                $table->id();
                $table->foreignId('appeal_case_id')->constrained('finance_cgd_appeal_cases')->cascadeOnDelete();
                $table->string('event_type', 32)->index();
                $table->foreignId('batch_id')->nullable()->constrained('finance_cgd_stm_batches')->nullOnDelete();
                $table->decimal('amount_approved_before', 14, 2)->nullable();
                $table->decimal('amount_approved_after', 14, 2)->nullable();
                $table->decimal('appeal_amount_before', 14, 2)->nullable();
                $table->decimal('appeal_amount_after', 14, 2)->nullable();
                $table->text('note')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index(['appeal_case_id', 'created_at']);
            });
        }

        if (Schema::hasTable('finance_cgd_error_cases') && Schema::hasTable('finance_cgd_error_events')) {
            // ลบเคส/เหตุการณ์ที่เกิดจากไฟล์ APPEAL (เคยผูกผิดกับ Error)
            $appealBatchIds = DB::table('finance_cgd_stm_batches')
                ->where('file_kind', 'appeal')
                ->pluck('id')
                ->all();

            if ($appealBatchIds !== []) {
                $caseIdsFromAppeal = DB::table('finance_cgd_error_events')
                    ->whereIn('batch_id', $appealBatchIds)
                    ->pluck('error_case_id')
                    ->unique()
                    ->all();

                if ($caseIdsFromAppeal !== []) {
                    DB::table('finance_cgd_error_events')->whereIn('error_case_id', $caseIdsFromAppeal)->delete();
                    DB::table('finance_cgd_error_cases')->whereIn('id', $caseIdsFromAppeal)->delete();
                }
            }

            DB::table('finance_cgd_error_events')
                ->whereIn('event_type', ['marked_appealed', 'appeal_imported'])
                ->delete();

            // ปรับสถานะเดิมให้เหลือเฉพาะ open / fixed / still_open
            DB::table('finance_cgd_error_cases')
                ->where('current_status', 'appealed')
                ->update(['current_status' => 'open', 'updated_at' => now()]);

            DB::table('finance_cgd_error_cases')
                ->where('current_status', 'resolved')
                ->update(['current_status' => 'fixed', 'current_error_code' => null, 'updated_at' => now()]);

            DB::table('finance_cgd_error_cases')
                ->where('current_status', 'unresolved')
                ->update(['current_status' => 'still_open', 'updated_at' => now()]);

            DB::table('finance_cgd_error_events')
                ->where('event_type', 'resolved')
                ->update(['event_type' => 'fixed', 'updated_at' => now()]);

            DB::table('finance_cgd_error_events')
                ->where('event_type', 'still_error')
                ->update(['event_type' => 'still_error', 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('finance_cgd_appeal_events');
        Schema::dropIfExists('finance_cgd_appeal_cases');
    }
};
