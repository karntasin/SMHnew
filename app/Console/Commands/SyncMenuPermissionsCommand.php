<?php

namespace App\Console\Commands;

use App\Services\MenuPermissionSyncService;
use App\Services\RoleAccessMenuService;
use Illuminate\Console\Command;

class SyncMenuPermissionsCommand extends Command
{
    protected $signature = 'menus:sync-permissions {--no-grant : ไม่มอบสิทธิ์ใหม่ให้ admin/superUser}';

    protected $description = 'ซิงก์ permission ของทุกเมนูให้ครบ เพื่อใช้ในหน้าจัดการบทบาท';

    public function handle(MenuPermissionSyncService $sync, RoleAccessMenuService $accessMenus): int
    {
        $result = $sync->sync(grantAdmins: ! $this->option('no-grant'));
        $coverage = $sync->coverage();
        $tree = $accessMenus->buildTree();

        $this->info('ซิงก์เมนู ↔ สิทธิ์เรียบร้อย');
        $this->table(
            ['รายการ', 'จำนวน'],
            [
                ['เมนูที่สร้าง/เติม', $result['menus_ensured']],
                ['เติม permission_name', $result['permissions_backfilled']],
                ['สร้าง Spatie permission', $result['permissions_created']],
                ['มอบสิทธิ์ให้ admin', $result['role_assignments']],
                ['เมนูที่นำทางได้', $result['navigable_menus']],
                ['ขาดสิทธิ์ก่อนซิงก์', $result['missing_before']],
                ['ยังไม่ครบหลังซิงก์', $result['uncovered_after']],
                ['เมนูทั้งหมด', $coverage['total_menus']],
                ['เลือกในบทบาทได้', $coverage['assignable_menus']],
                ['รากเมนูในฟอร์มบทบาท', count($tree)],
            ]
        );

        return $result['uncovered_after'] > 0 ? self::FAILURE : self::SUCCESS;
    }
}
