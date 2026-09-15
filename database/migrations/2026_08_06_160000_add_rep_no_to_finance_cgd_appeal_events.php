<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('finance_cgd_appeal_events')) {
            return;
        }

        Schema::table('finance_cgd_appeal_events', function (Blueprint $table) {
            if (! Schema::hasColumn('finance_cgd_appeal_events', 'rep_no')) {
                $table->string('rep_no', 64)->nullable()->after('batch_id')->index();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('finance_cgd_appeal_events')) {
            return;
        }

        Schema::table('finance_cgd_appeal_events', function (Blueprint $table) {
            if (Schema::hasColumn('finance_cgd_appeal_events', 'rep_no')) {
                $table->dropColumn('rep_no');
            }
        });
    }
};
