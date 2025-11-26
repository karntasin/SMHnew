<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Update hrd_courses table
        Schema::table('hrd_courses', function (Blueprint $table) {
            $table->string('cover_image')->nullable()->after('description');
            $table->boolean('is_mandatory')->default(false)->after('type');
            $table->integer('expiration_days')->nullable()->comment('Days until certification expires')->after('is_mandatory');
            $table->enum('status', ['draft', 'published', 'archived'])->default('draft')->after('is_active');
            $table->boolean('allow_guest')->default(false)->after('status');
        });

        // 2. Course Categories
        Schema::create('hrd_course_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->timestamps();
        });

        Schema::table('hrd_courses', function (Blueprint $table) {
            $table->foreignId('category_id')->nullable()->constrained('hrd_course_categories')->nullOnDelete()->after('id');
        });

        // 3. Modules (Sections of a course)
        Schema::create('hrd_modules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('hrd_courses')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->integer('order')->default(0);
            $table->timestamps();
        });

        // 4. Lessons (Content within a module)
        Schema::create('hrd_lessons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('module_id')->constrained('hrd_modules')->cascadeOnDelete();
            $table->string('title');
            $table->enum('type', ['video', 'text', 'quiz', 'file', 'embed']);
            $table->longText('content')->nullable(); // For text content or HTML
            $table->string('video_url')->nullable(); // For YouTube/Vimeo embed
            $table->string('file_path')->nullable(); // For PDF/Doc uploads
            $table->integer('duration_minutes')->default(0);
            $table->integer('order')->default(0);
            $table->timestamps();
        });

        // 5. Quizzes
        Schema::create('hrd_quizzes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('hrd_courses')->cascadeOnDelete();
            $table->foreignId('lesson_id')->nullable()->constrained('hrd_lessons')->cascadeOnDelete(); // If it's a quiz lesson
            $table->string('title');
            $table->text('description')->nullable();
            $table->integer('passing_score')->default(80); // Percentage
            $table->integer('time_limit_minutes')->nullable();
            $table->boolean('randomize_questions')->default(false);
            $table->timestamps();
        });

        // 6. Questions
        Schema::create('hrd_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quiz_id')->constrained('hrd_quizzes')->cascadeOnDelete();
            $table->text('question_text');
            $table->enum('type', ['multiple_choice', 'true_false', 'matching', 'fill_blank']);
            $table->integer('points')->default(1);
            $table->integer('order')->default(0);
            $table->timestamps();
        });

        // 7. Answers
        Schema::create('hrd_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('question_id')->constrained('hrd_questions')->cascadeOnDelete();
            $table->text('answer_text');
            $table->boolean('is_correct')->default(false);
            $table->integer('order')->default(0);
            $table->timestamps();
        });

        // 8. Course Assignments (For Mandatory Training)
        Schema::create('hrd_course_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('hrd_courses')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->foreignId('department_id')->nullable()->constrained('departments')->cascadeOnDelete(); // Assign to whole dept
            $table->foreignId('assigned_by')->constrained('users');
            $table->date('due_date')->nullable();
            $table->enum('status', ['assigned', 'in_progress', 'completed', 'overdue'])->default('assigned');
            $table->timestamps();
        });

        // 9. Learning Progress
        Schema::create('hrd_learning_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('course_id')->constrained('hrd_courses')->cascadeOnDelete();
            $table->foreignId('lesson_id')->constrained('hrd_lessons')->cascadeOnDelete();
            $table->enum('status', ['started', 'completed'])->default('started');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });

        // 10. Quiz Attempts
        Schema::create('hrd_quiz_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('quiz_id')->constrained('hrd_quizzes')->cascadeOnDelete();
            $table->integer('score');
            $table->integer('total_questions');
            $table->boolean('passed');
            $table->timestamp('started_at');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hrd_quiz_attempts');
        Schema::dropIfExists('hrd_learning_progress');
        Schema::dropIfExists('hrd_course_assignments');
        Schema::dropIfExists('hrd_answers');
        Schema::dropIfExists('hrd_questions');
        Schema::dropIfExists('hrd_quizzes');
        Schema::dropIfExists('hrd_lessons');
        Schema::dropIfExists('hrd_modules');
        
        Schema::table('hrd_courses', function (Blueprint $table) {
            $table->dropForeign(['category_id']);
            $table->dropColumn(['cover_image', 'is_mandatory', 'expiration_days', 'status', 'allow_guest', 'category_id']);
        });
        
        Schema::dropIfExists('hrd_course_categories');
    }
};
