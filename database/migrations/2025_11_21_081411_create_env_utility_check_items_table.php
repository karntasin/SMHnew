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
        Schema::create('env_utility_check_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('check_id')->constrained('env_utility_checks')->onDelete('cascade');
            $table->foreignId('checklist_id')->constrained('env_utility_checklists');
            $table->enum('status', ['pass', 'fail']);
            $table->decimal('value', 10, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('env_utility_check_items');
    }
};
