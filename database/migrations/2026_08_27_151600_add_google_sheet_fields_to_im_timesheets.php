<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('im_timesheets', function (Blueprint $table) {
            $table->string('source', 32)->default('manual')->after('note')->index();
            $table->string('external_id', 80)->nullable()->after('source');
            $table->string('sheet_tab', 64)->nullable()->after('external_id');
            $table->string('start_time', 8)->nullable()->after('sheet_tab');
            $table->string('end_time', 8)->nullable()->after('start_time');
            $table->unique(['source', 'external_id'], 'im_timesheets_source_external_unique');
        });
    }

    public function down(): void
    {
        Schema::table('im_timesheets', function (Blueprint $table) {
            $table->dropUnique('im_timesheets_source_external_unique');
            $table->dropColumn(['source', 'external_id', 'sheet_tab', 'start_time', 'end_time']);
        });
    }
};
