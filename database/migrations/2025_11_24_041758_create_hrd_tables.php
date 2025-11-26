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
        // Courses Table
        Schema::create('hrd_courses', function (Blueprint $table) {
            $table->id();
            $table->string('code')->nullable();
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('type', ['internal', 'external', 'online', 'ojt', 'conference'])->default('internal');
            $table->dateTime('start_date')->nullable();
            $table->dateTime('end_date')->nullable();
            $table->string('location')->nullable();
            $table->decimal('hours', 8, 2)->default(0);
            $table->integer('capacity')->nullable();
            $table->string('instructor')->nullable();
            $table->decimal('cost', 10, 2)->default(0);
            $table->foreignId('created_by')->constrained('users');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // Competencies Table (Skills)
        Schema::create('hrd_competencies', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('type', ['core', 'functional', 'managerial'])->default('functional');
            $table->timestamps();
        });

        // Course Competencies (Many-to-Many)
        Schema::create('hrd_course_competencies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('hrd_courses')->onDelete('cascade');
            $table->foreignId('competency_id')->constrained('hrd_competencies')->onDelete('cascade');
            $table->integer('score_weight')->default(1); // Points gained for this skill
            $table->timestamps();
        });

        // Enrollments Table
        Schema::create('hrd_enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('course_id')->constrained('hrd_courses')->onDelete('cascade');
            $table->enum('status', ['registered', 'approved', 'attended', 'completed', 'failed', 'cancelled'])->default('registered');
            $table->decimal('pre_test_score', 5, 2)->nullable();
            $table->decimal('post_test_score', 5, 2)->nullable();
            $table->decimal('satisfaction_score', 5, 2)->nullable(); // 1-5
            $table->string('certificate_path')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->unique(['user_id', 'course_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hrd_enrollments');
        Schema::dropIfExists('hrd_course_competencies');
        Schema::dropIfExists('hrd_competencies');
        Schema::dropIfExists('hrd_courses');
    }
};
