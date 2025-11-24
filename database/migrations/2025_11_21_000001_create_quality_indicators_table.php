<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quality_indicators', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique()->nullable(); // e.g., QI-001
            $table->string('name'); // e.g., Hospital Infection Rate
            $table->text('description')->nullable();
            $table->string('category')->nullable(); // e.g., Clinical, Administrative, HA-I-1
            $table->string('unit')->default('%'); // %, per 1000, minutes, etc.
            $table->decimal('target_value', 10, 2)->nullable();
            $table->string('target_operator')->default('<'); // <, >, <=, >=, =
            $table->string('frequency')->default('Monthly'); // Monthly, Quarterly, Yearly
            $table->text('formula_description')->nullable(); // Human readable formula
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('quality_indicator_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quality_indicator_id')->constrained()->onDelete('cascade');
            $table->date('period_date'); // Represents the month/period
            $table->decimal('numerator', 15, 4)->nullable(); // ตัวตั้ง
            $table->decimal('denominator', 15, 4)->nullable(); // ตัวหาร
            $table->decimal('result_value', 15, 4); // Calculated result
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
            
            $table->unique(['quality_indicator_id', 'period_date'], 'qi_entries_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quality_indicator_entries');
        Schema::dropIfExists('quality_indicators');
    }
};
