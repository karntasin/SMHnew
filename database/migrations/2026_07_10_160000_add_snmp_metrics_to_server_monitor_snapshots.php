<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('server_monitor_snapshots', function (Blueprint $table) {
            $table->boolean('snmp_ok')->nullable()->after('mysql_ms');
            $table->unsignedTinyInteger('cpu_percent')->nullable()->after('snmp_ok');
            $table->unsignedTinyInteger('memory_percent')->nullable()->after('cpu_percent');
            $table->unsignedTinyInteger('disk_percent')->nullable()->after('memory_percent');
            $table->unsignedBigInteger('snmp_uptime_seconds')->nullable()->after('disk_percent');
            $table->string('snmp_sys_name', 128)->nullable()->after('snmp_uptime_seconds');
        });
    }

    public function down(): void
    {
        Schema::table('server_monitor_snapshots', function (Blueprint $table) {
            $table->dropColumn([
                'snmp_ok',
                'cpu_percent',
                'memory_percent',
                'disk_percent',
                'snmp_uptime_seconds',
                'snmp_sys_name',
            ]);
        });
    }
};
