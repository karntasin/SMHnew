<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('finance_cgd_reconciliations', function (Blueprint $table) {
            $table->foreignId('stm_import_id')
                ->nullable()
                ->after('batch_id')
                ->constrained('finance_stm_imports')
                ->nullOnDelete();
            $table->string('claim_submission_no')->nullable()->after('stm_import_id')->index();
        });

        Schema::table('finance_cgd_reconcile_items', function (Blueprint $table) {
            $table->foreignId('stm_import_id')
                ->nullable()
                ->after('reconciliation_id')
                ->constrained('finance_stm_imports')
                ->nullOnDelete();
            $table->string('claim_submission_no')->nullable()->after('stm_import_id')->index();
        });
    }

    public function down(): void
    {
        Schema::table('finance_cgd_reconcile_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('stm_import_id');
            $table->dropColumn('claim_submission_no');
        });

        Schema::table('finance_cgd_reconciliations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('stm_import_id');
            $table->dropColumn('claim_submission_no');
        });
    }
};
