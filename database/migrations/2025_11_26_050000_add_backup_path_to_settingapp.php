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
            $table->string('backup_path')->nullable()->after('seo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('settingapp', function (Blueprint $table) {
            $table->dropColumn('backup_path');
        });
    }
};
