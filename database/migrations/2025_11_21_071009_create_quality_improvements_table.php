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
        Schema::create('quality_improvements', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('type'); // CQI, AAR
            $table->text('description')->nullable();
            $table->string('status')->default('Proposed'); // Proposed, In Progress, Completed, Monitoring
            $table->integer('progress_percentage')->default(0);
            $table->text('action_plan')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('quality_improvements');
    }
};
