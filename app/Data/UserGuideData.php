<?php

namespace App\Data;

class UserGuideData
{
    public static function appName(): string
    {
        return config('app.name', 'SMH Hospital Dashboard');
    }

    public static function quickStart(): array
    {
        return [
            ['step' => 1, 'title' => 'เข้าสู่ระบบ', 'description' => 'เปิดเว็บโรงพยาบาล → กรอกอีเมล/รหัสผ่าน → กดเข้าสู่ระบบ (หรือใช้ LINE)'],
            ['step' => 2, 'title' => 'ค้นหาเมนู', 'description' => 'ดูแถบซ้าย → พิมพ์ชื่อระบบในช่อง "ค้นหาเมนู..." เช่น "แจ้งซ่อม"'],
            ['step' => 3, 'title' => 'เลือกระบบงาน', 'description' => 'คลิกเมนูที่ต้องการ → ถ้ามีเมนูย่อย คลิกลูกศรเพื่อขยาย → เลือกรายการ'],
            ['step' => 4, 'title' => 'ตรวจสอบแจ้งเตือน', 'description' => 'ดูไอคอนกระดิ่งมุมบนขวา → คลิกเพื่อดูงานค้าง → กดลิงก์เพื่อไปทำงานนั้น'],
        ];
    }

    public static function modulesEnriched(): array
    {
        $meta = include __DIR__.'/user-guide-meta.php';

        return array_map(function (array $module) use ($meta) {
            $id = $module['id'] ?? null;
            if ($id && isset($meta[$id])) {
                $module = array_merge($module, $meta[$id]);
            }

            return $module;
        }, self::modules());
    }

    public static function categories(): array
    {
        return [
            'start' => ['label' => 'เริ่มต้นใช้งาน', 'color' => '#7C3AED'],
            'dashboard' => ['label' => 'แดชบอร์ด & รายงาน', 'color' => '#6D28D9'],
            'quality' => ['label' => 'ศูนย์พัฒนาคุณภาพ', 'color' => '#5B21B6'],
            'admin' => ['label' => 'งานธุรการ', 'color' => '#4C1D95'],
            'operations' => ['label' => 'งานประจำวัน', 'color' => '#7E22CE'],
            'km' => ['label' => 'ความรู้ & อบรม', 'color' => '#9333EA'],
            'system' => ['label' => 'ตั้งค่าระบบ', 'color' => '#64748B'],
        ];
    }

