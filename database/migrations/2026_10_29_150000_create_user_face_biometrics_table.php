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
        if (!Schema::connection('mysql')->hasTable('user_face_biometrics')) {
            Schema::connection('mysql')->create('user_face_biometrics', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->string('auth_mode', 32)->default('hybrid'); // 'native_passkey', 'ai_camera', 'hybrid'
                $table->string('credential_id', 512)->nullable()->index(); // Base64URL credential ID for Apple Face ID / Android
                $table->text('public_key')->nullable(); // COSE/PEM public key for WebAuthn signature verification
                $table->string('device_name', 128)->nullable(); // e.g. "Apple Face ID", "Android Biometrics", "PC Webcam"
                $table->longText('embedding_vector')->nullable(); // JSON array of float values (128-d or 512-d)
                $table->unsignedInteger('sample_count')->default(1);
                $table->decimal('similarity_baseline', 5, 4)->nullable();
                $table->string('face_image_path', 255)->nullable();
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
        Schema::connection('mysql')->dropIfExists('user_face_biometrics');
    }
};
