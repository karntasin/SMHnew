import type { LucideIcon } from 'lucide-react';
import {
    LayoutDashboard,
    Award,
    Building2,
    Car,
    FileText,
    Wrench,
    HardHat,
    BookOpen,
    Leaf,
    Bell,
    Settings,
    LogIn,
    Search,
    ClipboardCheck,
    BarChart2,
    ShieldAlert,
    Activity,
    GraduationCap,
    Wallet,
    Database,
} from 'lucide-react';

export interface GuideStep {
    title: string;
    description: string;
}

export interface GuideModule {
    id: string;
    category: string;
    title: string;
    subtitle: string;
    icon: LucideIcon;
    gradient: string;
    href?: string;
    audience: string;
    features: string[];
    steps: GuideStep[];
    tips?: string[];
}

export interface GuideCategory {
    id: string;
    label: string;
    description: string;
    icon: LucideIcon;
}

export const guideCategories: GuideCategory[] = [
    {
        id: 'start',
        label: 'เริ่มต้นใช้งาน',
        description: 'เข้าสู่ระบบและทำความรู้จักหน้าจอหลัก',
        icon: LogIn,
    },
    {
        id: 'dashboard',
        label: 'แดชบอร์ด & รายงาน',
        description: 'สถิติ รายงาน HOSxP และการเงิน',
        icon: LayoutDashboard,
    },
    {
        id: 'quality',
        label: 'ศูนย์พัฒนาคุณภาพ',
        description: 'เอกสาร KPI QA MRA IC ENV',
        icon: Award,
    },
    {
        id: 'admin',
        label: 'งานธุรการ',
        description: 'ห้องประชุม จองรถ หนังสือราชการ',
        icon: Building2,
    },
    {
        id: 'operations',
        label: 'งานประจำวัน',
        description: 'แจ้งซ่อม ใบงานช่าง แจ้งเตือน',
        icon: Wrench,
    },
    {
        id: 'km',
        label: 'ความรู้ & อบรม',
        description: 'คลังความรู้ E-Learning HRD',
        icon: GraduationCap,
    },
    {
        id: 'system',
        label: 'ตั้งค่าระบบ',
        description: 'ผู้ใช้ สิทธิ์ สำรองข้อมูล (ผู้ดูแล)',
        icon: Settings,
    },
];

export const quickStartSteps = [
    {
        step: 1,
        title: 'เข้าสู่ระบบ',
        description: 'ใช้อีเมล/รหัสผ่าน หรือ LINE Login ที่หน้าเข้าสู่ระบบ',
    },
    {
        step: 2,
        title: 'ค้นหาเมนู',
        description: 'พิมพ์ชื่อเมนูในช่องค้นหาที่ Sidebar ด้านซ้าย',
    },
    {
        step: 3,
        title: 'เลือกระบบงาน',
        description: 'คลิกเมนูหลักหรือเมนูย่อยเพื่อเข้าสู่ระบบที่ต้องการ',
    },
    {
        step: 4,
        title: 'ตรวจสอบแจ้งเตือน',
        description: 'ดูไอคอนกระดิ่งมุมบน สำหรับงานค้างและข้อความสำคัญ',
    },
];