    public static function modules(): array
    {
        return [
            [
                'id' => 'login',
                'category' => 'start',
                'title' => 'การเข้าสู่ระบบ',
                'subtitle' => 'วิธี login และตั้งค่าโปรไฟล์ครั้งแรก',
                'audience' => 'ผู้ใช้ทุกคน',
                'path' => '/login',
                'illus' => 'login',
                'features' => ['สมัครสมาชิกใหม่ต้องใช้ LINE', 'เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน (บัญชีเดิม)', 'เข้าสู่ระบบด้วย LINE', 'กรอกโปรไฟล์ครั้งแรก', 'เปลี่ยนรหัสผ่านและธีม'],
                'steps' => [
                    ['title' => 'เปิดหน้า Login', 'description' => 'ระบบจะนำไปหน้าเข้าสู่ระบบอัตโนมัติ'],
                    ['title' => 'บัญชีเดิม', 'description' => 'ใส่อีเมล/รหัสผ่าน หรือกด LINE Login'],
                    ['title' => 'สมัครใหม่', 'description' => 'กดสมัครสมาชิกด้วย LINE แล้วกรอกเลขบัตรและแผนกในหน้าโปรไฟล์ครั้งแรก'],
                    ['title' => 'เข้าแดชบอร์ด', 'description' => 'เมื่อสำเร็จจะเข้าหน้าหลัก'],
                ],
                'tips' => ['แก้ไขโปรไฟล์ได้ที่เมนูผู้ใช้มุมล่างซ้าย', 'ลืมรหัสผ่านใช้ลิงก์บนหน้า Login'],
            ],
            [
                'id' => 'navigation',
                'category' => 'start',
                'title' => 'การใช้งาน Sidebar และเมนู',
                'subtitle' => 'ค้นหาและเข้าใช้งานเมนูต่างๆ',
                'audience' => 'ผู้ใช้ทุกคน',
                'path' => '/help',
                'illus' => 'sidebar',
                'features' => ['เมนูแบ่งกลุ่มตามระบบ', 'ค้นหาเมนูภาษาไทย', 'เมนูย่อยขยายได้', 'แสดงตามสิทธิ์'],
                'steps' => [
                    ['title' => 'ดู Sidebar', 'description' => 'เมนูด้านซ้ายแสดงระบบที่มีสิทธิ์'],
                    ['title' => 'ค้นหา', 'description' => 'พิมพ์ในช่องค้นหาเมนู'],
                    ['title' => 'ขยายเมนูย่อย', 'description' => 'คลิกเมนูที่มีลูกศร'],
                    ['title' => 'ย่อ Sidebar', 'description' => 'กดปุ่มสลับมุมบน'],
                ],
                'tips' => ['ไม่เห็นเมนู = ยังไม่มีสิทธิ์ ติดต่อผู้ดูแล'],
            ],
            [
                'id' => 'dashboard',
                'category' => 'dashboard',
                'title' => 'แดชบอร์ดหลัก',
                'subtitle' => 'สถิติผู้ป่วยและข้อมูล HOSxP',
                'audience' => 'ผู้บริหาร / เจ้าหน้าที่',
                'path' => '/dashboard',
                'illus' => 'dashboard',
                'features' => ['สถิติ OPD/IPD/ER', 'กรองช่วงวันที่', 'กราฟรายเดือน', 'Top 10 ICD-10', 'รายงาน CV Risk'],
                'steps' => [
                    ['title' => 'เข้าแดชบอร์ด', 'description' => 'คลิกเมนูแดชบอร์ด'],
                    ['title' => 'เลือกวันที่', 'description' => 'กำหนดช่วงเวลาแล้วกดแสดงข้อมูล'],
                    ['title' => 'ดูสรุป', 'description' => 'การ์ดและกราฟแสดงภาพรวม'],
                    ['title' => 'Export', 'description' => 'ดาวน์โหลดรายงาน CV Risk'],
                ],
                'tips' => ['ต้องตั้งค่าเชื่อมต่อ HOSxP ก่อน'],
            ],
            [
                'id' => 'hosxp-reports',
                'category' => 'dashboard',
                'title' => 'รายงาน HOSxP',
                'subtitle' => 'Export รายงานผู้ป่วย Lab ยา X-ray',
                'audience' => 'งานสถิติ / เวชระเบียน',
                'path' => '/hosxp-reports',
                'illus' => 'report',
                'features' => ['รายงาน OPD/IPD', 'Diagnosis, Lab, Drug, X-ray', 'กรองวันที่', 'Export Excel'],
                'steps' => [
                    ['title' => 'เลือกรายงาน', 'description' => 'คลิกประเภทรายงาน'],
                    ['title' => 'กำหนดเงื่อนไข', 'description' => 'เลือกช่วงวันที่'],
                    ['title' => 'Export', 'description' => 'ดาวน์โหลดไฟล์ Excel'],
                ],
            ],
            [
                'id' => 'finance',
                'category' => 'dashboard',
                'title' => 'รายงานการเงิน',
                'subtitle' => 'แดชบอร์ดการเงิน',
                'audience' => 'งานการเงิน',
                'path' => '/finance-dashboard',
                'illus' => 'finance',
                'features' => ['แดชบอร์ดการเงินแบบฝัง', 'เชื่อมระบบภายนอก'],
                'steps' => [
                    ['title' => 'เข้าเมนู', 'description' => 'คลิกรายงานการเงิน'],
                    ['title' => 'ดูข้อมูล', 'description' => 'รอระบบโหลดแดชบอร์ด'],
                ],
            ],
            [
                'id' => 'notifications',
                'category' => 'dashboard',
                'title' => 'การแจ้งเตือน',
                'subtitle' => 'รับข้อความและงานค้าง',
                'audience' => 'ผู้ใช้ทุกคน',
                'path' => '/notifications',
                'illus' => 'notification',
                'features' => ['แจ้งเตือนงานค้าง', 'Popup ด่วน', 'Mark as read'],
                'steps' => [
                    ['title' => 'ดูกระดิ่ง', 'description' => 'มุมบนของหน้าจอ'],
                    ['title' => 'เปิดรายการ', 'description' => 'คลิกดูรายละเอียด'],
                    ['title' => 'ไปยังงาน', 'description' => 'คลิกลิงก์ในแจ้งเตือน'],
                ],
            ],
            [
                'id' => 'quality-hub',
                'category' => 'quality',
                'title' => 'ศูนย์พัฒนาคุณภาพ',
                'subtitle' => 'ทางเข้าระบบงานคุณภาพทั้งหมด',
                'audience' => 'งานคุณภาพ',
                'path' => '/quality',
                'illus' => 'quality',
                'features' => ['ลิงก์รวมทุกระบบคุณภาพ', 'ภาพรวมงาน QA'],
                'steps' => [
                    ['title' => 'เข้าศูนย์พัฒนาคุณภาพ', 'description' => 'คลิกภาพรวมคุณภาพ'],
                    ['title' => 'เลือกระบบ', 'description' => 'คลิกการ์ด MRA, IC, KPI ฯลฯ'],
                ],
            ],
            [
                'id' => 'quality-docs',
                'category' => 'quality',
                'title' => 'คลังเอกสารคุณภาพ',
                'subtitle' => 'WI Procedure Policy',
                'audience' => 'งานคุณภาพ',
                'path' => '/quality-docs',
                'illus' => 'document',
                'features' => ['ค้นหาเอกสาร', 'สร้างและอัปโหลดเวอร์ชัน', 'Workflow อนุมัติ', 'ดาวน์โหลด'],
                'steps' => [
                    ['title' => 'ค้นหา', 'description' => 'กรองตามประเภท'],
                    ['title' => 'สร้างเอกสาร', 'description' => 'กรอกข้อมูลและแนบไฟล์'],
                    ['title' => 'ส่งอนุมัติ', 'description' => 'ส่งให้ผู้อนุมัติ'],
                    ['title' => 'อนุมัติ/ปฏิเสธ', 'description' => 'ผู้อนุมัติดำเนินการ'],
                ],
            ],
            [
                'id' => 'quality-kpi',
                'category' => 'quality',
                'title' => 'ตัวชี้วัดคุณภาพ (KPI)',
                'subtitle' => 'องค์กร แผนก ทีม HA',
                'audience' => 'งานคุณภาพ / หัวหน้าแผนก',
                'path' => '/quality-indicators',
                'illus' => 'kpi',
                'features' => ['KPI 3 ระดับ', 'บันทึกค่ารายงวด', 'Dashboard สรุป'],
                'steps' => [
                    ['title' => 'เลือกระดับ', 'description' => 'Organization / Department / HA'],
                    ['title' => 'สร้างตัวชี้วัด', 'description' => 'กำหนดเป้าหมาย'],
                    ['title' => 'บันทึกค่า', 'description' => 'กรอกค่าจริง'],
                ],
            ],
            [
                'id' => 'quality-qa',
                'category' => 'quality',
                'title' => 'การติดตามทบทวน (QA)',
                'subtitle' => 'Review Audit Improvement',
                'audience' => 'งานคุณภาพ',
                'path' => '/quality-assurance',
                'illus' => 'qa',
                'features' => ['Review', 'Audit', 'Improvement plan'],
                'steps' => [
                    ['title' => 'เลือกประเภท', 'description' => 'Review / Audit / Improvement'],
                    ['title' => 'สร้างรายการ', 'description' => 'กรอกรายละเอียด'],
                    ['title' => 'ติดตาม', 'description' => 'อัปเดตสถานะ'],
                ],
            ],
            [
                'id' => 'mra',
                'category' => 'quality',
                'title' => 'MRA — ความถูกต้องเวชระเบียน',
                'subtitle' => 'ตรวจสอบเวชระเบียนจาก HOSxP',
                'audience' => 'งานคุณภาพ / เวชระเบียน',
                'path' => '/mra',
                'illus' => 'mra',
                'features' => ['ค้นหาผู้ป่วย', 'Checklist ตรวจ', 'Auto-check', 'Dashboard/Reports', 'คู่มือใช้งาน'],
                'steps' => [
                    ['title' => 'ค้นหา', 'description' => 'HN/VN หรือ Visit'],
                    ['title' => 'สร้างการตรวจ', 'description' => 'เลือก Visit'],
                    ['title' => 'กรอก Checklist', 'description' => 'ตรวจแต่ละข้อ'],
                    ['title' => 'ดูรายงาน', 'description' => 'Dashboard และ Reports'],
                ],
                'tips' => ['อ่านคู่มือฉบับเต็มได้ที่ /mra/guide'],
            ],
            [
                'id' => 'ic',
                'category' => 'quality',
                'title' => 'IC — การควบคุมการติดเชื้อ',
                'subtitle' => 'เฝ้าระวัง Hand Hygiene อุบัติการณ์',
                'audience' => 'คณะทำงาน IC',
                'path' => '/ic',
                'illus' => 'ic',
                'features' => ['Surveillance', 'Incidents', 'Hand Hygiene', 'Environment', 'Antibiotic', 'Reports'],
                'steps' => [
                    ['title' => 'Dashboard', 'description' => 'ดูภาพรวม'],
                    ['title' => 'บันทึกข้อมูล', 'description' => 'เลือกเมนูย่อย'],
                    ['title' => 'รายงาน', 'description' => 'Export จาก Reports'],
                ],
            ],
            [
                'id' => 'env',
                'category' => 'quality',
                'title' => 'ENV — ระบบสิ่งแวดล้อม',
                'subtitle' => 'ทรัพย์สิน PM เหตุการณ์ สาธารณูปโภค',
                'audience' => 'งานอาคารสถานที่',
                'path' => '/env',
                'illus' => 'env',
                'features' => ['ทรัพย์สิน', 'PM Tracking', 'เหตุการณ์', 'ตรวจสาธารณูปโภค'],
                'steps' => [
                    ['title' => 'ภาพรวม ENV', 'description' => 'ดู Dashboard'],
                    ['title' => 'จัดการทรัพย์สิน', 'description' => 'เพิ่ม/แก้ไข'],
                    ['title' => 'PM และเหตุการณ์', 'description' => 'บันทึกตามแผน'],
                ],
            ],
            [
                'id' => 'admin-hub',
                'category' => 'admin',
                'title' => 'ศูนย์งานธุรการ',
                'subtitle' => 'ทางลัดงานธุรการ',
                'audience' => 'เจ้าหน้าที่ธุรการ',
                'path' => '/admin-hub',
                'illus' => 'admin',
                'features' => ['ลิงก์ห้องประชุม จองรถ หนังสือ'],
                'steps' => [
                    ['title' => 'เข้า Admin Hub', 'description' => 'ภาพรวมธุรการ'],
                    ['title' => 'เลือกระบบ', 'description' => 'คลิกการ์ดที่ต้องการ'],
                ],
            ],
            [
                'id' => 'rooms',
                'category' => 'admin',
                'title' => 'จองห้องประชุม',
                'subtitle' => 'จอง อนุมัติ ปฏิทิน',
                'audience' => 'ทุกแผนก',
                'path' => '/administration/rooms',
                'illus' => 'room',
                'features' => ['รายการห้อง', 'สร้างจอง', 'อนุมัติ', 'ปฏิทิน', 'การจองของฉัน'],
                'steps' => [
                    ['title' => 'เลือกห้อง', 'description' => 'ดูความจุ'],
                    ['title' => 'จอง', 'description' => 'วัน เวลา วัตถุประสงค์'],
                    ['title' => 'ติดตาม', 'description' => 'การจองของฉัน'],
                ],
            ],
            [
                'id' => 'vehicles',
                'category' => 'admin',
                'title' => 'ระบบจองรถ',
                'subtitle' => 'จองรถราชการ มอบหมายคนขับ',
                'audience' => 'ทุกแผนก / คนขับ',
                'path' => '/vehicles/bookings',
                'illus' => 'vehicle',
                'features' => ['สร้าง/ยกเลิกจอง', 'ปฏิทิน', 'มอบหมายคนขับ', 'จัดการ fleet'],
                'steps' => [
                    ['title' => 'สร้างจอง', 'description' => 'วันเวลา ปลายทาง'],
                    ['title' => 'ติดตาม', 'description' => 'การจองของฉัน'],
                    ['title' => 'มอบหมาย', 'description' => 'ผู้ดูแลเลือกคนขับและรถ'],
                ],
            ],
            [
                'id' => 'documents',
                'category' => 'admin',
                'title' => 'ระบบหนังสือราชการ',
                'subtitle' => 'ลงทะเบียน Workflow เวียน',
                'audience' => 'งานธุรการ',
                'path' => '/documents',
                'illus' => 'document',
                'features' => ['หนังสือเข้า-ออก', 'เวียน', 'Workflow', 'แจ้งเตือนค้าง'],
                'steps' => [
                    ['title' => 'Dashboard', 'description' => 'หนังสือค้าง'],
                    ['title' => 'สร้างหนังสือ', 'description' => 'กรอกข้อมูลแนบไฟล์'],
                    ['title' => 'Workflow', 'description' => 'ส่งต่อ อนุมัติ เวียน'],
                    ['title' => 'รับทราบ', 'description' => 'ผู้รับคลิกรับทราบ'],
                ],
            ],
            [
                'id' => 'maintenance',
                'category' => 'operations',
                'title' => 'ระบบแจ้งซ่อม',
                'subtitle' => 'แจ้งซ่อม ติดตาม ปิดงาน',
                'audience' => 'ทุกแผนก / หัวหน้าช่าง',
                'path' => '/maintenance/requests',
                'illus' => 'maintenance',
                'features' => ['สร้างใบแจ้งซ่อม', 'แนบรูป', 'มอบหมายช่าง', 'Dashboard'],
                'steps' => [
                    ['title' => 'แจ้งซ่อม', 'description' => 'หัวข้อ สถานที่ รูป'],
                    ['title' => 'ติดตาม', 'description' => 'แจ้งซ่อมของฉัน'],
                    ['title' => 'มอบหมาย', 'description' => 'หัวหน้าช่างเลือกช่าง'],
                    ['title' => 'ปิดงาน', 'description' => 'เมื่อซ่อมเสร็จ'],
                ],
            ],
            [
                'id' => 'technician',
                'category' => 'operations',
                'title' => 'ใบงานช่าง',
                'subtitle' => 'รับงาน อัปเดตสถานะ',
                'audience' => 'ช่าง / หัวหน้าช่าง',
                'path' => '/technician/work-orders',
                'illus' => 'technician',
                'features' => ['รับงาน', 'อัปเดตสถานะ', 'บันทึกผลซ่อม'],
                'steps' => [
                    ['title' => 'เปิดใบงาน', 'description' => 'เมนูสำหรับช่าง'],
                    ['title' => 'รับงาน', 'description' => 'คลิกรับงาน'],
                    ['title' => 'อัปเดต', 'description' => 'กำลังดำเนินการ/เสร็จ'],
                ],
                'tips' => ['ต้องมีตำแหน่งช่างหรือ role headtec'],
            ],
            [
                'id' => 'km',
                'category' => 'km',
                'title' => 'การจัดการความรู้ (KM)',
                'subtitle' => 'คลังความรู้',
                'audience' => 'ทุกแผนก',
                'path' => '/km/dashboard',
                'illus' => 'km',
                'features' => ['แดชบอร์ด KM', 'คลังเอกสาร', 'อัปโหลด/ค้นหา'],
                'steps' => [
                    ['title' => 'แดชบอร์ด', 'description' => 'ภาพรวม KM'],
                    ['title' => 'คลังความรู้', 'description' => 'ค้นหาและอัปโหลด'],
                ],
            ],
            [
                'id' => 'elearning',
                'category' => 'km',
                'title' => 'E-Learning / HRD',
                'subtitle' => 'คอร์สออนไลน์ Quiz อบรม',
                'audience' => 'ทุกคน / ผู้จัดการอบรม',
                'path' => '/km/learn',
                'illus' => 'elearning',
                'features' => ['ลงทะเบียนคอร์ส', 'เรียนออนไลน์', 'Quiz', 'การอบรมของฉัน'],
                'steps' => [
                    ['title' => 'เลือกคอร์ส', 'description' => 'E-Learning'],
                    ['title' => 'ลงทะเบียน', 'description' => 'กดลงทะเบียน'],
                    ['title' => 'เรียน', 'description' => 'บทเรียนและ Quiz'],
                ],
            ],
            [
                'id' => 'users-roles',
                'category' => 'system',
                'title' => 'จัดการผู้ใช้ บทบาท สิทธิ์',
                'subtitle' => 'ควบคุมการเข้าถึง',
                'audience' => 'Admin',
                'path' => '/users',
                'illus' => 'users',
                'features' => ['CRUD ผู้ใช้', 'บทบาท/สิทธิ์', 'จัดการเมนู'],
                'steps' => [
                    ['title' => 'สร้างผู้ใช้', 'description' => 'กำหนดบทบาท'],
                    ['title' => 'กำหนดสิทธิ์', 'description' => 'Permission + Role'],
                ],
            ],
            [
                'id' => 'org-settings',
                'category' => 'system',
                'title' => 'ตั้งค่าองค์กร & แอป',
                'subtitle' => 'ตำแหน่ง แผนก Logo HOSxP',
                'audience' => 'Admin',
                'path' => '/settingsapp',
                'illus' => 'settings',
                'features' => ['ตำแหน่ง/ทีม HA/แผนก', 'ชื่อ Logo ธีม', 'เชื่อมต่อ HOSxP'],
                'steps' => [
                    ['title' => 'ตั้งค่าองค์กร', 'description' => 'ตำแหน่ง แผนก ทีม HA'],
                    ['title' => 'ตั้งค่าแอป', 'description' => 'Logo สีธีม'],
                    ['title' => 'HOSxP', 'description' => 'ตั้งค่า DB และทดสอบ'],
                ],
            ],
            [
                'id' => 'backup-audit',
                'category' => 'system',
                'title' => 'สำรองข้อมูล & Audit Log',
                'subtitle' => 'Backup และประวัติการใช้งาน',
                'audience' => 'Admin',
                'path' => '/backup',
                'illus' => 'backup',
                'features' => ['Backup/Restore', 'Audit Log', 'ไฟล์ของฉัน'],
                'steps' => [
                    ['title' => 'สำรอง', 'description' => 'Run Backup'],
                    ['title' => 'กู้คืน', 'description' => 'เลือกไฟล์สำรอง'],
                    ['title' => 'Audit', 'description' => 'ดูประวัติ'],
                ],
                'tips' => ['สำรองข้อมูลก่อนอัปเดตระบบ'],
            ],
        ];
    }

