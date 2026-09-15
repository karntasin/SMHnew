<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('im_evaluation_topics', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->unsignedTinyInteger('max_score')->default(5);
            $table->decimal('weight', 5, 2)->default(1);
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('im_staff_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('staff_name');
            $table->foreignId('evaluator_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('evaluator_name')->nullable();
            $table->unsignedTinyInteger('period_months'); // 3, 6, 12
            $table->date('period_start');
            $table->date('period_end');
            $table->date('evaluated_at')->nullable();
            $table->date('next_due_at')->nullable();
            $table->decimal('total_score', 8, 2)->nullable();
            $table->decimal('max_total_score', 8, 2)->nullable();
            $table->decimal('percent_score', 5, 2)->nullable();
            $table->text('overall_comment')->nullable();
            $table->string('status', 20)->default('completed'); // draft|completed
            $table->timestamps();

            $table->index(['period_months', 'period_start']);
            $table->index(['user_id', 'evaluated_at']);
        });

        Schema::create('im_staff_evaluation_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evaluation_id')->constrained('im_staff_evaluations')->cascadeOnDelete();
            $table->foreignId('topic_id')->nullable()->constrained('im_evaluation_topics')->nullOnDelete();
            $table->string('topic_title');
            $table->unsignedTinyInteger('max_score')->default(5);
            $table->decimal('weight', 5, 2)->default(1);
            $table->decimal('score', 5, 2);
            $table->string('note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('im_staff_evaluation_scores');
        Schema::dropIfExists('im_staff_evaluations');
        Schema::dropIfExists('im_evaluation_topics');
    }
};