export const guideModules: GuideModule[] = [
    // ── เริ่มต้น ──
    {
        id: 'login',
        category: 'start',
        title: 'การเข้าสู่ระบบ',
        subtitle: 'วิธี login และตั้งค่าโปรไฟล์ครั้งแรก',
        icon: LogIn,
        gradient: 'from-violet-600 to-purple-700',
        href: '/login',
        audience: 'ผู้ใช้ทุกคน',
        features: [
            'เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน',
            'เข้าสู่ระบบด้วย LINE (สำหรับบัญชีที่ผูกแล้ว)',
            'กรอกข้อมูลโปรไฟล์ครั้งแรกหลัง LINE Login',
            'เปลี่ยนรหัสผ่านและตั้งค่าธีมส่วนตัว',
        ],
        steps: [
            { title: 'เปิดหน้าเข้าสู่ระบบ', description: 'ไปที่หน้าแรกของระบบ จะถูกนำไปยังหน้า Login อัตโนมัติ' },
            { title: 'กรอกข้อมูล', description: 'ใส่อีเมลและรหัสผ่าน หรือกดปุ่ม LINE Login' },
            { title: 'กรอกโปรไฟล์ (ครั้งแรก)', description: 'หากใช้ LINE ครั้งแรก ให้กรอกชื่อ อีเมล และแผนกให้ครบ' },
            { title: 'เข้าสู่แดชบอร์ด', description: 'เมื่อสำเร็จ ระบบจะพาไปหน้าแดชบอร์ดหลัก' },
        ],
        tips: [
            'แก้ไขโปรไฟล์ได้ที่เมนูผู้ใช้มุมล่างซ้าย → ตั้งค่าโปรไฟล์',
            'หากลืมรหัสผ่าน ใช้ลิงก์ "ลืมรหัสผ่าน" บนหน้า Login',
        ],
    },
    {
        id: 'navigation',
        category: 'start',
        title: 'การใช้งาน Sidebar และเมนู',
        subtitle: 'วิธีค้นหาและเข้าใช้งานเมนูต่างๆ',
        icon: Search,
        gradient: 'from-purple-600 to-fuchsia-600',
        audience: 'ผู้ใช้ทุกคน',
        features: [
            'เมนูแบ่งเป็นกลุ่มตามระบบงาน',
            'ค้นหาเมนูด้วยชื่อภาษาไทย',
            'เมนูย่อยขยาย/ยุบได้',
            'แสดงเฉพาะเมนูที่มีสิทธิ์เข้าถึง',
        ],
        steps: [
            { title: 'ดูเมนูด้านซ้าย', description: 'Sidebar แสดงเมนูทั้งหมดที่คุณมีสิทธิ์ใช้งาน' },
            { title: 'ค้นหาเมนู', description: 'พิมพ์ในช่อง "ค้นหาเมนู..." เพื่อกรองเมนูที่ต้องการ' },
            { title: 'คลิกเมนูหลัก', description: 'เมนูที่มีลูกศรสามารถขยายดูเมนูย่อยได้' },
            { title: 'ย่อ Sidebar', description: 'กดปุ่มสลับ Sidebar มุมบนเพื่อย่อเหลือไอคอน' },
        ],
        tips: [
            'เมนูที่ไม่เห็น อาจเป็นเพราะยังไม่ได้รับสิทธิ์ — ติดต่อผู้ดูแลระบบ',
            'ใช้คู่มือนี้ค้นหาระบบงานก่อน แล้วค่อยไปที่เมนูจริง',
        ],
    },

    // ── แดชบอร์ด & รายงาน ──
    {
        id: 'dashboard',
        category: 'dashboard',
        title: 'แดชบอร์ดหลัก',
        subtitle: 'ภาพรวมสถิติผู้ป่วยและข้อมูล HOSxP',
        icon: LayoutDashboard,
        gradient: 'from-violet-700 to-purple-800',
        href: '/dashboard',
        audience: 'ผู้บริหาร เจ้าหน้าที่ที่ได้รับสิทธิ์',
        features: [
            'สถิติ OPD / IPD / ER แบบเรียลไทม์',
            'กรองข้อมูลตามช่วงวันที่',
            'กราฟผู้มารับบริการรายเดือน',
            'Top 10 โรค (ICD-10) และรายงาน CV Risk',
        ],
        steps: [
            { title: 'เข้าเมนูแดชบอร์ด', description: 'คลิก "แดชบอร์ด" ที่เมนูด้านซ้าย' },
            { title: 'เลือกช่วงวันที่', description: 'กำหนดวันเริ่มต้นและวันสิ้นสุด แล้วกด "แสดงข้อมูล"' },
            { title: 'ดูสรุปตัวเลข', description: 'การ์ดสรุปแสดงจำนวนผู้ป่วยนอก ผู้ป่วยใน และอื่นๆ' },
            { title: 'Export รายงาน', description: 'ดาวน์โหลดรายงาน CV Risk ได้จากส่วนรายงาน' },
        ],
        tips: ['ข้อมูลมาจาก HOSxP — ต้องตั้งค่าการเชื่อมต่อฐานข้อมูลก่อน'],
    },
    {
        id: 'hosxp-reports',
        category: 'dashboard',
        title: 'รายงาน HOSxP',
        subtitle: 'ดึงรายงานผู้ป่วย Lab ยา X-ray เป็น Excel',
        icon: Database,
        gradient: 'from-indigo-600 to-violet-700',
        href: '/hosxp-reports',
        audience: 'เจ้าหน้าที่สถิติ / งานเวชระเบียน',
        features: [
            'รายงานผู้ป่วย OPD / IPD',
            'รายงาน Diagnosis, Lab, Drug, X-ray',
            'กรองตามวันที่',
            'Export เป็นไฟล์ Excel',
        ],
        steps: [
            { title: 'เข้าเมนูรายงาน HOSxP', description: 'เลือกจาก Sidebar หรือค้นหา "รายงาน HOSxP"' },
            { title: 'เลือกประเภทรายงาน', description: 'คลิกการ์ดรายงานที่ต้องการ เช่น Lab หรือ Drug' },
            { title: 'กำหนดเงื่อนไข', description: 'เลือกช่วงวันที่และตัวกรองเพิ่มเติม (ถ้ามี)' },
            { title: 'Export', description: 'กดปุ่ม Export เพื่อดาวน์โหลดไฟล์' },
        ],
    },
    {
        id: 'finance',
        category: 'dashboard',
        title: 'รายงานการเงิน',
        subtitle: 'แดชบอร์ดการเงินจากระบบภายนอก',
        icon: Wallet,
        gradient: 'from-emerald-600 to-teal-700',
        href: '/finance-dashboard',
        audience: 'งานการเงิน / ผู้บริหาร',
        features: ['แสดงแดชบอร์ดการเงินแบบฝัง (iframe)', 'เชื่อมข้อมูลจากระบบการเงินโรงพยาบาล'],
        steps: [
            { title: 'เข้าเมนูรายงานการเงิน', description: 'คลิก "รายงานการเงิน" ใน Sidebar' },
            { title: 'รอโหลดข้อมูล', description: 'ระบบจะแสดงแดชบอร์ดการเงินภายใน' },
        ],
        tips: ['หากหน้าว่าง ตรวจสอบการเชื่อมต่อ HOSxP API กับผู้ดูแลระบบ'],
    },
    {
        id: 'notifications',
        category: 'dashboard',
        title: 'การแจ้งเตือน',
        subtitle: 'รับและจัดการข้อความแจ้งเตือนจากระบบ',
        icon: Bell,
        gradient: 'from-amber-500 to-orange-600',
        href: '/notifications',
        audience: 'ผู้ใช้ทุกคน',
        features: [
            'แจ้งเตือนงานค้าง หนังสือรอดำเนินการ แจ้งซ่อม',
            'Popup แจ้งเตือนด่วน',
            'ทำเครื่องหมายว่าอ่านแล้ว / อ่านทั้งหมด',
        ],
        steps: [
            { title: 'ดูไอคอนกระดิ่ง', description: 'มุมบนของหน้าจอ แสดงจำนวนแจ้งเตือนที่ยังไม่อ่าน' },
            { title: 'เปิดรายการ', description: 'คลิกเพื่อดูรายละเอียดแต่ละรายการ' },
            { title: 'ไปยังงานที่เกี่ยวข้อง', description: 'คลิกลิงก์ในแจ้งเตือนเพื่อเปิดหน้างานนั้นโดยตรง' },
        ],
    },

    // ── ศูนย์พัฒนาคุณภาพ ──
    {
        id: 'quality-hub',
        category: 'quality',
        title: 'ศูนย์พัฒนาคุณภาพ',
        subtitle: 'ประตูเข้าสู่ระบบงานคุณภาพทั้งหมด',
        icon: Award,
        gradient: 'from-violet-600 to-purple-700',
        href: '/quality',
        audience: 'งานคุณภาพ หัวหน้าทีม HA',
        features: ['ลิงก์รวมไปยังทุกระบบคุณภาพ', 'ภาพรวมและทางลัดไปยังแต่ละโมดูล'],
        steps: [
            { title: 'เข้าเมนูศูนย์พัฒนาคุณภาพ', description: 'คลิก "ศูนย์พัฒนาคุณภาพ" → "ภาพรวมคุณภาพ"' },
            { title: 'เลือกระบบ', description: 'คลิกการ์ดระบบที่ต้องการ เช่น MRA, IC, KPI' },
        ],
    },
    {
        id: 'quality-docs',
        category: 'quality',
        title: 'คลังเอกสารคุณภาพ',
        subtitle: 'จัดการ WI Procedure Policy และระเบียบ',
        icon: BookOpen,
        gradient: 'from-blue-600 to-cyan-600',
        href: '/quality-docs',
        audience: 'งานคุณภาพ หัวหน้าแผนก',
        features: [
            'ค้นหาและกรองเอกสารตามประเภท',
            'สร้างเอกสารใหม่และอัปโหลดเวอร์ชัน',
            'Workflow ส่งอนุมัติ / อนุมัติ / ปฏิเสธ',
            'ดาวน์โหลดเอกสารและประวัติเวอร์ชัน',
        ],
        steps: [
            { title: 'ค้นหาเอกสาร', description: 'ใช้ช่องค้นหาและตัวกรองประเภทเอกสาร' },
            { title: 'สร้างเอกสารใหม่', description: 'กด "สร้างเอกสาร" กรอกข้อมูลและอัปโหลดไฟล์' },
            { title: 'ส่งอนุมัติ', description: 'เมื่อพร้อม กดส่งเพื่อให้ผู้อนุมัติตรวจสอบ' },
            { title: 'อนุมัติ/ปฏิเสธ', description: 'ผู้อนุมัติเปิดเอกสารแล้วเลือกอนุมัติหรือส่งกลับแก้ไข' },
        ],
    },
    {
        id: 'quality-kpi',
        category: 'quality',
        title: 'ตัวชี้วัดคุณภาพ (KPI)',
        subtitle: 'ติดตาม KPI 3 ระดับ: องค์กร แผนก ทีม HA',
        icon: BarChart2,
        gradient: 'from-emerald-600 to-green-600',
        href: '/quality-indicators',
        audience: 'งานคุณภาพ หัวหน้าแผนก ทีม HA',
        features: [
            'กำหนดตัวชี้วัดตามระดับองค์กร/แผนก/ทีม',
            'บันทึกค่าตัวชี้วัดรายงวด',
            'Dashboard สรุปผล KPI',
        ],
        steps: [
            { title: 'เลือกระดับ KPI', description: 'เลือก Organization / Department / HA Team' },
            { title: 'สร้างตัวชี้วัด', description: 'กำหนดชื่อ เป้าหมาย และรอบการวัด' },
            { title: 'บันทึกค่า', description: 'กรอกค่าจริงในแต่ละงวด' },
            { title: 'ดู Dashboard', description: 'ตรวจสอบแนวโน้มและเปรียบเทียบกับเป้าหมาย' },
        ],
    },
    {
        id: 'quality-qa',
        category: 'quality',
        title: 'การติดตามทบทวน (QA)',
        subtitle: 'Review Audit และแผนปรับปรุง',
        icon: ClipboardCheck,
        gradient: 'from-violet-600 to-indigo-600',
        href: '/quality-assurance',
        audience: 'งานคุณภาพ ผู้ตรวจประเมิน',
        features: [
            'บันทึกการทบทวน (Review)',
            'บันทึกการตรวจประเมิน (Audit)',
            'ติดตามแผนปรับปรุง (Improvement)',
        ],
        steps: [
            { title: 'เลือกประเภท QA', description: 'Review / Audit / Improvement' },
            { title: 'สร้างรายการใหม่', description: 'กรอกรายละเอียด วันที่ และผู้รับผิดชอบ' },
            { title: 'ติดตามสถานะ', description: 'อัปเดตความคืบหน้าจนเสร็จสิ้น' },
        ],
    },
    {
        id: 'mra',
        category: 'quality',
        title: 'MRA — ความถูกต้องเวชระเบียน',
        subtitle: 'ตรวจสอบความครบถ้วนของเวชระเบียนจาก HOSxP',
        icon: Search,
        gradient: 'from-indigo-600 to-blue-700',
        href: '/mra',
        audience: 'งานคุณภาพ เวชระเบียน',
        features: [
            'ค้นหาผู้ป่วย/Visit จาก HOSxP',
            'สร้างการตรวจและกรอก Checklist',
            'Auto-check บางเกณฑ์จากข้อมูล HOSxP',
            'Dashboard สถิติและรายงาน',
            'ตั้งค่าเกณฑ์ตามมาตรฐาน สรพ.',
        ],
        steps: [
            { title: 'ค้นหาผู้ป่วย', description: 'ใส่ HN/VN หรือค้นหาจากรายการ Visit' },
            { title: 'สร้างการตรวจ', description: 'กดสร้างการตรวจใหม่และเลือก Visit' },
            { title: 'กรอก Checklist', description: 'ตรวจแต่ละข้อ ระบบช่วยตรวจอัตโนมัติบางรายการ' },
            { title: 'ดูรายงาน', description: 'เข้า Dashboard/Reports เพื่อดูสรุปผล' },
        ],
        tips: [
            'อ่านคู่มือฉบับเต็มได้ที่ /mra/guide',
            'ตั้งค่าเกณฑ์ได้ที่ /mra/settings (ผู้ดูแลงานคุณภาพ)',
        ],
    },
    {
        id: 'ic',
        category: 'quality',
        title: 'IC — การควบคุมการติดเชื้อ',
        subtitle: 'เฝ้าระวังติดเชื้อ Hand Hygiene และอุบัติการณ์',
        icon: ShieldAlert,
        gradient: 'from-rose-600 to-red-600',
        href: '/ic',
        audience: 'คณะทำงาน IC พยาบาลเฝ้าระวัง',
        features: [
            'Dashboard อัตราติดเชื้อ CAUTI/CLABSI/VAP',
            'เฝ้าระวังการติดเชื้อ (Surveillance)',
            'รายงานอุบัติการณ์ IC',
            'Hand Hygiene, Environment Check',
            'Antibiotic Stewardship, Device Days',
            'จัดการ Outbreak, อบรม IC, รายงาน',
        ],
        steps: [
            { title: 'เข้า IC Dashboard', description: 'ดูภาพรวมตัวชี้วัดหลัก' },
            { title: 'บันทึกข้อมูล', description: 'เลือกเมนูย่อยตามประเภทงาน เช่น Surveillance หรือ Hand Hygiene' },
            { title: 'รายงานอุบัติการณ์', description: 'บันทึกเหตุการณ์และติดตามการแก้ไข' },
            { title: 'Export รายงาน', description: 'สร้างรายงานจากเมนู Reports' },
        ],
    },
    {
        id: 'env',
        category: 'quality',
        title: 'ENV — ระบบสิ่งแวดล้อม',
        subtitle: 'ทะเบียนครุภัณฑ์ PM และรายงานอุบัติการณ์',
        icon: Leaf,
        gradient: 'from-teal-600 to-emerald-600',
        href: '/env',
        audience: 'งานอาคารสถานที่ ช่างซ่อมบำรุง',
        features: [
            'จัดการทะเบียนครุภัณฑ์/บัญชีคุม',
            'PM Tracking แผนบำรุงรักษา',
            'รายงานอุบัติการณ์',
            'ตรวจสภาพครุภัณฑ์และรายงานความเสี่ยง',
        ],
        steps: [
            { title: 'เข้าภาพรวม ENV', description: 'ดู Dashboard สรุปสถานะ' },
            { title: 'จัดการทรัพย์สิน', description: 'เพิ่ม/แก้ไขรายการอุปกรณ์และสถานที่' },
            { title: 'ติดตาม PM', description: 'บันทึกการบำรุงรักษาตามแผน' },
            { title: 'รายงานเหตุการณ์', description: 'บันทึกเหตุการณ์และมอบหมายผู้รับผิดชอบ' },
        ],
    },

    // ── งานธุรการ ──
    {
        id: 'admin-hub',
        category: 'admin',
        title: 'ศูนย์งานธุรการ',
        subtitle: 'ทางลัดไปยังห้องประชุม จองรถ หนังสือ แจ้งซ่อม',
        icon: Building2,
        gradient: 'from-slate-600 to-gray-700',
        href: '/admin-hub',
        audience: 'เจ้าหน้าที่ธุรการ',
        features: ['ลิงก์รวมระบบธุรการ', 'เข้าถึงงานประจำวันได้รวดเร็ว'],
        steps: [
            { title: 'เข้า Admin Hub', description: 'คลิก "งานธุรการ" → "ภาพรวมธุรการ"' },
            { title: 'เลือกระบบ', description: 'คลิกการ์ดระบบที่ต้องการใช้งาน' },
        ],
    },
    {
        id: 'rooms',
        category: 'admin',
        title: 'จองห้องประชุม',
        subtitle: 'จอง อนุมัติ และดูปฏิทินห้องประชุม',
        icon: Building2,
        gradient: 'from-sky-600 to-blue-600',
        href: '/administration/rooms',
        audience: 'เจ้าหน้าที่ทุกแผนก',
        features: [
            'ดูรายการห้องประชุมทั้งหมด',
            'สร้างการจองห้อง',
            'อนุมัติการจอง (ผู้มีสิทธิ์)',
            'ปฏิทินการใช้ห้อง (FullCalendar)',
            'ดูการจองของฉัน',
        ],
        steps: [
            { title: 'เลือกห้อง', description: 'ดูรายการห้องและความจุ' },
            { title: 'สร้างการจอง', description: 'กำหนดวัน เวลา วัตถุประสงค์' },
            { title: 'รออนุมัติ', description: 'ติดตามสถานะใน "การจองของฉัน"' },
            { title: 'ดูปฏิทิน', description: 'เปิดปฏิทินเพื่อดูช่วงว่างของห้อง' },
        ],
    },
    {
        id: 'vehicles',
        category: 'admin',
        title: 'ระบบจองรถ',
        subtitle: 'จองรถราชการ มอบหมายคนขับ จัดการ fleet',
        icon: Car,
        gradient: 'from-blue-600 to-indigo-600',
        href: '/vehicles/bookings',
        audience: 'เจ้าหน้าที่ทุกแผนก / คนขับ / ผู้ดูแลรถ',
        features: [
            'สร้างและยกเลิกการจองรถ',
            'ดูการจองของฉัน',
            'ปฏิทินการใช้รถ',
            'มอบหมายคนขับและยืนยัน',
            'จัดการข้อมูลรถ (CRUD)',
            'ตั้งค่าหมวดหมู่รถ',
        ],
        steps: [
            { title: 'สร้างการจอง', description: 'ระบุวันเวลา ปลายทาง และจำนวนผู้โดยสาร' },
            { title: 'ติดตามสถานะ', description: 'ดูใน "การจองของฉัน" หรือปฏิทิน' },
            { title: 'มอบหมายคนขับ', description: 'ผู้ดูแลมอบหมายคนขับและรถ' },
            { title: 'จัดการรถ', description: 'ผู้ดูแลเพิ่ม/แก้ไขข้อมูลรถในเมนูจัดการรถยนต์' },
        ],
    },
    {
        id: 'documents',
        category: 'admin',
        title: 'ระบบหนังสือราชการ',
        subtitle: 'ลงทะเบียนหนังสือเข้า-ออก เวียน และ workflow',
        icon: FileText,
        gradient: 'from-amber-600 to-orange-600',
        href: '/documents',
        audience: 'งานธุรการ เลขาแผนก',
        features: [
            'ลงทะเบียนรับหนังสือและอัปโหลดไฟล์',
            'นำเรียนผู้อำนวยการพร้อมข้อความสรุป',
            'กล่องงานผู้อำนวยการ — ลงนามอนุมัติ/ไม่อนุมัติ',
            'ส่งต่อแผนกและติดตามสถานะการปฏิบัติ',
            'แจ้งเตือนต้นทางเมื่อสถานะเปลี่ยน',
        ],
        steps: [
            { title: 'ลงทะเบียนรับหนังสือ', description: 'อัปโหลดไฟล์และบันทึกข้อมูลหนังสือ' },
            { title: 'นำเรียน ผอ.', description: 'ส่งข้อความสรุปและชี้แจงให้ผู้อำนวยการพิจารณา' },
            { title: 'ลงนามและส่งต่อ', description: 'ผอ.อนุมัติแล้วส่งต่อแผนกที่เกี่ยวข้อง' },
            { title: 'ติดตามสถานะ', description: 'ดูหน้า "ระหว่างนำเรียน" และสถานะแผนก' },
        ],
    },

    // ── งานประจำวัน ──
    {
        id: 'maintenance',
        category: 'operations',
        title: 'ระบบแจ้งซ่อม',
        subtitle: 'แจ้งซ่อม ติดตามงาน และปิดงาน',
        icon: Wrench,
        gradient: 'from-orange-600 to-red-600',
        href: '/maintenance/requests',
        audience: 'เจ้าหน้าที่ทุกแผนก / หัวหน้าช่าง',
        features: [
            'สร้างใบแจ้งซ่อมพร้อมรูปภาพ',
            'เลือกหมวดและระดับความเร่งด่วน',
            'ดูรายการทั้งหมด / แจ้งซ่อมของฉัน',
            'มอบหมายช่างและปิดงาน',
            'Dashboard สถิติ',
            'ตั้งค่าหมวดและความเร่งด่วน',
        ],
        steps: [
            { title: 'สร้างใบแจ้งซ่อม', description: 'กรอกหัวข้อ รายละเอียด สถานที่ แนบรูป' },
            { title: 'ติดตามสถานะ', description: 'ดูใน "แจ้งซ่อมของฉัน" หรือรายการทั้งหมด' },
            { title: 'มอบหมายช่าง', description: 'หัวหน้าช่างเลือกช่างรับผิดชอบ' },
            { title: 'ปิดงาน', description: 'ผู้แจ้งหรือช่างปิดงานเมื่อซ่อมเสร็จ' },
        ],
    },
    {
        id: 'technician',
        category: 'operations',
        title: 'ใบงานช่าง',
        subtitle: 'รับงาน อัปเดตสถานะ และบันทึกผลซ่อม',
        icon: HardHat,
        gradient: 'from-yellow-600 to-amber-600',
        href: '/technician/work-orders',
        audience: 'ช่างซ่อมบำรุง หัวหน้าช่าง',
        features: [
            'ดูใบงานที่รอดำเนินการ',
            'รับงานและอัปเดตสถานะ',
            'มอบหมายงาน (หัวหน้าช่าง)',
            'บันทึกหมายเหตุการซ่อม',
        ],
        steps: [
            { title: 'เปิดใบงานช่าง', description: 'เมนูแสดงเฉพาะผู้มีตำแหน่งช่างหรือ role headtec/admin' },
            { title: 'รับงาน', description: 'คลิกรับงานที่มอบหมาย' },
            { title: 'อัปเดตสถานะ', description: 'เปลี่ยนเป็นกำลังดำเนินการ / เสร็จสิ้น' },
            { title: 'บันทึกผล', description: 'กรอกหมายเหตุการซ่อมก่อนปิดงาน' },
        ],
        tips: ['หากไม่เห็นเมนู ตรวจสอบว่าตำแหน่งงานถูกกำหนดเป็นช่างแล้ว'],
    },

    // ── KM & อบรม ──
    {
        id: 'km',
        category: 'km',
        title: 'การจัดการความรู้ (KM)',
        subtitle: 'คลังความรู้และแดชบอร์ด KM',
        icon: BookOpen,
        gradient: 'from-cyan-600 to-blue-600',
        href: '/km/dashboard',
        audience: 'เจ้าหน้าที่ทุกแผนก',
        features: [
            'แดชบอร์ดภาพรวม KM',
            'คลังความรู้ — อัปโหลด/ค้นหาเอกสาร',
            'Procedure, Manual, Research',
        ],
        steps: [
            { title: 'เข้าแดชบอร์ด KM', description: 'ดูสรุปกิจกรรมและลิงก์ด่วน' },
            { title: 'ค้นหาเอกสาร', description: 'ใช้คลังความรู้ค้นหาตามประเภท' },
            { title: 'อัปโหลด', description: 'เพิ่มเอกสารความรู้ใหม่พร้อมคำอธิบาย' },
        ],
    },
    {
        id: 'elearning',
        category: 'km',
        title: 'E-Learning / HRD',
        subtitle: 'คอร์สออนไลน์ เรียน Quiz และชั่วโมงอบรม',
        icon: GraduationCap,
        gradient: 'from-pink-600 to-rose-600',
        href: '/km/learn',
        audience: 'เจ้าหน้าที่ทุกคน / ผู้จัดการอบรม',
        features: [
            'ลงทะเบียนเรียนคอร์ส',
            'เรียนบทเรียนออนไลน์',
            'ทำแบบทดสอบ (Quiz)',
            'ดูการอบรมของฉัน / ทักษะของฉัน',
            'สร้างคอร์สและ Course Builder (ผู้จัดการ)',
            'บันทึกชั่วโมงอบรมภายนอก',
        ],
        steps: [
            { title: 'เลือกคอร์ส', description: 'เข้า E-Learning แล้วเลือกคอร์สที่สนใจ' },
            { title: 'ลงทะเบียน', description: 'กดลงทะเบียนเพื่อเข้าเรียน' },
            { title: 'เรียนและทำ Quiz', description: 'อ่านบทเรียนและทำแบบทดสอบ' },
            { title: 'ติดตามความคืบหน้า', description: 'ดูใน "การอบรมของฉัน" และ "ทักษะของฉัน"' },
        ],
    },

    // ── ตั้งค่าระบบ ──
    {
        id: 'users-roles',
        category: 'system',
        title: 'จัดการผู้ใช้ บทบาท และสิทธิ์',
        subtitle: 'ควบคุมการเข้าถึงระบบ',
        icon: Settings,
        gradient: 'from-gray-600 to-slate-700',
        href: '/users',
        audience: 'ผู้ดูแลระบบ (Admin)',
        features: [
            'CRUD ผู้ใช้ / รีเซ็ตรหัสผ่าน',
            'กำหนดบทบาทหลายคนพร้อมกัน',
            'จัดการบทบาทและสิทธิ์ (Spatie Permission)',
            'จัดการเมนูและลำดับการแสดง',
        ],
        steps: [
            { title: 'สร้างผู้ใช้', description: 'เพิ่มบัญชีใหม่และกำหนดบทบาท' },
            { title: 'กำหนดสิทธิ์', description: 'สร้าง Permission และผูกกับบทบาท' },
            { title: 'จัดการเมนู', description: 'เพิ่ม/แก้ไขเมนูและลากเรียงลำดับ' },
        ],
        tips: ['ผู้ใช้ role admin เข้าถึงทุกเมนูโดยอัตโนมัติ'],
    },
    {
        id: 'org-settings',
        category: 'system',
        title: 'ตั้งค่าองค์กร',
        subtitle: 'ตำแหน่ง ทีม HA แผนก',
        icon: Building2,
        gradient: 'from-orange-600 to-amber-600',
        href: '/settings/positions',
        audience: 'ผู้ดูแลระบบ / HR',
        features: ['จัดการตำแหน่งงาน', 'จัดการทีม HA', 'จัดการแผนก'],
        steps: [
            { title: 'ตั้งค่าตำแหน่ง', description: 'เพิ่ม/แก้ไขตำแหน่งงานในโรงพยาบาล' },
            { title: 'ตั้งค่าทีม HA', description: 'จัดกลุ่มทีมสำหรับ KPI ระดับทีม' },
            { title: 'ตั้งค่าแผนก', description: 'จัดการรายชื่อแผนกและโครงสร้าง' },
        ],
    },
    {
        id: 'app-settings',
        category: 'system',
        title: 'ตั้งค่าแอปพลิเคชัน',
        subtitle: 'ชื่อระบบ Logo สีธีม และ HOSxP',
        icon: Activity,
        gradient: 'from-violet-600 to-purple-700',
        href: '/settingsapp',
        audience: 'ผู้ดูแลระบบ',
        features: [
            'ตั้งชื่อแอป Logo Favicon',
            'เปลี่ยนสีธีม',
            'ตั้งค่า SEO',
            'ตั้งค่าการเชื่อมต่อ HOSxP และทดสอบ',
        ],
        steps: [
            { title: 'ตั้งค่าทั่วไป', description: 'แก้ไขชื่อ โลโก้ และสีธีม' },
            { title: 'ตั้งค่า HOSxP', description: 'ไปที่ตั้งค่าฐานข้อมูล กรอก connection แล้วทดสอบ' },
            { title: 'บันทึก', description: 'กดบันทึกและรีเฟรชหน้าเพื่อดูผล' },
        ],
    },
    {
        id: 'backup-audit',
        category: 'system',
        title: 'สำรองข้อมูล & ประวัติการใช้งาน',
        subtitle: 'Backup กู้คืน และ Audit Log',
        icon: Database,
        gradient: 'from-slate-700 to-gray-800',
        href: '/backup',
        audience: 'ผู้ดูแลระบบ',
        features: [
            'สำรองและกู้คืนฐานข้อมูล',
            'ดาวน์โหลดไฟล์สำรอง',
            'ดู Audit Log ประวัติการใช้งาน',
            'ไฟล์ของฉัน — อัปโหลดไฟล์ส่วนตัว',
        ],
        steps: [
            { title: 'สำรองข้อมูล', description: 'กด Run Backup ที่หน้าสำรองข้อมูล' },
            { title: 'กู้คืน', description: 'เลือกไฟล์สำรองและกด Restore (ระวังข้อมูลปัจจุบัน)' },
            { title: 'ตรวจ Audit Log', description: 'ดูประวัติการกระทำของผู้ใช้' },
        ],
        tips: ['ควรสำรองข้อมูลเป็นประจำก่อนอัปเดตระบบ'],
    },
];

