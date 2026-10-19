<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('quality_indicators', 'series')) {
            Schema::table('quality_indicators', function (Blueprint $table) {
                $table->json('series')->nullable()->after('formula_description');
            });
        }

        if (! Schema::hasColumn('quality_indicator_entries', 'series_key')) {
            Schema::table('quality_indicator_entries', function (Blueprint $table) {
                $table->string('series_key', 40)->default('')->after('quality_indicator_id');
            });
        }

        Schema::table('quality_indicator_entries', function (Blueprint $table) {
            $table->index('quality_indicator_id', 'quality_indicator_entries_indicator_id_index');
        });

        Schema::table('quality_indicator_entries', function (Blueprint $table) {
            $table->dropUnique('qi_entries_unique');
            $table->unique(['quality_indicator_id', 'period_date', 'series_key'], 'qi_entries_unique');
        });
    }

    public function down(): void
    {
        Schema::table('quality_indicator_entries', function (Blueprint $table) {
            $table->dropUnique('qi_entries_unique');
            $table->dropIndex('quality_indicator_entries_indicator_id_index');
            $table->dropColumn('series_key');
            $table->unique(['quality_indicator_id', 'period_date'], 'qi_entries_unique');
        });

        Schema::table('quality_indicators', function (Blueprint $table) {
            $table->dropColumn('series');
        });
    }
};
