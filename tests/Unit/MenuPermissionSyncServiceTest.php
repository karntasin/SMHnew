<?php

namespace Tests\Unit;

use App\Services\MenuPermissionSyncService;
use PHPUnit\Framework\TestCase;

class MenuPermissionSyncServiceTest extends TestCase
{
    private MenuPermissionSyncService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new MenuPermissionSyncService;
    }

    public function test_route_name_is_used_as_permission(): void
    {
        $this->assertSame(
            'pharmacy.drug-alerts',
            $this->service->permissionNameFromRoute('pharmacy.drug-alerts'),
        );
    }

    public function test_known_quality_indicator_paths_map_to_stable_permissions(): void
    {
        $this->assertSame(
            'quality-indicators.org.sar',
            $this->service->permissionNameFromRoute(
                '/quality-indicators?type=organization&category=แบบประเมินตนเอง SAR',
            ),
        );

        $this->assertSame(
            'quality-indicators.org.strategy',
            $this->service->permissionNameFromRoute(
                '/quality-indicators?type=organization&category=แผนยุทธศาสตร์ รพ.',
            ),
        );
    }

    public function test_path_route_becomes_dotted_permission(): void
    {
        $this->assertSame(
            'admin.tv.settings',
            $this->service->permissionNameFromRoute('/admin/tv/settings'),
        );
    }
}
