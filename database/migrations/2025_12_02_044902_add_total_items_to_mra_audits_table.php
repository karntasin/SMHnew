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
        Schema::table('mra_audits', function (Blueprint $table) {
            // เพิ่มคอลัมน์สำหรับนับจำนวน items
            if (!Schema::hasColumn('mra_audits', 'total_items')) {
                $table->integer('total_items')->default(0)->after('accuracy_percentage');
            }
            if (!Schema::hasColumn('mra_audits', 'correct_items')) {
                $table->integer('correct_items')->default(0)->after('total_items');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('mra_audits', function (Blueprint $table) {
            $table->dropColumn(['total_items', 'correct_items']);
        });
    }
};
