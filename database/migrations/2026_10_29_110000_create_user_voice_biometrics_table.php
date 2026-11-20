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
        if (!Schema::connection('mysql')->hasTable('user_voice_biometrics')) {
            Schema::connection('mysql')->create('user_voice_biometrics', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->longText('embedding_vector'); // JSON array of float values (e.g. 192 or 256 dimensions)
                $table->unsignedInteger('sample_count')->default(3);
                $table->decimal('similarity_baseline', 5, 4)->nullable(); // Baseline self-similarity during enrollment
                $table->boolean('is_active')->default(true);
                $table->timestamp('last_authenticated_at')->nullable();
                $table->timestamps();

                $table->index(['user_id', 'is_active']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::connection('mysql')->dropIfExists('user_voice_biometrics');
    }
};
