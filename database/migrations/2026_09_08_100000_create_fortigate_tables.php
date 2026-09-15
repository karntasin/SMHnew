<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fortigate_resource_snapshots', function (Blueprint $table) {
            $table->id();
            $table->unsignedTinyInteger('cpu_percent')->nullable();
            $table->unsignedTinyInteger('memory_percent')->nullable();
            $table->unsignedTinyInteger('disk_percent')->nullable();
            $table->unsignedInteger('session_count')->nullable();
            $table->unsignedInteger('session6_count')->nullable();
            $table->unsignedInteger('setup_rate')->nullable();
            $table->string('hostname', 120)->nullable();
            $table->string('model', 80)->nullable();
            $table->string('version', 40)->nullable();
            $table->string('serial', 64)->nullable();
            $table->string('health', 20)->default('unknown');
            $table->json('raw_meta')->nullable();
            $table->timestamp('checked_at');
            $table->timestamps();

            $table->index('checked_at');
            $table->index(['health', 'checked_at']);
        });

        Schema::create('fortigate_interface_snapshots', function (Blueprint $table) {
            $table->id();
            $table->string('interface_name', 64);
            $table->string('alias', 120)->nullable();
            $table->string('ip', 64)->nullable();
            $table->boolean('link')->default(false);
            $table->decimal('speed_mbps', 12, 2)->nullable();
            $table->unsignedBigInteger('rx_bytes')->default(0);
            $table->unsignedBigInteger('tx_bytes')->default(0);
            $table->unsignedBigInteger('rx_packets')->default(0);
            $table->unsignedBigInteger('tx_packets')->default(0);
            $table->unsignedBigInteger('rx_bps')->nullable();
            $table->unsignedBigInteger('tx_bps')->nullable();
            $table->timestamp('checked_at');
            $table->timestamps();

            $table->index(['interface_name', 'checked_at']);
            $table->index('checked_at');
        });

        Schema::create('fortigate_security_logs', function (Blueprint $table) {
            $table->id();
            $table->string('log_type', 40);
            $table->string('dedupe_key', 64)->unique();
            $table->unsignedBigInteger('eventtime')->nullable();
            $table->date('log_date')->nullable();
            $table->string('log_time', 16)->nullable();
            $table->timestamp('logged_at')->nullable();
            $table->string('level', 40)->nullable();
            $table->string('action', 64)->nullable();
            $table->string('subtype', 64)->nullable();
            $table->string('eventtype', 64)->nullable();
            $table->string('srcip', 64)->nullable();
            $table->string('dstip', 64)->nullable();
            $table->string('service', 64)->nullable();
            $table->string('hostname', 255)->nullable();
            $table->text('url')->nullable();
            $table->string('app', 120)->nullable();
            $table->string('appcat', 120)->nullable();
            $table->string('virus', 160)->nullable();
            $table->string('attack', 160)->nullable();
            $table->string('catdesc', 160)->nullable();
            $table->text('msg')->nullable();
            $table->boolean('is_denied_web')->default(false);
            $table->boolean('is_watch_web')->default(false);
            $table->boolean('is_threat')->default(false);
            $table->boolean('alerted')->default(false);
            $table->json('payload')->nullable();
            $table->timestamps();

            $table->index(['log_type', 'logged_at']);
            $table->index(['is_denied_web', 'logged_at']);
            $table->index(['is_threat', 'logged_at']);
            $table->index('logged_at');
            $table->index('srcip');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fortigate_security_logs');
        Schema::dropIfExists('fortigate_interface_snapshots');
        Schema::dropIfExists('fortigate_resource_snapshots');
    }
};
