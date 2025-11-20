<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $departments = [
            ['name' => 'ศูนย์ประกันสุขภาพ', 'description' => 'งานสนับสนุนการรักษาพยาบาล'],
            ['name' => 'ศูนย์พัฒนาคุณภาพ', 'description' => 'งานอำนวยการ'],
            ['name' => 'ศูนย์สารสนเทศ', 'description' => 'งานอำนวยการ'],
            ['name' => 'ศูนย์เก็บเงิน', 'description' => 'งานสนับสนุนการรักษาพยาบาล'],
            ['name' => 'หน่วยจ่ายกลาง', 'description' => 'งานสนับสนุนการรักษาพยาบาล'],
            ['name' => 'หมวดพลเสนารักษ์', 'description' => 'งานอำนวยการ'],
            ['name' => 'หอผู้ป่วย', 'description' => 'งานรักษาพยาบาล'],
            ['name' => 'หอผู้ป่วยสามัญ', 'description' => 'งานรักษาพยาบาล'],
            ['name' => 'ห้องกายภาพบำบัด', 'description' => 'งานรักษาพยาบาล'],
            ['name' => 'ห้องผู้ป่วยไตเทียม', 'description' => 'งานรักษาพยาบาล'],
            ['name' => 'ห้องแพทย์แผนจีน', 'description' => 'งานรักษาพยาบาล'],
            ['name' => 'ห้องแพทย์แผนไทย', 'description' => 'งานรักษาพยาบาล'],
            ['name' => 'องค์กรแพทย์', 'description' => 'งานรักษาพยาบาล'],
            ['name' => 'แผนกการเงิน', 'description' => 'งานอำนวยการ'],
            ['name' => 'แผนกซักรีด', 'description' => 'งานสนับสนุนการรักษาพยาบาล'],
            ['name' => 'แผนกตรวจโรคผู้ป่วยนอก', 'description' => 'งานรักษาพยาบาล'],
            ['name' => 'แผนกทะเบียนผู้ป่วย', 'description' => 'งานสนับสนุนการรักษาพยาบาล'],
            ['name' => 'แผนกทันตกรรม', 'description' => 'งานรักษาพยาบาล'],
            ['name' => 'แผนกธุรการและกำลังพล', 'description' => 'งานอำนวยการ'],
            ['name' => 'แผนกพยาธิวิทยา', 'description' => 'งานสนับสนุนการรักษาพยาบาล'],
            ['name' => 'แผนกพยาบาล', 'description' => 'งานรักษาพยาบาล'],
            ['name' => 'แผนกพลาธิการ', 'description' => 'งานอำนวยการ'],
            ['name' => 'แผนกรังสีกรรม', 'description' => 'งานสนับสนุนการรักษาพยาบาล'],
            ['name' => 'แผนกสูทกรรม', 'description' => 'งานสนับสนุนการรักษาพยาบาล'],
            ['name' => 'แผนกส่งกำลังบำรุง', 'description' => 'งานอำนวยการ'],
            ['name' => 'แผนกอุบัติเหตุและฉุกเฉิน', 'description' => 'งานรักษาพยาบาล'],
            ['name' => 'แผนกเภสัชกรรม', 'description' => 'งานสนับสนุนการรักษาพยาบาล'],
            ['name' => 'แผนกเวชกรรมป้องกัน', 'description' => 'งานสนับสนุนการรักษาพยาบาล'],
        ];

        foreach ($departments as $dept) {
            Department::firstOrCreate(
                ['name' => $dept['name']],
                ['description' => $dept['description']]
            );
        }
    }
}
