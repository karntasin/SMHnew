<?php

namespace Database\Seeders;

use App\Services\MedicalEquipmentCatalogSyncService;
use Illuminate\Database\Seeder;

class MedicalEquipmentCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $stats = app(MedicalEquipmentCatalogSyncService::class)->sync();
        $this->command?->info(sprintf(
            'catalog equipment created=%d updated=%d images=%d',
            $stats['created'],
            $stats['updated'],
            $stats['images']
        ));
    }
}
