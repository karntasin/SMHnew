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
        Schema::create('env_utility_checklists', function (Blueprint $table) {
            $table->id();
            $table->foreignId('system_id')->constrained('env_utility_systems')->onDelete('cascade');
            $table->string('item_name');
            $table->enum('frequency', ['daily', 'weekly', 'monthly'])->default('daily');
            $table->decimal('min_value', 10, 2)->nullable();
            $table->decimal('max_value', 10, 2)->nullable();
            $table->string('unit')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('env_utility_checklists');
    }
};
