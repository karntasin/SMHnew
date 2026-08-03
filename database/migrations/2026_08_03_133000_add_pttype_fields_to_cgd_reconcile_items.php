<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('finance_cgd_reconcile_items', function (Blueprint $table) {
            $table->string('pttype_code', 32)->nullable()->after('pttype');
            $table->string('hipdata_code', 32)->nullable()->after('pttype_code');
        });
    }

    public function down(): void
    {
        Schema::table('finance_cgd_reconcile_items', function (Blueprint $table) {
            $table->dropColumn(['pttype_code', 'hipdata_code']);
        });
    }
};
