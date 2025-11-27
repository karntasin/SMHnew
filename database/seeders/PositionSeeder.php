<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Position;
use App\Models\TeamHa;
use Illuminate\Database\Seeder;

class PositionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // สร้างตำแหน่งงานจากแผนก (departments)
        $departments = Department::all();
        foreach ($departments as $department) {
            Position::firstOrCreate(
                ['name' => $department->name],
                ['description' => 'จากแผนก: ' . $department->name]
            );
        }

        // สร้างตำแหน่งงานจากทีม HA (teamha) - ใช้ abbreviation เป็นชื่อ
        $teamhas = TeamHa::all();
        foreach ($teamhas as $teamha) {
            $name = $teamha->abbreviation ?: $teamha->name_th ?: $teamha->name_en;
            if ($name) {
                Position::firstOrCreate(
                    ['name' => $name],
                    ['description' => 'จากทีม HA: ' . ($teamha->name_th ?: $teamha->name_en ?: $teamha->abbreviation)]
                );
            }
        }

        $this->command->info('สร้างตำแหน่งงานจาก Departments: ' . $departments->count() . ' รายการ');
        $this->command->info('สร้างตำแหน่งงานจาก Teamha: ' . $teamhas->count() . ' รายการ');
    }
}
