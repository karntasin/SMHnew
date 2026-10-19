<?php

use App\Data\HrdAssessmentCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hrd_assessment_forms', function (Blueprint $table) {
            $table->id();
            $table->string('code')->nullable()->unique();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('kind', 20)->default('survey');
            $table->string('visibility', 20)->default('named');
            $table->boolean('is_system')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort')->default(0);
            $table->text('disclaimer')->nullable();
            $table->timestamps();
        });

        Schema::create('hrd_assessment_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_id')->constrained('hrd_assessment_forms')->cascadeOnDelete();
            $table->string('title');
            $table->decimal('weight', 8, 2)->default(1);
            $table->unsignedSmallInteger('sort')->default(0);
            $table->timestamps();
        });

        Schema::create('hrd_assessment_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('section_id')->constrained('hrd_assessment_sections')->cascadeOnDelete();
            $table->text('prompt');
            $table->boolean('reverse_scored')->default(false);
            $table->unsignedSmallInteger('sort')->default(0);
            $table->timestamps();
        });

        Schema::create('hrd_assessment_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_id')->constrained('hrd_assessment_forms')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedSmallInteger('fiscal_year');
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->timestamp('submitted_at');
            $table->timestamps();
            $table->unique(['form_id', 'user_id', 'fiscal_year']);
        });

        Schema::create('hrd_assessment_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_id')->constrained('hrd_assessment_forms')->cascadeOnDelete();
            $table->unsignedSmallInteger('fiscal_year');
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('total_score', 5, 2);
            $table->string('band', 20);
            $table->string('band_label');
            $table->text('interpretation')->nullable();
            $table->json('section_scores');
            $table->timestamps();
            $table->index(['form_id', 'fiscal_year']);
            $table->index(['user_id', 'fiscal_year']);
        });

        Schema::create('hrd_assessment_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('response_id')->constrained('hrd_assessment_responses')->cascadeOnDelete();
            $table->foreignId('item_id')->constrained('hrd_assessment_items')->cascadeOnDelete();
            $table->unsignedTinyInteger('value');
            $table->timestamps();
            $table->unique(['response_id', 'item_id']);
        });

        $now = now();
        foreach (HrdAssessmentCatalog::forms() as $form) {
            $formId = DB::table('hrd_assessment_forms')->insertGetId([
                'code' => $form['code'],
                'title' => $form['title'],
                'description' => $form['description'],
                'kind' => $form['kind'],
                'visibility' => $form['visibility'],
                'is_system' => true,
                'is_active' => true,
                'sort' => $form['sort'],
                'disclaimer' => $form['disclaimer'],
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            foreach ($form['sections'] as $sectionIndex => $section) {
                $sectionId = DB::table('hrd_assessment_sections')->insertGetId([
                    'form_id' => $formId,
                    'title' => $section['title'],
                    'weight' => $section['weight'],
                    'sort' => $sectionIndex,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                foreach ($section['items'] as $itemIndex => $item) {
                    DB::table('hrd_assessment_items')->insert([
                        'section_id' => $sectionId,
                        'prompt' => $item['prompt'],
                        'reverse_scored' => $item['reverse'],
                        'sort' => $itemIndex,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }
            }
        }

        DB::table('menus')->where('route', 'km.learn.assessments')->update([
            'title' => 'รวมแบบประเมิน',
            'updated_at' => $now,
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('hrd_assessment_answers');
        Schema::dropIfExists('hrd_assessment_responses');
        Schema::dropIfExists('hrd_assessment_submissions');
        Schema::dropIfExists('hrd_assessment_items');
        Schema::dropIfExists('hrd_assessment_sections');
        Schema::dropIfExists('hrd_assessment_forms');

        DB::table('menus')->where('route', 'km.learn.assessments')->update([
            'title' => 'ประเมินสมรรถนะ',
        ]);
    }
};
