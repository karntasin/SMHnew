<?php

namespace Database\Seeders;

use App\Models\MaintenanceCategory;
use App\Models\MaintenancePriority;
use Illuminate\Database\Seeder;

class MaintenanceDefaultsSeeder extends Seeder
{
    public function run(): void
    {
        if (MaintenanceCategory::count() === 0) {
            $categories = [
                ['name' => 'ไฟฟ้าและแสงสว่าง', 'description' => 'หลอดไฟ สวิตช์ เบรกเกอร์ ปลั๊กไฟ', 'icon' => 'zap', 'color' => '#F59E0B', 'order' => 1],
                ['name' => 'ประปาและสุขภัณฑ์', 'description' => 'ท่อน้ำ ก๊อกน้ำ ห้องน้ำ ระบบระบายน้ำ', 'icon' => 'droplets', 'color' => '#3B82F6', 'order' => 2],
                ['name' => 'แอร์และระบบปรับอากาศ', 'description' => 'เครื่องปรับอากาศ พัดลม ระบบระบายอากาศ', 'icon' => 'wind', 'color' => '#06B6D4', 'order' => 3],
                ['name' => 'อาคารและโครงสร้าง', 'description' => 'ประตู หน้าต่าง ฝ้าเพดาน พื้น ผนัง', 'icon' => 'building', 'color' => '#78716C', 'order' => 4],
                ['name' => 'IT และอุปกรณ์คอมพิวเตอร์', 'description' => 'คอมพิวเตอร์ เครื่องพิมพ์ เครือข่าย', 'icon' => 'monitor', 'color' => '#8B5CF6', 'order' => 5],
                ['name' => 'เฟอร์นิเจอร์และเครื่องใช้', 'description' => 'โต๊ะ เก้าอี้ ตู้ อุปกรณ์สำนักงาน', 'icon' => 'armchair', 'color' => '#10B981', 'order' => 6],
                ['name' => 'อื่นๆ', 'description' => 'ปัญหาอื่นที่ไม่อยู่ในหมวดหมู่ข้างต้น', 'icon' => 'wrench', 'color' => '#6B7280', 'order' => 99],
            ];

            foreach ($categories as $category) {
                MaintenanceCategory::create([...$category, 'is_active' => true]);
            }

            $this->command?->info('สร้างหมวดหมู่แจ้งซ่อม '.count($categories).' รายการ');
        }

        if (MaintenancePriority::count() === 0) {
            $priorities = [
                ['name' => 'ปกติ', 'color' => '#22C55E', 'level' => 1, 'sla_hours' => 72, 'description' => 'ไม่กระทบการให้บริการ'],
                ['name' => 'ปานกลาง', 'color' => '#EAB308', 'level' => 2, 'sla_hours' => 48, 'description' => 'กระทบการใช้งานบางส่วน'],
                ['name' => 'เร่งด่วน', 'color' => '#F97316', 'level' => 3, 'sla_hours' => 24, 'description' => 'กระทบการให้บริการอย่างมีนัยสำคัญ'],
                ['name' => 'วิกฤต', 'color' => '#EF4444', 'level' => 4, 'sla_hours' => 4, 'description' => 'หยุดให้บริการหรือเสี่ยงต่อความปลอดภัย'],
            ];

            foreach ($priorities as $priority) {
                MaintenancePriority::create([...$priority, 'is_active' => true]);
            }

            $this->command?->info('สร้างระดับความสำคัญแจ้งซ่อม '.count($priorities).' รายการ');
        }
    }
}
