<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('finance_cgd_reconcile_items', function (Blueprint $table) {
            if (! Schema::hasColumn('finance_cgd_reconcile_items', 'visit_at')) {
                $table->dateTime('visit_at')->nullable()->after('visit_date');
            }
        });
    }

    public function down(): void
    {
        Schema::table('finance_cgd_reconcile_items', function (Blueprint $table) {
            if (Schema::hasColumn('finance_cgd_reconcile_items', 'visit_at')) {
                $table->dropColumn('visit_at');
            }
        });
    }
};
