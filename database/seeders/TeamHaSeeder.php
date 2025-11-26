<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class TeamHaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $teams = [
            ['abbreviation' => 'PCT', 'name_th' => 'ทีมพัฒนาคุณภาพการดูแลผู้ป่วย', 'name_en' => 'Patient Care Team'],
            ['abbreviation' => 'RM', 'name_th' => 'ทีมบริหารความเสี่ยง', 'name_en' => 'Risk Management'],
            ['abbreviation' => 'IC', 'name_th' => 'ทีมควบคุมการติดเชื้อ', 'name_en' => 'Infection Control'],
            ['abbreviation' => 'IM', 'name_th' => 'ทีมบริหารสารสนเทศ/เวชระเบียน', 'name_en' => 'Information Management/Medical Record'],
            ['abbreviation' => 'HRD', 'name_th' => 'ทีมพัฒนาบุคลากร', 'name_en' => 'Human Resource Development'],
            ['abbreviation' => 'ENV', 'name_th' => 'ทีมบริหารสิ่งแวดล้อมและความปลอดภัย', 'name_en' => 'Environment and Safety'],
            ['abbreviation' => 'LR', 'name_th' => 'ทีมปฏิบัติการและฟื้นคืนชีพ', 'name_en' => 'Labor Room/Resuscitation Team'],
            ['abbreviation' => 'CQI', 'name_th' => 'ทีมพัฒนาคุณภาพอย่างต่อเนื่อง', 'name_en' => 'Continuous Quality Improvement'],
            ['abbreviation' => 'SE', 'name_th' => 'ทีมดูแลความปลอดภัย', 'name_en' => 'Safety Everywhere (บาง รพ.)'],
            ['abbreviation' => 'KPI', 'name_th' => 'ทีมตัวชี้วัดคุณภาพ', 'name_en' => 'Key Performance Indicator Team'],
            ['abbreviation' => 'PT', 'name_th' => 'ทีมดูแลผู้ป่วยเฉพาะโรค/กลุ่มโรค', 'name_en' => 'Patient Team (เช่น DM Team, HT Team)'],
            ['abbreviation' => 'TQM', 'name_th' => 'ทีมบริหารคุณภาพทั่วทั้งองค์กร', 'name_en' => 'Total Quality Management (บาง รพ.)'],
        ];

        foreach ($teams as $team) {
            \Illuminate\Support\Facades\DB::table('teamha')->updateOrInsert(
                ['abbreviation' => $team['abbreviation']],
                [
                    'name_th' => $team['name_th'],
                    'name_en' => $team['name_en'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }
}
