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
        if (Schema::hasTable('mra_audits') && !Schema::hasColumn('mra_audits', 'audit_target')) {
            Schema::table('mra_audits', function (Blueprint $table) {
                $table->enum('audit_target', ['internal', 'rta'])->default('internal')->after('audit_type')->index();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('mra_audits') && Schema::hasColumn('mra_audits', 'audit_target')) {
            Schema::table('mra_audits', function (Blueprint $table) {
                $table->dropColumn('audit_target');
            });
        }
    }
};
