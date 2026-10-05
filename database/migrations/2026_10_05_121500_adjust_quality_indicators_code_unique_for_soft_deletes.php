<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quality_indicators', function (Blueprint $table) {
            $table->dropUnique(['code']);
        });

        // MySQL: unique on generated column allows multiple NULLs (trashed rows),
        // while keeping active codes unique.
        DB::statement('ALTER TABLE quality_indicators ADD COLUMN code_unique_active VARCHAR(255) GENERATED ALWAYS AS (IF(deleted_at IS NULL, code, NULL)) STORED');
        DB::statement('CREATE UNIQUE INDEX quality_indicators_code_unique_active ON quality_indicators (code_unique_active)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX quality_indicators_code_unique_active ON quality_indicators');
        DB::statement('ALTER TABLE quality_indicators DROP COLUMN code_unique_active');

        Schema::table('quality_indicators', function (Blueprint $table) {
            $table->unique('code');
        });
    }
};
