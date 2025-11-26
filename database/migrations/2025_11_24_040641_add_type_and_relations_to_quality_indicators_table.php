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
        Schema::table('quality_indicators', function (Blueprint $table) {
            $table->string('type')->default('department')->after('id'); // 'department' or 'ha_team'
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete()->after('type');
            $table->foreignId('team_id')->nullable()->constrained('teamha')->nullOnDelete()->after('department_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('quality_indicators', function (Blueprint $table) {
            $table->dropForeign(['department_id']);
            $table->dropForeign(['team_id']);
            $table->dropColumn(['type', 'department_id', 'team_id']);
        });
    }
};
