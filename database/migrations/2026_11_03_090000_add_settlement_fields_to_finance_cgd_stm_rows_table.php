<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('finance_cgd_stm_rows', function (Blueprint $table) {
            if (! Schema::hasColumn('finance_cgd_stm_rows', 'is_settled')) {
                $table->boolean('is_settled')->default(false)->index()->after('error_code');
            }
            if (! Schema::hasColumn('finance_cgd_stm_rows', 'settling_row_id')) {
                $table->unsignedBigInteger('settling_row_id')->nullable()->index()->after('is_settled');
            }
            if (! Schema::hasColumn('finance_cgd_stm_rows', 'settling_rep_no')) {
                $table->string('settling_rep_no', 50)->nullable()->index()->after('settling_row_id');
            }
            if (! Schema::hasColumn('finance_cgd_stm_rows', 'settled_at')) {
                $table->timestamp('settled_at')->nullable()->after('settling_rep_no');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('finance_cgd_stm_rows', function (Blueprint $table) {
            $table->dropColumn(['is_settled', 'settling_row_id', 'settling_rep_no', 'settled_at']);
        });
    }
};
