<?php

namespace Database\Seeders;

use App\Models\Mra\MraCategory;
use App\Models\Mra\MraCriteria;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * เกณฑ์ MRA ปี 2563 ตามระบบ mra2 / คู่มือ สปสช.–สรพ.–HA
 * - OPD: 7 หมวด (+ bonus / Follow-up ครั้งที่ 1–3)
 * - IPD: 12 หมวด × 9 ข้อ
 * คะแนนรายข้อ: ผ่าน=1, ไม่ผ่าน=0, N/A=ไม่คิดคะแนน
 */
class MraCriteriaSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        MraCriteria::truncate();
        MraCategory::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $this->seedChannel('opd', config('mra_criteria_opd'));
        $this->seedChannel('ipd', config('mra_criteria_ipd'));

        $this->command?->info(sprintf(
            'MRA 2563 seeded: OPD %d cats / IPD %d cats · criteria %d',
            MraCategory::where('audit_type', 'opd')->count(),
            MraCategory::where('audit_type', 'ipd')->count(),
            MraCriteria::count(),
        ));
    }

    private function seedChannel(string $auditType, ?array $config): void
    {
        if (!$config || empty($config['sections'])) {
            $this->command?->warn("Missing config for {$auditType}");

            return;
        }

        $autoMap = $this->autoFieldHints($auditType);

        foreach ($config['sections'] as $sectionKey => $section) {
            $number = (int) ($section['number'] ?? 0);
            $code = strtoupper($auditType) . '-' . str_pad((string) $number, 2, '0', STR_PAD_LEFT);

            $category = MraCategory::create([
                'code' => $code,
                'audit_type' => $auditType,
                'section_key' => $sectionKey,
                'name' => $section['title'] ?? $sectionKey,
                'name_en' => $sectionKey,
                'description' => $config['subtitle'] ?? null,
                'hint' => $section['hint'] ?? null,
                'sort_order' => $number,
                'weight' => 1.00,
                'is_conditional' => (bool) ($section['conditional'] ?? false),
                'is_required_section' => (bool) ($section['required'] ?? !($section['conditional'] ?? false)),
                'is_active' => true,
            ]);

            $sort = 0;

            // รายการปกติ
            foreach (($section['items'] ?? []) as $itemCode => $label) {
                $sort++;
                $hint = $autoMap[$itemCode] ?? null;
                MraCriteria::create([
                    'mra_category_id' => $category->id,
                    'code' => $itemCode,
                    'group_key' => null,
                    'group_title' => null,
                    'name' => $label,
                    'name_en' => $itemCode,
                    'description' => null,
                    'audit_guide' => $section['hint'] ?? ($config['subtitle'] ?? null),
                    'hosxp_table' => $hint['table'] ?? null,
                    'hosxp_field' => $hint['field'] ?? null,
                    'data_type' => $hint ? ($hint['type'] ?? 'both') : 'manual',
                    'max_score' => 1,
                    'sort_order' => $sort,
                    'is_required' => !($section['conditional'] ?? false),
                    'is_bonus' => false,
                    'is_active' => true,
                ]);
            }

            // กลุ่มย่อย (เช่น Follow up ครั้งที่ 1–3)
            foreach (($section['groups'] ?? []) as $groupKey => $group) {
                foreach (($group['items'] ?? []) as $itemCode => $label) {
                    $sort++;
                    $hint = $autoMap[$itemCode] ?? null;
                    MraCriteria::create([
                        'mra_category_id' => $category->id,
                        'code' => $itemCode,
                        'group_key' => $groupKey,
                        'group_title' => $group['title'] ?? $groupKey,
                        'name' => $label,
                        'name_en' => $itemCode,
                        'description' => null,
                        'audit_guide' => $section['hint'] ?? null,
                        'hosxp_table' => $hint['table'] ?? null,
                        'hosxp_field' => $hint['field'] ?? null,
                        'data_type' => $hint ? ($hint['type'] ?? 'both') : 'manual',
                        'max_score' => 1,
                        'sort_order' => $sort,
                        'is_required' => false,
                        'is_bonus' => false,
                        'is_active' => true,
                    ]);
                }
            }

            // คะแนนโบนัส (+1)
            foreach (($section['bonus'] ?? []) as $itemCode => $label) {
                $sort++;
                MraCriteria::create([
                    'mra_category_id' => $category->id,
                    'code' => $itemCode,
                    'group_key' => null,
                    'group_title' => null,
                    'name' => $label,
                    'name_en' => $itemCode,
                    'description' => 'คะแนนโบนัส (+1) ตามคู่มือ MRA 2563',
                    'audit_guide' => 'ข้อเพิ่มคะแนน — ไม่บังคับ แต่เมื่อเกี่ยวข้องให้ประเมิน 0/1/N/A',
                    'hosxp_table' => null,
                    'hosxp_field' => null,
                    'data_type' => 'manual',
                    'max_score' => 1,
                    'sort_order' => $sort,
                    'is_required' => false,
                    'is_bonus' => true,
                    'is_active' => true,
                ]);
            }
        }
    }

    /**
     * จุดเชื่อม HOSxP สำหรับ auto-check (เฉพาะข้อที่ข้อมูลดึงได้จริง)
     */
    private function autoFieldHints(string $auditType): array
    {
        if ($auditType !== 'opd') {
            // IPD ส่วนใหญ่ต้องตรวจเอกสารกระดาษ/สแกน — ใช้ manual เป็นหลัก
            return [
                'dso_1' => ['table' => 'patient', 'field' => 'pname,fname,lname,sex,birthday', 'type' => 'both'],
                'dso_2' => ['table' => 'patient', 'field' => 'cid', 'type' => 'auto'],
                'dso_4' => ['table' => 'ipt', 'field' => 'hn,an', 'type' => 'auto'],
                'dso_5' => ['table' => 'ipt', 'field' => 'regdate,dchdate', 'type' => 'auto'],
                'ih_1' => ['table' => 'opdscreen', 'field' => 'cc', 'type' => 'both'],
                'ipe_1' => ['table' => 'opdscreen', 'field' => 'bps,bpd,pulse,temperature,rr', 'type' => 'both'],
            ];
        }

        return [
            'pp_1' => ['table' => 'patient', 'field' => 'pname,fname,lname,hn,sex,birthday', 'type' => 'auto'],
            'pp_2' => ['table' => 'patient', 'field' => 'addrpart,moopart,tmbpart,amppart,chwpart', 'type' => 'auto'],
            'pp_3' => ['table' => 'patient', 'field' => 'cid', 'type' => 'auto'],
            'pp_4' => ['table' => 'patient', 'field' => 'drugallergy', 'type' => 'both'],
            'hist_1' => ['table' => 'opdscreen', 'field' => 'cc', 'type' => 'both'],
            'hist_6' => ['table' => 'patient', 'field' => 'drugallergy', 'type' => 'both'],
            'pe_1' => ['table' => 'ovst', 'field' => 'vstdate,vsttime', 'type' => 'auto'],
            'pe_4' => ['table' => 'opdscreen', 'field' => 'pulse,rr,temperature', 'type' => 'both'],
            'pe_5' => ['table' => 'opdscreen', 'field' => 'bps,bpd', 'type' => 'both'],
            'pe_6' => ['table' => 'opdscreen', 'field' => 'bw,height', 'type' => 'both'],
            'pe_7' => ['table' => 'ovstdiag', 'field' => 'icd10', 'type' => 'both'],
            'tx_1' => ['table' => 'lab_head', 'field' => 'lab_order_number', 'type' => 'both'],
            'tx_2' => ['table' => 'opitemrece', 'field' => 'icode', 'type' => 'both'],
            'tx_6' => ['table' => 'ovst', 'field' => 'doctor', 'type' => 'both'],
        ];
    }
}
