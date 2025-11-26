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
        // Categories for Documents and Posts
        Schema::create('km_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type')->default('document'); // document, post
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->timestamps();
        });

        // Documents (Policy, SOP, CPG, etc.)
        Schema::create('km_documents', function (Blueprint $table) {
            $table->id();
            $table->string('document_number')->nullable();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('file_path');
            $table->string('version')->default('1.0');
            $table->boolean('is_current')->default(true);
            $table->date('effective_date')->nullable();
            $table->foreignId('category_id')->constrained('km_categories')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade'); // Uploader
            $table->unsignedBigInteger('group_id')->nullable(); // To link versions of the same document
            $table->timestamps();
        });

        // Posts (Best Practice, Lesson Learned, Forum, Q&A)
        Schema::create('km_posts', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->longText('content')->nullable(); // Can store JSON for forms
            $table->string('type'); // best_practice, lesson_learned, forum_topic, question
            $table->foreignId('category_id')->nullable()->constrained('km_categories')->onDelete('set null');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->integer('views')->default(0);
            $table->timestamps();
        });

        // Comments/Answers
        Schema::create('km_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained('km_posts')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->text('content');
            $table->unsignedBigInteger('parent_id')->nullable(); // For nested comments
            $table->timestamps();
        });

        // Read Receipts (Who read what)
        Schema::create('km_read_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained('km_documents')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->timestamp('read_at')->useCurrent();
            $table->timestamps();
        });

        // Ratings/Feedback
        Schema::create('km_ratings', function (Blueprint $table) {
            $table->id();
            $table->morphs('rateable'); // document or post
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->integer('rating')->nullable(); // 1-5
            $table->text('comment')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('km_ratings');
        Schema::dropIfExists('km_read_receipts');
        Schema::dropIfExists('km_comments');
        Schema::dropIfExists('km_posts');
        Schema::dropIfExists('km_documents');
        Schema::dropIfExists('km_categories');
    }
};
