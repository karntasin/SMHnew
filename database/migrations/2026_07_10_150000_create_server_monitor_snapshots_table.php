<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('server_monitor_snapshots', function (Blueprint $table) {
            $table->id();
            $table->string('server_key', 40);
            $table->string('host', 64);
            $table->string('status', 20); // online, degraded, offline
            $table->boolean('ping_ok')->default(false);
            $table->unsignedInteger('ping_ms')->nullable();
            $table->boolean('mysql_ok')->nullable();
            $table->unsignedInteger('mysql_ms')->nullable();
            $table->json('ports')->nullable();
            $table->text('message')->nullable();
            $table->timestamp('checked_at');
            $table->timestamps();

            $table->index(['server_key', 'checked_at']);
            $table->index('checked_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('server_monitor_snapshots');
    }
};
