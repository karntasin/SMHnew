<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hrd_enrollments', function (Blueprint $table) {
            $table->timestamp('completed_at')->nullable()->after('status');
            $table->date('expires_at')->nullable()->after('completed_at');
        });

        Schema::table('hrd_courses', function (Blueprint $table) {
            $table->boolean('track_behavior')->default(false)->after('expiration_days');
        });

        Schema::table('hrd_quizzes', function (Blueprint $table) {
            $table->string('purpose', 20)->default('lesson')->after('title');
        });

        Schema::table('hrd_quiz_attempts', function (Blueprint $table) {
            $table->decimal('percentage', 5, 2)->nullable()->after('score');
            $table->json('answers')->nullable()->after('passed');
        });

        Schema::table('hrd_course_assignments', function (Blueprint $table) {
            $table->foreignId('position_id')->nullable()->after('department_id')->constrained('positions')->nullOnDelete();
        });

        Schema::create('hrd_satisfaction_questions', function (Blueprint $table) {
            $table->id();
            $table->string('question_text');
            $table->unsignedInteger('sort')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('hrd_satisfaction_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('enrollment_id')->constrained('hrd_enrollments')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('course_id')->constrained('hrd_courses')->cascadeOnDelete();
            $table->json('answers');
            $table->decimal('score', 5, 2);
            $table->timestamps();
            $table->unique(['user_id', 'course_id']);
        });

        Schema::create('hrd_behavior_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('enrollment_id')->constrained('hrd_enrollments')->cascadeOnDelete();
            $table->foreignId('reviewer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('due_on');
            $table->unsignedTinyInteger('rating')->nullable();
            $table->text('comment')->nullable();
            $table->string('status', 20)->default('pending');
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->unique('enrollment_id');
        });

        Schema::create('hrd_competency_indicators', function (Blueprint $table) {
            $table->id();
            $table->foreignId('competency_id')->constrained('hrd_competencies')->cascadeOnDelete();
            $table->unsignedTinyInteger('level');
            $table->text('behavior');
            $table->timestamps();
            $table->unique(['competency_id', 'level']);
        });

        Schema::create('hrd_position_competencies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('position_id')->constrained('positions')->cascadeOnDelete();
            $table->foreignId('competency_id')->constrained('hrd_competencies')->cascadeOnDelete();
            $table->unsignedTinyInteger('expected_level')->default(3);
            $table->timestamps();
            $table->unique(['position_id', 'competency_id']);
        });

        Schema::create('hrd_competency_assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('competency_id')->constrained('hrd_competencies')->cascadeOnDelete();
            $table->unsignedSmallInteger('fiscal_year');
            $table->unsignedTinyInteger('self_level')->nullable();
            $table->unsignedTinyInteger('supervisor_level')->nullable();
            $table->foreignId('supervisor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'competency_id', 'fiscal_year']);
        });

        Schema::create('hrd_competency_suggestions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('competency_id')->constrained('hrd_competencies')->cascadeOnDelete();
            $table->foreignId('course_id')->nullable()->constrained('hrd_courses')->nullOnDelete();
            $table->unsignedTinyInteger('proposed_level');
            $table->string('status', 20)->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('hrd_idps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('competency_id')->nullable()->constrained('hrd_competencies')->nullOnDelete();
            $table->unsignedSmallInteger('fiscal_year');
            $table->string('method', 20)->default('course');
            $table->foreignId('course_id')->nullable()->constrained('hrd_courses')->nullOnDelete();
            $table->string('title');
            $table->string('status', 20)->default('planned');
            $table->date('due_date')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('hrd_orientation_items', function (Blueprint $table) {
            $table->id();
            $table->string('scope', 20)->default('org');
            $table->foreignId('department_id')->nullable()->constrained('departments')->cascadeOnDelete();
            $table->string('title');
            $table->foreignId('course_id')->nullable()->constrained('hrd_courses')->nullOnDelete();
            $table->boolean('is_required')->default(true);
            $table->unsignedInteger('sort')->default(0);
            $table->timestamps();
        });

        Schema::create('hrd_orientation_checks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('item_id')->constrained('hrd_orientation_items')->cascadeOnDelete();
            $table->foreignId('checked_by')->constrained('users');
            $table->timestamp('checked_at');
            $table->timestamps();
            $table->unique(['user_id', 'item_id']);
        });

        Schema::create('hrd_orientation_clearances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->foreignId('cleared_by')->constrained('users');
            $table->timestamp('cleared_at');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('hrd_annual_plans', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('fiscal_year');
            $table->string('title');
            $table->string('target_group')->nullable();
            $table->unsignedTinyInteger('quarter')->nullable();
            $table->decimal('target_hours', 8, 2)->nullable();
            $table->decimal('target_pass_rate', 5, 2)->nullable();
            $table->decimal('budget', 12, 2)->default(0);
            $table->foreignId('course_id')->nullable()->constrained('hrd_courses')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('hrd_tna_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedSmallInteger('fiscal_year');
            $table->string('topic');
            $table->string('reason', 20);
            $table->text('note')->nullable();
            $table->timestamps();
        });

        $this->seedDefaults();
    }

    public function down(): void
    {
        Schema::dropIfExists('hrd_tna_responses');
        Schema::dropIfExists('hrd_annual_plans');
        Schema::dropIfExists('hrd_orientation_clearances');
        Schema::dropIfExists('hrd_orientation_checks');
        Schema::dropIfExists('hrd_orientation_items');
        Schema::dropIfExists('hrd_idps');
        Schema::dropIfExists('hrd_competency_suggestions');
        Schema::dropIfExists('hrd_competency_assessments');
        Schema::dropIfExists('hrd_position_competencies');
        Schema::dropIfExists('hrd_competency_indicators');
        Schema::dropIfExists('hrd_behavior_reviews');
        Schema::dropIfExists('hrd_satisfaction_responses');
        Schema::dropIfExists('hrd_satisfaction_questions');

        Schema::table('hrd_course_assignments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('position_id');
        });

        Schema::table('hrd_quiz_attempts', function (Blueprint $table) {
            $table->dropColumn(['percentage', 'answers']);
        });

        Schema::table('hrd_quizzes', function (Blueprint $table) {
            $table->dropColumn('purpose');
        });

        Schema::table('hrd_courses', function (Blueprint $table) {
            $table->dropColumn('track_behavior');
        });

        Schema::table('hrd_enrollments', function (Blueprint $table) {
            $table->dropColumn(['completed_at', 'expires_at']);
        });
    }

    private function seedDefaults(): void
    {
        if (DB::table('hrd_satisfaction_questions')->count() === 0) {
            $now = now();
            $questions = [
                'เนื้อหาตรงกับความต้องการของงาน',
                'วิทยากรหรือสื่ออธิบายเข้าใจง่าย',
                'ระยะเวลาเหมาะสม',
                'นำไปใช้ในงานได้',
                'ความพึงพอใจโดยรวม',
            ];
            foreach ($questions as $index => $text) {
                DB::table('hrd_satisfaction_questions')->insert([
                    'question_text' => $text,
                    'sort' => $index,
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }

        if (DB::table('hrd_competencies')->count() === 0) {
            $now = now();
            $items = [
                ['name' => 'การบริการด้วยหัวใจความเป็นมนุษย์', 'type' => 'core', 'description' => 'ดูแลผู้รับบริการด้วยความเคารพและเห็นอกเห็นใจ'],
                ['name' => 'การทำงานเป็นทีม', 'type' => 'core', 'description' => 'ประสานงานและรับผิดชอบร่วมกับทีม'],
                ['name' => 'จริยธรรมวิชาชีพ', 'type' => 'core', 'description' => 'ปฏิบัติตามจรรยาบรรณและสิทธิผู้ป่วย'],
                ['name' => 'ความรู้และทักษะตามตำแหน่ง', 'type' => 'functional', 'description' => 'ปฏิบัติงานได้ตามขอบเขตของตำแหน่ง'],
                ['name' => 'การสื่อสาร', 'type' => 'functional', 'description' => 'สื่อสารกับผู้รับบริการและทีมได้ชัดเจน'],
                ['name' => 'การนำทีม', 'type' => 'managerial', 'description' => 'มอบหมายงานและพัฒนาผู้ร่วมทีม'],
            ];
            $behaviors = [
                1 => 'ปฏิบัติได้เมื่อมีผู้แนะนำใกล้ชิด',
                2 => 'ปฏิบัติได้เองในงานประจำ',
                3 => 'ปฏิบัติได้คงเส้นคงวาและช่วยเพื่อนร่วมงาน',
                4 => 'เป็นที่ปรึกษาในหน่วยงาน',
                5 => 'กำหนดแนวทางและถ่ายทอดทั้งองค์กร',
            ];
            foreach ($items as $item) {
                $id = DB::table('hrd_competencies')->insertGetId([
                    'name' => $item['name'],
                    'description' => $item['description'],
                    'type' => $item['type'],
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                foreach ($behaviors as $level => $behavior) {
                    DB::table('hrd_competency_indicators')->insert([
                        'competency_id' => $id,
                        'level' => $level,
                        'behavior' => $behavior,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }
            }
        }

        if (DB::table('hrd_orientation_items')->count() === 0) {
            $now = now();
            $titles = [
                'นโยบายและวิสัยทัศน์ของโรงพยาบาล',
                'สิทธิผู้ป่วยและจริยธรรม',
                'ความปลอดภัยจากอัคคีภัย',
                'การป้องกันและควบคุมการติดเชื้อ',
                'การคุ้มครองข้อมูลส่วนบุคคล (PDPA)',
            ];
            foreach ($titles as $index => $title) {
                DB::table('hrd_orientation_items')->insert([
                    'scope' => 'org',
                    'department_id' => null,
                    'title' => $title,
                    'course_id' => null,
                    'is_required' => true,
                    'sort' => $index,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }
};
