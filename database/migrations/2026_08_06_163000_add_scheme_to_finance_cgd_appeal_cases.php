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
            return;
        }

        if (! Schema::hasColumn('finance_cgd_appeal_cases', 'scheme')) {
            Schema::table('finance_cgd_appeal_cases', function (Blueprint $table) {
                $table->string('scheme', 16)->default('cgd')->after('id')->index();
            });
        }

        if (Schema::hasTable('finance_cgd_stm_batches')) {
            DB::statement('
                UPDATE finance_cgd_appeal_cases c
                INNER JOIN finance_cgd_stm_batches b ON b.id = c.latest_appeal_batch_id
                SET c.scheme = b.scheme
                WHERE c.latest_appeal_batch_id IS NOT NULL
                  AND b.scheme IS NOT NULL
                  AND b.scheme != ""
            ');

            DB::statement('
                UPDATE finance_cgd_appeal_cases c
                INNER JOIN finance_cgd_stm_batches b ON b.id = c.original_batch_id
                SET c.scheme = b.scheme
                WHERE c.original_batch_id IS NOT NULL
                  AND b.scheme IS NOT NULL
                  AND b.scheme != ""
                  AND (c.latest_appeal_batch_id IS NULL OR c.scheme = "cgd")
            ');
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('finance_cgd_appeal_cases')) {
            return;
        }

        if (Schema::hasColumn('finance_cgd_appeal_cases', 'scheme')) {
            Schema::table('finance_cgd_appeal_cases', function (Blueprint $table) {
                $table->dropColumn('scheme');
            });
        }
    }
};
