<?php

use App\Data\HrdAssessmentCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        foreach (HrdAssessmentCatalog::forms() as $formData) {
            if (($formData['sections'] ?? []) === []) {
                continue;
            }

            $form = DB::table('hrd_assessment_forms')->where('code', $formData['code'])->first();
            if (! $form) {
                continue;
            }

            foreach ($formData['sections'] as $sectionIndex => $section) {
                $existingSection = DB::table('hrd_assessment_sections')
                    ->where('form_id', $form->id)
                    ->where('title', $section['title'])
                    ->first();

                if ($existingSection) {
                    $sectionId = $existingSection->id;
                    DB::table('hrd_assessment_sections')->where('id', $sectionId)->update([
                        'sort' => $sectionIndex,
                        'updated_at' => $now,
                    ]);
                } else {
                    $sectionId = DB::table('hrd_assessment_sections')->insertGetId([
                        'form_id' => $form->id,
                        'title' => $section['title'],
                        'weight' => $section['weight'],
                        'sort' => $sectionIndex,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }

                foreach ($section['items'] as $itemIndex => $item) {
                    $existingItem = DB::table('hrd_assessment_items')
                        ->where('section_id', $sectionId)
                        ->where('prompt', $item['prompt'])
                        ->first();

                    if ($existingItem) {
                        DB::table('hrd_assessment_items')->where('id', $existingItem->id)->update([
                            'reverse_scored' => $item['reverse'],
                            'sort' => $itemIndex,
                            'updated_at' => $now,
                        ]);
                        continue;
                    }

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
    }

    public function down(): void
    {
        // ข้อที่เพิ่มไว้ใช้กับคำตอบแล้ว จึงไม่ลบย้อนกลับ
    }
};