    public static function faq(): array
    {
        return [
            ['question' => 'ทำไมไม่เห็นเมนูบางรายการ?', 'answer' => 'ระบบแสดงเฉพาะเมนูที่บัญชีของคุณมีสิทธิ์ ติดต่อผู้ดูแลระบบ (Admin) เพื่อขอเพิ่มสิทธิ์ตามตำแหน่งงาน'],
            ['question' => 'ลืมรหัสผ่านทำอย่างไร?', 'answer' => 'คลิก "ลืมรหัสผ่าน" บนหน้า Login แล้วทำตามขั้นตอนในอีเมล หรือให้ Admin รีเซ็ตรหัสผ่านให้'],
            ['question' => 'ข้อมูลแดชบอร์ดเป็น 0 หรือไม่แสดง?', 'answer' => 'ไปที่ ตั้งค่าแอป → ตั้งค่าฐานข้อมูล → กรอกข้อมูล HOSxP → กดทดสอบการเชื่อมต่อ'],
            ['question' => 'สมัครสมาชิกใหม่ต้องทำอย่างไร?', 'answer' => 'ต้องสมัครด้วย LINE เท่านั้น จากนั้นกรอกชื่อ อีเมล เลขบัตรประชาชน และแผนกในหน้าโปรไฟล์ครั้งแรก'],
            ['question' => 'เข้าด้วย LINE แล้วต้องทำอะไร?', 'answer' => 'กรอกชื่อ อีเมล และแผนกให้ครบในหน้าโปรไฟล์ครั้งแรก จากนั้นใช้งานได้ตามปกติ'],
            ['question' => 'ช่างไม่เห็นเมนูใบงานช่าง?', 'answer' => 'ต้องมีตำแหน่งช่าง (เช่น ช่างIT) หรือบทบาท headtec/admin ให้ Admin ตรวจสอบที่จัดการผู้ใช้'],
            ['question' => 'หน้าเว็บโหลดช้าหรือไม่มีสี?', 'answer' => 'ตรวจสอบว่าเซิร์ฟเวอร์ Vite (npm run dev) ทำงานอยู่ในโหมาดพัฒนา หรือรัน npm run build สำหรับโหมาดใช้งานจริง'],
            ['question' => 'จะดาวน์โหลดคู่มือ PDF ได้ที่ไหน?', 'answer' => 'เข้าเมนู คู่มือการใช้งาน (/help) แล้วกดปุ่มดาวน์โหลด PDF หรือเปิดไฟล์ในโฟลเดอร์ public/docs'],
        ];
    }
}
