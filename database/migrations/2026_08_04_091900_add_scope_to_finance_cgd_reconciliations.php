<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('finance_cgd_reconciliations', function (Blueprint $table) {
            $table->string('scope', 16)->default('batch')->after('batch_id')->index();
        });

        Schema::table('finance_cgd_reconciliations', function (Blueprint $table) {
            $table->dropForeign(['batch_id']);
        });

        DB::statement('ALTER TABLE finance_cgd_reconciliations MODIFY batch_id BIGINT UNSIGNED NULL');

        Schema::table('finance_cgd_reconciliations', function (Blueprint $table) {
            $table->foreign('batch_id')
                ->references('id')
                ->on('finance_cgd_stm_batches')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        DB::table('finance_cgd_reconciliations')
            ->where(function ($q) {
                $q->whereNull('batch_id')->orWhere('scope', 'all');
            })
            ->delete();

        Schema::table('finance_cgd_reconciliations', function (Blueprint $table) {
            $table->dropForeign(['batch_id']);
        });

        DB::statement('ALTER TABLE finance_cgd_reconciliations MODIFY batch_id BIGINT UNSIGNED NOT NULL');

        Schema::table('finance_cgd_reconciliations', function (Blueprint $table) {
            $table->foreign('batch_id')
                ->references('id')
                ->on('finance_cgd_stm_batches')
                ->cascadeOnDelete();
            $table->dropColumn('scope');
        });
    }
};
