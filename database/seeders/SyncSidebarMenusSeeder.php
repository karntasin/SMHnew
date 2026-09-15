<?php

namespace Database\Seeders;

use App\Models\Menu;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class SyncSidebarMenusSeeder extends Seeder
{
    public function run(): void
    {
        $quality = $this->ensureGroup(null, [
            'ศูนย์พัฒนาคุณภาพ', 'ศูนย์คุณภาพ', 'ศูนย์รวมงานคุณภาพ', 'Quality Hub',
        ], 'ศูนย์พัฒนาคุณภาพ', 'Award', 10, ['quality.index']);

        $admin = $this->ensureGroup(null, [
            'งานธุรการ', 'Administrative Hub',
        ], 'งานธุรการ', 'Building2', 20, ['admin.hub']);

        $this->syncChildren($quality, [
            ['title' => 'ภาพรวมศูนย์พัฒนาคุณภาพ', 'icon' => 'Home', 'route' => 'quality.index', 'order' => 1],
        ], 'ศูนย์พัฒนาคุณภาพ', false);

        $this->syncGroup($quality, ['คลังเอกสารคุณภาพ', 'Quality Documents'], 'คลังเอกสารคุณภาพ', 'BookOpen', 2, [
            ['title' => 'ค้นหาเอกสาร', 'icon' => 'Search', 'route' => 'quality-docs.index', 'order' => 1],
            ['title' => 'สร้างเอกสารใหม่', 'icon' => 'FilePlus', 'route' => 'quality-docs.create', 'order' => 2],
        ], 'คลังเอกสารคุณภาพ');

        $this->syncGroup($quality, ['ตัวชี้วัดคุณภาพ', 'Quality Indicators'], 'ตัวชี้วัดคุณภาพ', 'BarChart3', 3, [
            ['title' => 'รายการตัวชี้วัด', 'icon' => 'List', 'route' => 'quality-indicators.index', 'order' => 1],
            ['title' => 'ภาพรวมตัวชี้วัด', 'icon' => 'LayoutDashboard', 'route' => 'quality-indicators.dashboard', 'order' => 2],
            ['title' => 'นำเข้า Excel', 'icon' => 'Upload', 'route' => 'quality-indicators.import.index', 'order' => 3],
            ['title' => 'คู่มือตัวชี้วัด', 'icon' => 'BookOpen', 'route' => 'quality-indicators.guide', 'order' => 4],
        ], 'ตัวชี้วัดคุณภาพ');

        $this->syncChildren($quality, [
            ['title' => 'การติดตามทบทวนคุณภาพ', 'icon' => 'ClipboardCheck', 'route' => 'quality-assurance.index', 'order' => 4],
        ], 'การติดตามทบทวนคุณภาพ', false);

        $this->syncGroup($quality, ['ตรวจสอบเวชระเบียน (MRA)', 'MRA', 'Medical Record Accuracy'], 'ตรวจสอบเวชระเบียน (MRA)', 'Search', 5, [
            ['title' => 'ภาพรวม MRA', 'icon' => 'LayoutDashboard', 'route' => 'mra.dashboard', 'order' => 1],
            ['title' => 'รายการตรวจ', 'icon' => 'ClipboardList', 'route' => 'mra.index', 'order' => 2],
            ['title' => 'สร้างการตรวจใหม่', 'icon' => 'Plus', 'route' => 'mra.create', 'order' => 3],
            ['title' => 'รายงาน MRA', 'icon' => 'BarChart3', 'route' => 'mra.reports', 'order' => 4],
            ['title' => 'ตั้งค่าเกณฑ์', 'icon' => 'Settings', 'route' => 'mra.settings', 'order' => 5],
            ['title' => 'คู่มือ MRA', 'icon' => 'BookOpen', 'route' => 'mra.guide', 'order' => 6],
        ], 'MRA');

        $this->syncGroup($quality, ['ป้องกันและควบคุมการติดเชื้อ', 'Infection Control', 'IC'], 'ป้องกันและควบคุมการติดเชื้อ (IC)', 'ShieldAlert', 6, [
            ['title' => 'ภาพรวม IC', 'icon' => 'LayoutDashboard', 'route' => 'ic.index', 'order' => 1],
            ['title' => 'เฝ้าระวัง', 'icon' => 'Activity', 'route' => 'ic.surveillance', 'order' => 2],
            ['title' => 'อุบัติการณ์', 'icon' => 'AlertTriangle', 'route' => 'ic.incidents', 'order' => 3],
            ['title' => 'ล้างมือ', 'icon' => 'Hand', 'route' => 'ic.hand-hygiene', 'order' => 4],
            ['title' => 'Device Days', 'icon' => 'Calendar', 'route' => 'ic.device-days', 'order' => 5],
            ['title' => 'ยาปฏิชีวนะ', 'icon' => 'Pill', 'route' => 'ic.antibiotic', 'order' => 6],
            ['title' => 'การระบาด', 'icon' => 'Siren', 'route' => 'ic.outbreak', 'order' => 7],
            ['title' => 'สิ่งแวดล้อม IC', 'icon' => 'Microscope', 'route' => 'ic.environment', 'order' => 8],
            ['title' => 'อบรม IC', 'icon' => 'GraduationCap', 'route' => 'ic.education', 'order' => 9],
            ['title' => 'รายงาน IC', 'icon' => 'FileBarChart', 'route' => 'ic.reports', 'order' => 10],
        ], 'IC');

        $this->syncGroup($quality, ['งานสารสนเทศ (IM)', 'IM'], 'งานสารสนเทศ (IM)', 'MonitorCog', 7, [
            ['title' => 'ภาพรวม IM', 'icon' => 'LayoutDashboard', 'route' => 'im.index', 'order' => 1],
            ['title' => 'แผนแม่บท IT', 'icon' => 'Target', 'route' => 'im.master-plan', 'order' => 2],
            ['title' => 'บริหารความเสี่ยง IT', 'icon' => 'ShieldAlert', 'route' => 'im.risk', 'order' => 3],
            ['title' => 'ความปลอดภัย/PDPA/BCP', 'icon' => 'Lock', 'route' => 'im.security', 'order' => 4],
            ['title' => 'Service Desk', 'icon' => 'Headset', 'route' => 'im.service-desk', 'order' => 5],
            ['title' => 'ประเมินเจ้าหน้าที่ IT', 'icon' => 'ClipboardCheck', 'route' => 'im.service-desk.evaluation', 'order' => 6],
            ['title' => 'คุณภาพเวชระเบียน', 'icon' => 'FileCheck', 'route' => 'im.medical-record', 'order' => 7],
            ['title' => 'คุณภาพพัฒนาโปรแกรม', 'icon' => 'Code2', 'route' => 'im.software-qa', 'order' => 8],
            ['title' => 'ทรัพยากร/Change', 'icon' => 'Server', 'route' => 'im.resource', 'order' => 9],
            ['title' => 'คู่มือ IM', 'icon' => 'BookOpen', 'route' => 'im.manual', 'order' => 10],
        ], 'งานสารสนเทศ (IM)');

        $this->syncGroup($quality, [
            'เภสัชกรรม', 'Pharmacy', 'รายงาน RDU', 'RDU Reports',
        ], 'เภสัชกรรม', 'Pill', 8, [
            ['title' => 'ภาพรวมเภสัชกรรม', 'icon' => 'LayoutDashboard', 'route' => 'pharmacy.index', 'order' => 1],
            ['title' => 'คลังยา / ห้องยา', 'icon' => 'Warehouse', 'route' => 'pharmacy.inventory.index', 'order' => 2],
            ['title' => 'แจ้งเตือนการใช้ยา', 'icon' => 'AlertTriangle', 'route' => 'pharmacy.drug-alerts', 'order' => 3],
            ['title' => 'ตัวชี้วัด RDU', 'icon' => 'Activity', 'route' => 'rdu.index', 'order' => 4],
            ['title' => 'Case Audit', 'icon' => 'ClipboardList', 'route' => 'rdu.cases', 'order' => 5],
            ['title' => 'การใช้ยารวม', 'icon' => 'Pill', 'route' => 'rdu.drugs', 'order' => 6],
            ['title' => 'ยาปฏิชีวนะ', 'icon' => 'Syringe', 'route' => 'rdu.drugs.antibiotics', 'order' => 7],
            ['title' => 'ตามแผนก/แพทย์', 'icon' => 'Building2', 'route' => 'rdu.drugs.by-department', 'order' => 8],
            ['title' => 'ภาพรวมการใช้ยา', 'icon' => 'LayoutDashboard', 'route' => 'drug-usage.index', 'order' => 9],
            ['title' => 'รายงานรายการยา', 'icon' => 'ClipboardList', 'route' => 'drug-usage.report', 'order' => 10],
        ], 'เภสัชกรรม');

        // Remove legacy drug-usage group under Quality (now under Pharmacy).
        Menu::query()
            ->where('parent_id', $quality->id)
            ->where('title', 'รายงานยาและการใช้ยา')
            ->get()
            ->each(function (Menu $menu) {
                Menu::where('parent_id', $menu->id)->delete();
                $menu->delete();
            });

        $this->syncGroup($quality, [
            'ระบบสิ่งแวดล้อม', 'Environment & Safety', 'ENV', 'สิ่งแวดล้อมและความปลอดภัย',
        ], 'สิ่งแวดล้อมและความปลอดภัย', 'Leaf', 10, [
            ['title' => 'ภาพรวม ENV', 'icon' => 'LayoutDashboard', 'route' => 'env.index', 'order' => 1],
            ['title' => 'ทะเบียนครุภัณฑ์', 'icon' => 'Box', 'route' => 'env.assets.index', 'order' => 2],
            ['title' => 'รายงานแยกสาย', 'icon' => 'FileSpreadsheet', 'route' => 'env.assets.report', 'order' => 3],
            ['title' => 'สาธารณูปโภค', 'icon' => 'Droplets', 'route' => 'env.utilities.index', 'order' => 4],
            ['title' => 'แผนบำรุงรักษา (PM)', 'icon' => 'Wrench', 'route' => 'env.pm.index', 'order' => 5],
            ['title' => 'รายงานอุบัติการณ์', 'icon' => 'AlertTriangle', 'route' => 'env.incidents.index', 'order' => 6],
        ], 'ระบบสิ่งแวดล้อม');

        $this->syncGroup($quality, [
            'การจัดการความรู้', 'KM (Knowledge Management)', 'Knowledge Management',
        ], 'การจัดการความรู้', 'GraduationCap', 11, [
            ['title' => 'ภาพรวม KM', 'icon' => 'LayoutDashboard', 'route' => 'km.dashboard', 'order' => 1],
            ['title' => 'คลังความรู้', 'icon' => 'FileText', 'route' => 'km.assets.index', 'order' => 2],
            ['title' => 'เพิ่มความรู้', 'icon' => 'Upload', 'route' => 'km.assets.create', 'order' => 3],
            ['title' => 'E-Learning', 'icon' => 'GraduationCap', 'route' => 'km.learn.dashboard', 'order' => 4],
        ], 'การจัดการความรู้');

        $this->syncGroup($quality, ['พัฒนาบุคลากร', 'HRD', 'Human Resource Development'], 'พัฒนาบุคลากร (HRD)', 'Users', 12, [
            ['title' => 'ภาพรวมการอบรม', 'icon' => 'LayoutDashboard', 'route' => 'km.learn.dashboard', 'order' => 1],
            ['title' => 'หลักสูตร', 'icon' => 'BookOpen', 'route' => 'km.learn.courses.index', 'order' => 2],
            ['title' => 'การอบรมของฉัน', 'icon' => 'User', 'route' => 'km.learn.my-training', 'order' => 3],
            ['title' => 'สมรรถนะของฉัน', 'icon' => 'Star', 'route' => 'km.learn.my-skills', 'order' => 4],
        ], 'พัฒนาบุคลากร');

        $this->moveStaleLeaves($quality, [
            'quality-docs.index', 'quality-indicators.index', 'mra.index', 'ic.index',
            'im.index', 'pharmacy.index', 'rdu.index', 'drug-usage.index', 'env.index', 'km.dashboard',
        ]);
        $this->syncChildren($admin, [
            ['title' => 'ภาพรวมงานธุรการ', 'icon' => 'Home', 'route' => 'admin.hub', 'order' => 1],
        ], 'งานธุรการ', false);

        $this->syncGroup($admin, ['จองห้องประชุม', 'Meeting Room Booking', 'ระบบจองห้อง'], 'จองห้องประชุม', 'DoorOpen', 2, [
            ['title' => 'เลือกห้อง', 'icon' => 'LayoutGrid', 'route' => 'rooms.index', 'order' => 1],
            ['title' => 'รายการจอง', 'icon' => 'ClipboardList', 'route' => 'rooms.bookings', 'order' => 2],
            ['title' => 'การจองของฉัน', 'icon' => 'User', 'route' => 'rooms.my', 'order' => 3],
            ['title' => 'ปฏิทินห้องประชุม', 'icon' => 'CalendarDays', 'route' => 'rooms.calendar', 'order' => 4],
            ['title' => 'ตั้งค่าห้อง', 'icon' => 'Settings2', 'route' => 'rooms.settings', 'order' => 5],
        ], 'จองห้องประชุม');

        $this->syncGroup($admin, ['ระบบแจ้งซ่อม', 'Maintenance'], 'ระบบแจ้งซ่อม', 'Wrench', 3, [
            ['title' => 'ภาพรวมแจ้งซ่อม', 'icon' => 'LayoutDashboard', 'route' => 'maintenance.dashboard', 'order' => 1],
            ['title' => 'รายการแจ้งซ่อม', 'icon' => 'ClipboardList', 'route' => 'maintenance.requests.index', 'order' => 2],
            ['title' => 'รายการของฉัน', 'icon' => 'User', 'route' => 'maintenance.requests.my', 'order' => 3],
            ['title' => 'ใบงานช่าง', 'icon' => 'Wrench', 'route' => 'technician.work-orders.index', 'order' => 4],
            ['title' => 'ตั้งค่าแจ้งซ่อม', 'icon' => 'Settings2', 'route' => 'maintenance.settings.index', 'order' => 5],
        ], 'ระบบแจ้งซ่อม');

        $this->syncGroup($admin, ['ระบบจองรถ', 'Vehicle Booking'], 'ระบบจองรถ', 'Car', 4, [
            ['title' => 'เลือกรถ', 'icon' => 'LayoutGrid', 'route' => 'vehicles.index', 'order' => 1],
            ['title' => 'รายการจองรถ', 'icon' => 'ClipboardList', 'route' => 'vehicles.bookings.index', 'order' => 2],
            ['title' => 'การจองรถของฉัน', 'icon' => 'User', 'route' => 'vehicles.bookings.my', 'order' => 3],
            ['title' => 'ปฏิทินการใช้รถ', 'icon' => 'CalendarDays', 'route' => 'vehicles.calendar', 'order' => 4],
            ['title' => 'ตั้งค่ารถ', 'icon' => 'Settings2', 'route' => 'vehicles.settings.index', 'order' => 5],
        ], 'ระบบจองรถ');

        $this->syncGroup($admin, [
            'ระบบรับส่งหนังสือ', 'ระบบหนังสือ', 'Document Management',
        ], 'ระบบรับส่งหนังสือ', 'Mail', 5, [
            ['title' => 'ภาพรวมหนังสือ', 'icon' => 'LayoutDashboard', 'route' => 'documents.dashboard', 'order' => 1],
            ['title' => 'กล่องรับ', 'icon' => 'Inbox', 'route' => 'documents.inbox', 'order' => 2],
            ['title' => 'กล่องส่ง', 'icon' => 'FileOutput', 'route' => 'documents.outbox', 'order' => 3],
            ['title' => 'รายการหนังสือ', 'icon' => 'ClipboardList', 'route' => 'documents.index', 'order' => 4],
            ['title' => 'รับหนังสือเข้า', 'icon' => 'FilePlus2', 'route' => 'documents.create', 'order' => 5],
            ['title' => 'ระหว่างนำเรียน', 'icon' => 'FileText', 'route' => 'documents.pendingReview', 'order' => 6],
            ['title' => 'กล่องงาน ผอ.', 'icon' => 'FileSignature', 'route' => 'documents.director.index', 'order' => 7],
        ], 'ระบบรับส่งหนังสือ');

        $this->syncGroup($admin, ['ระบบยืมอุปกรณ์แพทย์', 'Medical Equipment Borrowing'], 'ระบบยืมอุปกรณ์แพทย์', 'Stethoscope', 6, [
            ['title' => 'เลือกอุปกรณ์', 'icon' => 'LayoutGrid', 'route' => 'equipment-borrowing.dashboard', 'order' => 1],
            ['title' => 'รายการยืม', 'icon' => 'ClipboardList', 'route' => 'equipment-borrowing.borrowings.index', 'order' => 2],
            ['title' => 'การยืมของฉัน', 'icon' => 'User', 'route' => 'equipment-borrowing.borrowings.my', 'order' => 3],
            ['title' => 'จัดการอุปกรณ์', 'icon' => 'Package', 'route' => 'equipment-borrowing.equipment.index', 'order' => 4],
            ['title' => 'ตั้งค่าอุปกรณ์', 'icon' => 'Settings2', 'route' => 'equipment-borrowing.settings.index', 'order' => 5],
        ], 'ระบบยืมอุปกรณ์แพทย์');

        $this->syncGroup($admin, ['ระบบบันทึกการลา', 'Leave'], 'ระบบบันทึกการลา', 'ClipboardList', 7, [
            ['title' => 'ภาพรวมการลา', 'icon' => 'LayoutDashboard', 'route' => 'leave.index', 'order' => 1],
            ['title' => 'ยื่นใบลา', 'icon' => 'Plus', 'route' => 'leave.create', 'order' => 2],
        ], 'ระบบบันทึกการลา');

        $this->moveStaleLeaves($admin, [
            'rooms.index', 'rooms.calendar', 'maintenance.dashboard', 'vehicles.index',
            'documents.dashboard', 'equipment-borrowing.dashboard', 'leave.index',
        ]);

        $techRoot = Menu::query()
            ->whereNull('parent_id')
            ->whereIn('title', ['ใบงานช่าง', 'Technician'])
            ->first();
        if ($techRoot) {
            Menu::where('parent_id', $techRoot->id)->delete();
            $techRoot->delete();
        }

        $this->command?->info('ซิงก์เมนูย่อยใน sidebar ตามโมดูลเรียบร้อยแล้ว');
    }

    /**
     * @param  list<string>  $titles
     * @param  list<string>  $routes
     */
    private function ensureGroup(?int $parentId, array $titles, string $title, string $icon, int $order, array $routes = []): Menu
    {
        $menu = Menu::query()
            ->where(function ($q) use ($titles, $routes) {
                foreach ($titles as $name) {
                    $q->orWhere('title', $name);
                }
                foreach ($routes as $route) {
                    $q->orWhere('route', $route);
                }
            })
            ->when($parentId === null, fn ($q) => $q->whereNull('parent_id'))
            ->first();

        $data = [
            'title' => $title,
            'icon' => $icon,
            'route' => null,
            'parent_id' => $parentId,
            'order' => $order,
            'permission_name' => null,
        ];

        if ($menu) {
            $menu->update($data);

            return $menu;
        }

        return Menu::create($data);
    }

    /**
     * @param  list<string>  $titles
     * @param  list<array{title:string,icon:string,route:string,order:int}>  $children
     */
    private function syncGroup(
        Menu $parent,
        array $titles,
        string $title,
        string $icon,
        int $order,
        array $children,
        string $permissionGroup
    ): void {
        $group = Menu::query()
            ->where(function ($q) use ($titles, $title) {
                foreach (array_merge($titles, [$title]) as $name) {
                    $q->orWhere('title', $name);
                }
            })
            ->first();

        $data = [
            'title' => $title,
            'icon' => $icon,
            'route' => null,
            'parent_id' => $parent->id,
            'order' => $order,
            'permission_name' => null,
        ];

        $group = $group ? tap($group)->update($data) : Menu::create($data);
        $this->syncChildren($group, $children, $permissionGroup);
    }

    /**
     * @param  list<array{title:string,icon:string,route:string,order:int}>  $children
     */
    private function syncChildren(Menu $parent, array $children, string $permissionGroup, bool $deleteStale = true): void
    {
        $validRoutes = collect($children)->pluck('route')->all();

        if ($deleteStale) {
            Menu::where('parent_id', $parent->id)
                ->whereNotNull('route')
                ->whereNotIn('route', $validRoutes)
                ->delete();
        }

        foreach ($children as $child) {
            Menu::updateOrCreate(
                ['parent_id' => $parent->id, 'route' => $child['route']],
                [
                    'title' => $child['title'],
                    'icon' => $child['icon'],
                    'order' => $child['order'],
                    'permission_name' => $child['route'],
                ]
            );

            $this->ensurePermission($child['route'], $permissionGroup);
        }
    }

    /**
     * @param  list<string>  $routes
     */
    private function moveStaleLeaves(Menu $parent, array $routes): void
    {
        Menu::where('parent_id', $parent->id)
            ->whereIn('route', $routes)
            ->delete();
    }

    private function ensurePermission(string $name, string $group): void
    {
        $permission = Permission::firstOrCreate(
            ['name' => $name, 'guard_name' => 'web'],
            ['group' => $group]
        );

        if ($permission->group !== $group) {
            $permission->update(['group' => $group]);
        }

        foreach (['admin', 'Admin', 'user', 'header', 'Header'] as $roleName) {
            $role = Role::where('name', $roleName)->first();
            if ($role && ! $role->hasPermissionTo($permission)) {
                $role->givePermissionTo($permission);
            }
        }
    }
}
