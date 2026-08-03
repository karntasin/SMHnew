<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('finance_cgd_reconciliations', function (Blueprint $table) {
            $table->unsignedInteger('stm_out_of_range')->default(0)->after('only_stm');
        });
    }

    public function down(): void
    {
        Schema::table('finance_cgd_reconciliations', function (Blueprint $table) {
            $table->dropColumn('stm_out_of_range');
        });
    }
};
