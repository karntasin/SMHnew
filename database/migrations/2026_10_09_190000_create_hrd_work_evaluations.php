<?php

use App\Data\HrdWorkEvaluationCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hrd_work_topics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('hrd_work_topics')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->boolean('is_group')->default(false);
            $table->unsignedTinyInteger('max_score')->default(5);
            $table->decimal('weight', 8, 2)->default(1);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('hrd_work_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('staff_name');
            $table->foreignId('evaluator_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('evaluator_name')->nullable();
            $table->unsignedTinyInteger('period_months');
            $table->date('period_start');
            $table->date('period_end');
            $table->date('evaluated_at');
            $table->date('next_due_at')->nullable();
            $table->decimal('total_score', 8, 2)->default(0);
            $table->decimal('max_total_score', 8, 2)->default(0);
            $table->decimal('percent_score', 5, 2)->default(0);
            $table->text('overall_comment')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'evaluated_at']);
        });

        Schema::create('hrd_work_evaluation_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evaluation_id')->constrained('hrd_work_evaluations')->cascadeOnDelete();
            $table->foreignId('topic_id')->nullable()->constrained('hrd_work_topics')->nullOnDelete();
            $table->string('topic_title');
            $table->unsignedTinyInteger('max_score')->default(5);
            $table->decimal('weight', 8, 2)->default(1);
            $table->decimal('score', 8, 2);
            $table->string('note')->nullable();
            $table->timestamps();
        });

        $now = now();
        $sort = 0;
        foreach (HrdWorkEvaluationCatalog::tree() as $group) {
            $groupId = DB::table('hrd_work_topics')->insertGetId([
                'title' => $group['title'],
                'description' => $group['description'],
                'is_group' => true,
                'max_score' => 0,
                'weight' => 1,
                'sort_order' => $sort,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $sort++;
            foreach ($group['items'] as $itemIndex => $item) {
                DB::table('hrd_work_topics')->insert([
                    'parent_id' => $groupId,
                    'title' => $item['title'],
                    'description' => $item['description'],
                    'is_group' => false,
                    'max_score' => 5,
                    'weight' => 1,
                    'sort_order' => $itemIndex,
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('hrd_work_evaluation_scores');
        Schema::dropIfExists('hrd_work_evaluations');
        Schema::dropIfExists('hrd_work_topics');
    }
};
