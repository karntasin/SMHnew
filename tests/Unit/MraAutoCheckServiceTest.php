<?php

namespace Tests\Unit;

use App\Services\Mra\HosxpEmrVisitBundle;
use App\Services\Mra\MraAutoCheckService;
use PHPUnit\Framework\TestCase;

class MraAutoCheckServiceTest extends TestCase
{
    public function test_evidence_for_profile_and_history_never_sets_passed(): void
    {
        $bundleLoader = $this->createMock(HosxpEmrVisitBundle::class);
        $bundleLoader->method('clip')->willReturnCallback(function (?string $text, int $max = 160) {
            if ($text === null || $text === '') {
                return null;
            }

            return mb_strlen($text) <= $max ? $text : mb_substr($text, 0, $max - 1).'…';
        });

        $service = new MraAutoCheckService($bundleLoader);

        $bundle = [
            'visit' => [
                'chief_complaint' => 'ปวดท้อง 2 วัน',
                'present_illness' => 'ปวดท้องน้อยข้างขวา',
                'pe' => 'Abdomen soft',
                'pdx' => 'R10.4',
                'pdx_name' => 'Other abdominal pain',
                'vstdate' => '2026-10-07',
                'vsttime' => '09:30:00',
                'doctor_name' => 'นพ.ทดสอบ',
                'doctor_code' => '001',
                'labs_count' => 1,
                'xray_count' => 0,
                'items_count' => 2,
                'allergy_text' => 'ปฏิเสธแพ้ยา',
                'vital_signs' => [
                    'pulse' => 80,
                    'respiratory_rate' => 20,
                    'temperature' => 37.2,
                    'bp_systolic' => 120,
                    'bp_diastolic' => 80,
                    'weight' => 60,
                    'height' => 165,
                ],
                'next_appointment' => '2026-10-14',
                'labs' => [['confirm_report' => 'Y']],
            ],
            'patient' => [
                'patient_name' => 'นายทดสอบ ระบบ',
                'hn' => '000000001',
                'sex' => '1',
                'birthdate' => '1990-01-01',
                'age_text' => '36 ปี',
                'cid' => '1234567890123',
                'full_address' => '1 หมู่ 1 ต.ทดสอบ',
                'informname' => 'สมหญิง',
                'informrelation' => 'มารดา',
                'informtel' => '0812345678',
                'bloodgrp' => 'A',
            ],
            'opdscreen' => [
                'advice1' => 'Y',
                'advice7_note' => 'พักผ่อน',
                'smoking_type_id' => 1,
                'his_begin_date' => '2026-10-05',
                'his_severity' => 'ปานกลาง',
            ],
            'patient_history' => [],
            'pe_visit' => [],
            'er' => [],
            'is_er' => false,
            'doctor_sign' => ['sign_datetime' => '2026-10-07 10:00:00'],
            'consults' => [],
            'operation' => [],
            'consent' => [],
            'prior_visits' => [],
            'drugs' => [
                ['name' => 'Paracetamol', 'detail' => 'Paracetamol 500 mg · จำนวน 10 · วิธีใช้ 1 tab tid', 'icode' => '0010001'],
            ],
            'labs' => [
                ['item_name' => 'CBC', 'detail' => 'CBC = 12.0 g/dL', 'result' => '12.0', 'confirm_report' => true],
            ],
            'diagnoses' => [
                ['type' => 'PDx', 'icd10' => 'R10.4', 'name' => 'Other abdominal pain', 'detail' => 'PDx R10.4 — Other abdominal pain'],
            ],
            'drug_summary' => 'Paracetamol 500 mg · จำนวน 10',
            'lab_summary' => 'Lab:1 CBC = 12.0',
            'ipt' => [],
            'is_ipd' => false,
            'has_followup_history' => false,
        ];

        foreach (['pp_1', 'hist_1', 'hist_2', 'pe_4', 'tx_2', 'tx_6', 'pe_7'] as $code) {
            $result = $service->evidenceFor($code, $bundle);
            $this->assertTrue($result['evidence_found'], "Expected evidence for {$code}");
            $this->assertNotEmpty($result['value']);
        }

        $sections = $service->buildSections('tx_2', $bundle);
        $this->assertNotEmpty($sections);
        $titles = array_map(fn ($s) => $s['title'], $sections);
        $this->assertTrue((bool) array_filter($titles, fn ($t) => str_contains($t, 'ยา')));

        $missing = $service->evidenceFor('tx_5', $bundle);
        $this->assertFalse($missing['evidence_found']);
        $this->assertNull($missing['value']);

        $details = $service->buildDetails('hist_1', $bundle);
        $this->assertNotEmpty($details);
        $hasCc = false;
        foreach ($details as $row) {
            if (($row['field'] ?? '') === 'cc' && ($row['found'] ?? false)) {
                $hasCc = true;
                break;
            }
        }
        $this->assertTrue($hasCc, 'Expected CC detail row');
    }
}
