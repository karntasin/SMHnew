<?php

namespace App\Console\Commands;

use App\Services\MedicalEquipmentCatalogSyncService;
use Illuminate\Console\Command;

class SeedMedicalEquipmentCatalog extends Command
{
    protected $signature = 'equipment:seed-form-catalog {--refresh-images : ดาวน์โหลดรูปใหม่ทับของเดิม}';

    protected $description = 'นำเข้ารายการอุปกรณ์แพทย์ 22 รายการตาม Google Form พร้อมรูปและสต็อกเริ่มต้นอย่างละ 5';

    public function handle(MedicalEquipmentCatalogSyncService $sync): int
    {
        $stats = $sync->sync(refreshImages: (bool) $this->option('refresh-images'));

        $this->info(sprintf(
            'สร้าง %d · อัปเดต %d · ดึงรูป %d',
            $stats['created'],
            $stats['updated'],
            $stats['images']
        ));

        if ($stats['image_failed'] !== []) {
            $this->warn('ยังไม่มีรูป: '.implode(', ', $stats['image_failed']));
        }

        return self::SUCCESS;
    }
}
