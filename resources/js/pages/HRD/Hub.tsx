import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {
    Award,
    BarChart3,
    BookOpen,
    Calendar,
    CheckCircle,
    CheckSquare,
    ClipboardList,
    FileSpreadsheet,
    FileText,
    LayoutDashboard,
    MessageSquare,
    Star,
    Timer,
    ClipboardCheck,
    User,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tool {
    title: string;
    description: string;
    href: string;
    icon: LucideIcon;
    tone: string;
}

const mine: Tool[] = [
    { title: 'ภาพรวมการอบรม', description: 'ชั่วโมงและหลักสูตรที่กำลังเรียน', href: '/km/learn/dashboard', icon: LayoutDashboard, tone: 'bg-emerald-100 text-emerald-700' },
    { title: 'หลักสูตร', description: 'เลือกเรียนและเข้าบทเรียน', href: '/km/learn/courses', icon: BookOpen, tone: 'bg-sky-100 text-sky-700' },
    { title: 'การอบรมของฉัน', description: 'ประวัติภายใน ภายนอก และเกียรติบัตร', href: '/km/learn/my-training', icon: User, tone: 'bg-teal-100 text-teal-700' },
    { title: 'สมรรถนะของฉัน', description: 'ระดับที่ได้รับรองแล้ว', href: '/km/learn/my-skills', icon: Star, tone: 'bg-amber-100 text-amber-700' },
    { title: 'รวมแบบประเมิน', description: 'ความพึงพอใจ สมรรถนะ และสุขภาวะในการทำงาน', href: '/km/learn/assessments', icon: ClipboardList, tone: 'bg-violet-100 text-violet-700' },
    { title: 'แผนพัฒนาของฉัน', description: 'IDP จากช่องว่างสมรรถนะ', href: '/km/learn/idp', icon: ClipboardList, tone: 'bg-indigo-100 text-indigo-700' },
    { title: 'แฟ้มประวัติ', description: 'หลักฐานรายคนสำหรับเยี่ยม', href: '/km/learn/passport', icon: FileText, tone: 'bg-slate-100 text-slate-700' },
    { title: 'ปฐมนิเทศ', description: 'รายการก่อนขึ้นปฏิบัติงานอิสระ', href: '/km/learn/orientation', icon: CheckSquare, tone: 'bg-cyan-100 text-cyan-700' },
    { title: 'สำรวจความต้องการ', description: 'บอกเรื่องที่อยากพัฒนา', href: '/km/learn/tna', icon: MessageSquare, tone: 'bg-orange-100 text-orange-700' },
];

const departmentTools: Tool[] = [
    { title: 'อนุมัติอบรมภายนอก', description: 'ตรวจหลักฐานของคนในแผนก', href: '/km/learn/external-approvals', icon: CheckCircle, tone: 'bg-emerald-100 text-emerald-700' },
    { title: 'ความครบถ้วน', description: 'ใครครบ ใครเลยกำหนด ใครใกล้หมดอายุ', href: '/km/learn/compliance', icon: BarChart3, tone: 'bg-rose-100 text-rose-700' },
    { title: 'รายงาน HA', description: 'ตัวเลขของคนในแผนก', href: '/km/learn/reports', icon: FileSpreadsheet, tone: 'bg-teal-100 text-teal-700' },
    { title: 'ประเมินการทำงาน', description: 'วงรอบ 6 เดือน และการ์ดคะแนนรายคน', href: '/km/learn/work-evaluations', icon: ClipboardCheck, tone: 'bg-violet-100 text-violet-700' },
    { title: 'ติดตามการนำไปใช้', description: 'ประเมินหลังครบ 3 เดือน', href: '/km/learn/behavior', icon: Timer, tone: 'bg-indigo-100 text-indigo-700' },
];

const orgTools: Tool[] = [
    { title: 'มอบหมายหลักสูตร', description: 'รายคน กลุ่มงาน หรือตำแหน่ง', href: '/km/learn/assignments', icon: Users, tone: 'bg-sky-100 text-sky-700' },
    { title: 'พจนานุกรมสมรรถนะ', description: 'พฤติกรรมบ่งชี้และผูกตำแหน่ง', href: '/km/learn/competencies', icon: Award, tone: 'bg-amber-100 text-amber-700' },
    { title: 'แผนประจำปี', description: 'เป้าชั่วโมงเทียบผลจริง', href: '/km/learn/plans', icon: Calendar, tone: 'bg-violet-100 text-violet-700' },
    { title: 'แบบประเมินกลาง', description: 'คำถามความพึงพอใจที่ใช้ทุกหลักสูตร', href: '/km/learn/satisfaction-template', icon: FileText, tone: 'bg-slate-100 text-slate-700' },
];

function Grid({ tools }: { tools: Tool[] }) {
    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tools.map((tool) => (
                <Link
                    key={tool.href}
                    href={tool.href}
                    className="group flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
                >
                    <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', tool.tone)}>
                        <tool.icon className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900 group-hover:text-emerald-700">{tool.title}</h3>
                        <p className="mt-1 text-sm text-slate-500">{tool.description}</p>
                    </div>
                </Link>
            ))}
        </div>
    );
}

export default function HrdHub({ canManageStaff, canConfigure }: { canManageStaff: boolean; canConfigure: boolean }) {
    return (
        <AppLayout breadcrumbs={[{ title: 'พัฒนาบุคลากร', href: '/km/learn/hub' }]}>
            <Head title="ศูนย์พัฒนาบุคลากร" />
            <div className="space-y-8 p-6 md:p-8">
                <div className="rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-white shadow-lg">
                    <p className="text-sm font-medium text-emerald-100">HRD Hub</p>
                    <h1 className="mt-2 text-3xl font-bold">ศูนย์พัฒนาบุคลากร</h1>
                    <p className="mt-2 max-w-2xl text-emerald-50">
                        เลือกงานจากหน้านี้ได้เลย เมนูด้านข้างเหลือทางเข้าเดียว เพื่อไม่ให้รายการยาวและกดผิดหน้า
                    </p>
                </div>
                <section className="space-y-3">
                    <h2 className="text-lg font-semibold text-slate-800">งานของฉัน</h2>
                    <Grid tools={mine} />
                </section>
                {canManageStaff && (
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold text-slate-800">งานหัวหน้าแผนก</h2>
                        <p className="text-sm text-slate-500">เห็นและลงข้อมูลได้เฉพาะคนในแผนกที่ตนเป็นหัวหน้า ทีม HRD และผู้ดูแลระบบเห็นทั้งองค์กร</p>
                        <Grid tools={departmentTools} />
                    </section>
                )}
                {canConfigure && (
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold text-slate-800">งานทีม HRD</h2>
                        <Grid tools={orgTools} />
                    </section>
                )}
            </div>
        </AppLayout>
    );
}
