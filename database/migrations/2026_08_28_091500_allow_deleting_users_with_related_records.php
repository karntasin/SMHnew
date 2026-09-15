<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        $rows = DB::select(<<<'SQL'
            SELECT rc.TABLE_NAME, rc.CONSTRAINT_NAME, rc.DELETE_RULE, kcu.COLUMN_NAME, c.IS_NULLABLE
            FROM information_schema.REFERENTIAL_CONSTRAINTS rc
            JOIN information_schema.KEY_COLUMN_USAGE kcu
              ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
             AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
             AND rc.TABLE_NAME = kcu.TABLE_NAME
            JOIN information_schema.COLUMNS c
              ON c.TABLE_SCHEMA = rc.CONSTRAINT_SCHEMA
             AND c.TABLE_NAME = kcu.TABLE_NAME
             AND c.COLUMN_NAME = kcu.COLUMN_NAME
            WHERE rc.CONSTRAINT_SCHEMA = DATABASE()
              AND kcu.REFERENCED_TABLE_NAME = 'users'
              AND kcu.REFERENCED_COLUMN_NAME = 'id'
              AND rc.DELETE_RULE IN ('RESTRICT', 'NO ACTION')
            SQL);

        foreach ($rows as $row) {
            Schema::table($row->TABLE_NAME, function (Blueprint $table) use ($row) {
                $table->dropForeign($row->CONSTRAINT_NAME);
            });

            if ($row->IS_NULLABLE === 'NO') {
                Schema::table($row->TABLE_NAME, function (Blueprint $table) use ($row) {
                    $table->unsignedBigInteger($row->COLUMN_NAME)->nullable()->change();
                });
            }

            Schema::table($row->TABLE_NAME, function (Blueprint $table) use ($row) {
                $table->foreign($row->COLUMN_NAME, $row->CONSTRAINT_NAME)
                    ->references('id')
                    ->on('users')
                    ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        // Keep SET NULL — restoring RESTRICT would block user deletion again.
    }
};
