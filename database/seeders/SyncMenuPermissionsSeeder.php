<?php

namespace Database\Seeders;

use App\Services\MenuPermissionSyncService;
use Illuminate\Database\Seeder;

class SyncMenuPermissionsSeeder extends Seeder
{
    /**
     * สร้าง/เติม permission จากเมนูทั้งหมด และมอบให้ admin / superUser
     */
    public function run(): void
    {
        $result = app(MenuPermissionSyncService::class)->sync();

        $this->command?->info(sprintf(
            'Sync menu permissions: ensured %d, backfilled %d, created %d, role assignments %d (uncovered %d)',
            $result['menus_ensured'],
            $result['permissions_backfilled'],
            $result['permissions_created'],
            $result['role_assignments'],
            $result['uncovered_after'],
        ));
    }
}
