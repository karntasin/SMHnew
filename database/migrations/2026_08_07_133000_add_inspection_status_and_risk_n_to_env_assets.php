<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('env_assets', function (Blueprint $table) {
            if (! Schema::hasColumn('env_assets', 'inspection_status')) {
                $table->string('inspection_status', 32)->nullable()->after('risk_level');
            }
        });

        // เดิมเป็น ENUM('A','B','C') — ขยายให้มี ไม่ระบุ (N)
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE env_assets MODIFY risk_level VARCHAR(8) NOT NULL DEFAULT 'C'");
        } else {
            Schema::table('env_assets', function (Blueprint $table) {
                $table->string('risk_level', 8)->default('C')->change();
            });
        }
    }

    public function down(): void
    {
        Schema::table('env_assets', function (Blueprint $table) {
            if (Schema::hasColumn('env_assets', 'inspection_status')) {
                $table->dropColumn('inspection_status');
            }
        });

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::table('env_assets')->where('risk_level', 'N')->update(['risk_level' => 'C']);
            DB::statement("ALTER TABLE env_assets MODIFY risk_level ENUM('A','B','C') NOT NULL DEFAULT 'C'");
        }
    }
};
