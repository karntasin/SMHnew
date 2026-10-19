<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('quality_indicator_entries')) {
            return;
        }

        Schema::table('quality_indicator_entries', function (Blueprint $table) {
            if (! Schema::hasColumn('quality_indicator_entries', 'is_na')) {
                $table->boolean('is_na')->default(false)->after('result_value');
            }
        });

        Schema::table('quality_indicator_entries', function (Blueprint $table) {
            $table->decimal('result_value', 15, 4)->nullable()->change();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('quality_indicator_entries')) {
            return;
        }

        Schema::table('quality_indicator_entries', function (Blueprint $table) {
            $table->decimal('result_value', 15, 4)->nullable(false)->change();
        });

        Schema::table('quality_indicator_entries', function (Blueprint $table) {
            if (Schema::hasColumn('quality_indicator_entries', 'is_na')) {
                $table->dropColumn('is_na');
            }
        });
    }
};
