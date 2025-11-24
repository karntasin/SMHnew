<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('env_assets', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('model')->nullable();
            $table->string('serial_number')->nullable();
            $table->decimal('price', 10, 2)->nullable();
            $table->string('location')->nullable();
            $table->string('owner')->nullable(); // Responsible person/department
            $table->enum('risk_level', ['A', 'B', 'C'])->default('C'); // A=High, B=Medium, C=Low
            $table->enum('status', ['Active', 'Inactive', 'Maintenance', 'Retired'])->default('Active');
            $table->date('purchase_date')->nullable();
            $table->date('warranty_expiry')->nullable();
            $table->timestamps();
        });

        Schema::create('env_pm_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained('env_assets')->onDelete('cascade');
            $table->enum('frequency_type', ['month', 'year'])->default('month');
            $table->integer('frequency_value')->default(12); // e.g., every 12 months
            $table->date('last_pm_date')->nullable();
            $table->date('next_pm_date')->nullable();
            $table->json('checklist_template')->nullable(); // Array of checklist items
            $table->timestamps();
        });

        Schema::create('env_pm_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained('env_assets')->onDelete('cascade');
            $table->foreignId('schedule_id')->nullable()->constrained('env_pm_schedules')->onDelete('set null');
            $table->string('performed_by');
            $table->enum('result', ['Pass', 'Fail'])->default('Pass');
            $table->text('findings')->nullable();
            $table->json('data_values')->nullable(); // Store checklist results/values
            $table->timestamp('performed_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('env_pm_records');
        Schema::dropIfExists('env_pm_schedules');
        Schema::dropIfExists('env_assets');
    }
};
