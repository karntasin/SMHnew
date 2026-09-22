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
        Schema::create('km_interactive_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('track', 20); // 'sql' or 'excel'
            $table->json('completed_lessons')->nullable(); // Array of completed lesson IDs
            $table->unsignedInteger('current_lesson_id')->default(1);
            $table->timestamps();

            $table->unique(['user_id', 'track']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('km_interactive_progress');
    }
};
