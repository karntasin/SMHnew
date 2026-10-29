<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('im_asset_specs')) {
            Schema::create('im_asset_specs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('asset_id')->constrained('im_assets')->cascadeOnDelete();
                $table->string('machine_guid', 100)->nullable()->index();
                $table->string('hostname', 150)->nullable();
                $table->string('brand', 100)->nullable();
                $table->string('model', 150)->nullable();
                $table->string('serial_number', 100)->nullable();
                $table->string('ip_address', 50)->nullable();
                $table->string('subnet_mask', 50)->nullable();
                $table->string('gateway', 50)->nullable();
                $table->string('mac_address', 50)->nullable()->index();
                $table->string('os_name', 150)->nullable();
                $table->string('os_build', 100)->nullable();
                $table->decimal('ram_total_gb', 8, 2)->nullable();
                $table->string('ram_slots_summary', 255)->nullable();
                $table->string('cpu_name', 200)->nullable();
                $table->json('cpu_details')->nullable();
                $table->json('memory_details')->nullable();
                $table->json('motherboard_details')->nullable();
                $table->json('disk_details')->nullable();
                $table->json('gpu_details')->nullable();
                $table->json('network_details')->nullable();
                $table->string('logged_user', 100)->nullable();
                $table->string('agent_version', 20)->default('1.0.0');
                $table->timestamp('last_seen_at')->nullable()->index();
                $table->timestamps();

                $table->unique('asset_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('im_asset_specs');
    }
};
