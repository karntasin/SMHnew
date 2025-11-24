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
        Schema::create('quality_reviews', function (Blueprint $table) {
            $table->id();
            $table->string('topic');
            $table->string('review_type'); // Chart Review, Death Review, etc.
            $table->date('schedule_date');
            $table->string('reviewer')->nullable();
            $table->string('status')->default('Pending'); // Pending, In Progress, Completed
            $table->text('findings')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('quality_reviews');
    }
};
