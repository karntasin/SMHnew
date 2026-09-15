<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('finance_cgd_stm_batches') && ! Schema::hasColumn('finance_cgd_stm_batches', 'scheme')) {
            Schema::table('finance_cgd_stm_batches', function (Blueprint $table) {
                $table->string('scheme', 16)->default('cgd')->after('file_kind')->index();
            });
        }

        if (Schema::hasTable('finance_cgd_reconciliations') && ! Schema::hasColumn('finance_cgd_reconciliations', 'scheme')) {
            Schema::table('finance_cgd_reconciliations', function (Blueprint $table) {
                $table->string('scheme', 16)->default('cgd')->after('scope')->index();
            });
        }

        // จัดกลุ่มชุดเดิมจากชื่อไฟล์
        if (Schema::hasTable('finance_cgd_stm_batches') && Schema::hasColumn('finance_cgd_stm_batches', 'scheme')) {
            DB::table('finance_cgd_stm_batches')
                ->where(function ($q) {
                    $q->where('filename', 'like', '%OPLGO%')
                        ->orWhere('document_no', 'like', '%OPLGO%');
                })
                ->update(['scheme' => 'lgo']);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('finance_cgd_stm_batches') && Schema::hasColumn('finance_cgd_stm_batches', 'scheme')) {
            Schema::table('finance_cgd_stm_batches', function (Blueprint $table) {
                $table->dropColumn('scheme');
            });
        }

        if (Schema::hasTable('finance_cgd_reconciliations') && Schema::hasColumn('finance_cgd_reconciliations', 'scheme')) {
            Schema::table('finance_cgd_reconciliations', function (Blueprint $table) {
                $table->dropColumn('scheme');
            });
        }
    }
};