export const faqItems = [
    {
        question: 'ทำไมไม่เห็นเมนูบางรายการ?',
        answer: 'เมนูแสดงตามสิทธิ์ของบัญชีคุณ หากต้องการใช้งานระบบเพิ่มเติม ติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์',
    },
    {
        question: 'ลืมรหัสผ่านทำอย่างไร?',
        answer: 'ที่หน้า Login คลิก "ลืมรหัสผ่าน" แล้วทำตามขั้นตอนในอีเมล หรือติดต่อผู้ดูแลให้รีเซ็ตรหัสผ่าน',
    },
    {
        question: 'ข้อมูลแดชบอร์ดไม่แสดง?',
        answer: 'ตรวจสอบการเชื่อมต่อ HOSxP ที่เมนู ตั้งค่าแอป → ตั้งค่าฐานข้อมูล แล้วกดทดสอบการเชื่อมต่อ',
    },
    {
        question: 'เข้าระบบด้วย LINE แล้วต้องทำอะไรต่อ?',
        answer: 'กรอกข้อมูลโปรไฟล์ให้ครบ (ชื่อ อีเมล แผนก) ครั้งแรก จากนั้นจะเข้าแดชบอร์ดได้ตามปกติ',
    },
    {
        question: 'ช่างซ่อมไม่เห็นเมนูใบงานช่าง?',
        answer: 'ต้องมีตำแหน่งช่าง (เช่น ช่างIT, ช่างไฟฟ้า) หรือบทบาท headtec/admin ให้ผู้ดูแลตรวจสอบที่จัดการผู้ใช้',
    },
];
