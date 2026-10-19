<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $form = DB::table('hrd_assessment_forms')->where('code', 'wellbeing')->first();
        if (! $form) {
            return;
        }

        $now = now();
        $sectionIds = DB::table('hrd_assessment_sections')->where('form_id', $form->id)->pluck('id');
        $renames = [
            'ฉันมีพลังเมื่อเริ่มเวร' => 'ฉันมีพลังเมื่อเริ่มปฏิบัติงาน',
            'ฉันภูมิใจในงานที่ทำให้เสร็จในแต่ละเวร' => 'ฉันภูมิใจในงานที่ทำให้เสร็จในการปฏิบัติงานแต่ละวัน',
            'ฉันกังวลเรื่องงานแม้หมดเวรแล้ว' => 'ฉันกังวลเรื่องงานแม้เลิกปฏิบัติงานแล้ว',
            'ฉันรับแรงกดดันในเวรได้' => 'ฉันรับแรงกดดันในการปฏิบัติงานได้',
            'ฉันมีวิธีคลายความตึงเครียดหลังเลิกเวร' => 'ฉันมีวิธีคลายความตึงเครียดหลังเลิกปฏิบัติงาน',
            'ฉันหมดแรงแม้ได้พักระหว่างเวร' => 'ฉันหมดแรงแม้ได้พักระหว่างปฏิบัติงาน',
        ];

        foreach ($renames as $from => $to) {
            DB::table('hrd_assessment_items')
                ->whereIn('section_id', $sectionIds)
                ->where('prompt', $from)
                ->update(['prompt' => $to, 'updated_at' => $now]);
        }

        $title = 'สถานการณ์ในการปฏิบัติงาน';
        $section = DB::table('hrd_assessment_sections')
            ->where('form_id', $form->id)
            ->where('title', $title)
            ->first();

        if (! $section) {
            $sectionId = DB::table('hrd_assessment_sections')->insertGetId([
                'form_id' => $form->id,
                'title' => $title,
                'weight' => 1,
                'sort' => 4,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        } else {
            $sectionId = $section->id;
        }

        $prompts = [
            'เพื่อนร่วมงานพูดเสียงดังต่อหน้าผู้รับบริการ ฉันช่วยคลี่คลายอย่างสุภาพได้',
            'งานด่วนเข้ามาทับงานที่ยังไม่เสร็จ ฉันแจ้งลำดับความสำคัญและขอความช่วยเหลือได้',
            'พบความผิดพลาดของตนเองที่ยังไม่ถึงผู้รับบริการ ฉันรายงานทันทีได้',
            'ผู้รับบริการโกรธและตำหนิ ฉันยังพูดด้วยน้ำเสียงสงบได้',
            'ทีมเห็นไม่ตรงกันเรื่องวิธีทำงาน ฉันชวนคุยด้วยข้อมูลได้',
            'งานค้างจนเริ่มหงุดหงิด ฉันพักสั้น ๆ แล้วจัดลำดับใหม่ได้',
        ];

        foreach ($prompts as $index => $prompt) {
            $exists = DB::table('hrd_assessment_items')
                ->where('section_id', $sectionId)
                ->where('prompt', $prompt)
                ->exists();
            if ($exists) {
                continue;
            }

            DB::table('hrd_assessment_items')->insert([
                'section_id' => $sectionId,
                'prompt' => $prompt,
                'reverse_scored' => false,
                'sort' => $index,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        DB::table('hrd_assessment_forms')->where('id', $form->id)->update([
            'description' => 'แบบคัดกรองความผูกพัน ความเครียด ความเหนื่อยล้า ความปลอดภัยทางจิตใจ และสถานการณ์ในการปฏิบัติงาน',
            'updated_at' => $now,
        ]);
    }

    public function down(): void
    {
        $form = DB::table('hrd_assessment_forms')->where('code', 'wellbeing')->first();
        if (! $form) {
            return;
        }

        $section = DB::table('hrd_assessment_sections')
            ->where('form_id', $form->id)
            ->where('title', 'สถานการณ์ในการปฏิบัติงาน')
            ->first();
        if ($section) {
            DB::table('hrd_assessment_items')->where('section_id', $section->id)->delete();
            DB::table('hrd_assessment_sections')->where('id', $section->id)->delete();
        }
    }
};
