<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('finance_cgd_stm_batches', function (Blueprint $table) {
            $table->string('source_format', 16)->default('stm')->after('channel');
            $table->unsignedInteger('error_row_count')->default(0)->after('row_count');
            $table->unsignedInteger('zero_fund_count')->default(0)->after('error_row_count');
        });

        Schema::table('finance_cgd_stm_rows', function (Blueprint $table) {
            $table->string('tran_id', 32)->nullable()->after('rep_no')->index();
            $table->string('error_code', 64)->nullable()->after('seq_no')->index();
            $table->string('fund_codes', 128)->nullable()->after('error_code');
            $table->decimal('amount_billable', 14, 2)->nullable()->after('amount_claim');
            $table->decimal('amount_not_billable', 14, 2)->nullable()->after('amount_billable');
            $table->decimal('amount_self_pay', 14, 2)->nullable()->after('amount_not_billable');
            $table->text('remark')->nullable()->after('match_key');
        });

        Schema::table('finance_cgd_reconcile_items', function (Blueprint $table) {
            $table->string('error_code', 64)->nullable()->after('rep_no')->index();
            $table->string('fund_codes', 128)->nullable()->after('error_code');
            $table->string('tran_id', 32)->nullable()->after('fund_codes');
            $table->text('remark')->nullable()->after('tran_id');
        });

        Schema::create('finance_cgd_zero_fund_rows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_id')->constrained('finance_cgd_stm_batches')->cascadeOnDelete();
            $table->unsignedInteger('row_no')->nullable();
            $table->string('tran_id', 32)->nullable()->index();
            $table->string('hcode', 16)->nullable();
            $table->string('hn', 32)->nullable()->index();
            $table->string('an', 32)->nullable();
            $table->date('visit_date')->nullable()->index();
            $table->string('pid', 32)->nullable()->index();
            $table->string('patient_name')->nullable();
            $table->string('fund_code', 64)->nullable();
            $table->string('claim_code', 64)->nullable();
            $table->string('tmt', 64)->nullable();
            $table->string('expense_category', 64)->nullable();
            $table->decimal('qty_requested', 14, 2)->nullable();
            $table->decimal('qty_paid', 14, 2)->nullable();
            $table->decimal('amount_paid', 14, 2)->default(0);
            $table->text('remark')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('finance_cgd_zero_fund_rows');

        Schema::table('finance_cgd_reconcile_items', function (Blueprint $table) {
            $table->dropColumn(['error_code', 'fund_codes', 'tran_id', 'remark']);
        });

        Schema::table('finance_cgd_stm_rows', function (Blueprint $table) {
            $table->dropColumn([
                'tran_id',
                'error_code',
                'fund_codes',
                'amount_billable',
                'amount_not_billable',
                'amount_self_pay',
                'remark',
            ]);
        });

        Schema::table('finance_cgd_stm_batches', function (Blueprint $table) {
            $table->dropColumn(['source_format', 'error_row_count', 'zero_fund_count']);
        });
    }
};
