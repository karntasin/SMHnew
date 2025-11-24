<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('env_incidents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reporter_id')->constrained('users');
            $table->string('incident_type'); // e.g., Electricity, Water, Equipment
            $table->string('location');
            $table->enum('severity', ['low', 'medium', 'high', 'critical']);
            $table->text('description');
            $table->enum('status', ['reported', 'accepted', 'in_progress', 'resolved', 'closed'])->default('reported');
            $table->foreignId('assigned_to')->nullable()->constrained('users');
            $table->text('action_taken')->nullable();
            $table->dateTime('start_time')->nullable();
            $table->dateTime('end_time')->nullable();
            $table->text('resolution_notes')->nullable();
            $table->integer('satisfaction_rating')->nullable(); // 1-5
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('env_incidents');
    }
};
