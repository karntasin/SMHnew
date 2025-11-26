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
        Schema::table('settingapp', function (Blueprint $table) {
            $table->boolean('backup_hosxp')->default(false)->after('backup_path');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('settingapp', function (Blueprint $table) {
            $table->dropColumn('backup_hosxp');
        });
    }
};
