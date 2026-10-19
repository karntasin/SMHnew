import { useEffect, useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    AlertTriangle,
    BookOpen,
    Box,
    CalendarClock,
    CheckCircle2,
    ClipboardCheck,
    Droplets,
    Gauge,
    Lightbulb,
    ListOrdered,
    ShieldAlert,
    Sparkles,
    Wrench,
    type LucideIcon,
} from 'lucide-react';
import { Panel, QualityPage, StatusPill } from '@/components/quality/quality-ui';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import EnvSubNav from '@/pages/Env/EnvSubNav';

interface GuideSection {
    id: string;
    title: string;
    summary: string;
    icon: LucideIcon;
    body: string[];
    bullets?: string[];
    steps?: string[];
    tips?: string[];
    warnings?: string[];
    links?: { label: string; href: string }[];
}

function buildSections(): GuideSection[] {
    return [
    {
        id: 'overview',
        title: 'ระบบ ENV ใช้ทำอะไร',
        summary: 'ดูภาพรวมครุภัณฑ์ ความปลอดภัย และงานบำรุงรักษา',
        icon: Sparkles,
        body: [
            'ENV คือระบบสิ่งแวดล้อมและความปลอดภัยของโรงพยาบาล ใช้ดูแลครุภัณฑ์ แผนบำรุงรักษา ค่าสาธารณูปโภค และเหตุการณ์ที่เกี่ยวกับอาคารสถานที่',
            'เหมาะกับงานอาคาร ช่างซ่อมบำรุง และหัวหน้างานที่ต้องดูว่าเครื่องพร้อมใช้ งานบำรุงทำทันเวลา และมีค่าใช้จ่ายเท่าไร',
        ],
        bullets: [
            'Dashboard สรุปจำนวนครุภัณฑ์แยกสถานะและสายงาน',
            'ทะเบียนครุภัณฑ์พร้อมรูป ความเสี่ยง และสถานที่ติดตั้ง',
            'แผนบำรุงรักษา (PM) ตั้งแต่แผนมาตรฐานจนถึงใบสั่งงาน',
            'สาธารณูปโภค และรายงานอุบัติการณ์',
        ],
        links: [
            { label: 'เปิด Dashboard', href: route('env.index') },
            { label: 'เปิดทะเบียนครุภัณฑ์', href: route('env.assets.index') },
            { label: 'เปิดแผน PM', href: route('env.pm.index') },
        ],
    },
    {
        id: 'assets',
        title: 'ขึ้นทะเบียนครุภัณฑ์',
        summary: 'บันทึกเครื่องให้ครบ ก่อนนำไปวางแผนบำรุง',
        icon: Box,
        body: [
            'ทุกรายการอยู่ในทะเบียนครุภัณฑ์ รหัสเครื่องใช้เลขในระบบร่วมกับเลขครุภัณฑ์หรือเลขคุมที่มีอยู่แล้ว ไม่ต้องสร้างรหัสชุดใหม่',
            'ความเสี่ยงยังเป็น A B C ตามเดิม และแสดงคู่กับคำว่า High Medium Low เพื่อให้อ่านร่วมกันได้',
        ],
        bullets: [
            'A สูง (High) แจ้งเตือนล่วงหน้า 14 วัน',
            'B กลาง (Medium) แจ้งเตือนล่วงหน้า 7 วัน',
            'C ต่ำ (Low) แจ้งเตือนล่วงหน้า 3 วัน',
            'สถานที่ติดตั้งดูจากสถานที่จ่าย สถานที่ และผู้รับผิดชอบ',
            'ใส่วันที่ติดตั้งและงบซ่อมบำรุงต่อปีไว้ใช้เทียบต้นทุน',
        ],
        steps: [
            'เปิดทะเบียนครุภัณฑ์ แล้วกดขึ้นทะเบียน',
            'กรอกชื่อ ยี่ห้อ รุ่น สถานที่ และระดับความเสี่ยง',
            'กำหนดรอบบำรุงเริ่มต้น เช่น ทุก 12 เดือน',
            'เมื่อต้องส่งซ่อม รอจำหน่าย หรือจำหน่าย ให้เปลี่ยนสถานะพร้อมเอกสารอ้างอิง',
        ],
        tips: [
            'ไอคอนประแจในรายการครุภัณฑ์เปิดแผนบำรุงของเครื่องนั้นโดยตรง',
            'ถ้ายังไม่ใส่วันที่ติดตั้ง ระบบใช้วันที่ซื้อมาเติมให้ตอนอัปเกรดข้อมูล',
        ],
        links: [{ label: 'ไปทะเบียนครุภัณฑ์', href: route('env.assets.index') }],
    },
    {
        id: 'reports',
        title: 'รายงาน ความเสี่ยง และการสอบเทียบ',
        summary: 'ดูเครื่องแยกสายงาน และเครื่องที่ต้องสอบเทียบ',
        icon: ClipboardCheck,
        body: [
            'นอกจากรายการครุภัณฑ์ ยังมีหน้ารายงานสำหรับดูภาพรวม และหน้าสอบเทียบสำหรับเครื่องที่ต้องตรวจตามวงรอบ',
        ],
        bullets: [
            'รายงานแยกสาย สรุปครุภัณฑ์ตามสายงานและออกเป็น PDF ได้',
            'ครุภัณฑ์ที่เสี่ยง รวมเครื่องระดับสูง กลาง และต่ำ',
            'การสอบเทียบสร้างวงรอบ กำหนดวันตรวจ แล้วบันทึกผ่านหรือไม่ผ่าน',
        ],
        links: [
            { label: 'รายงานแยกสาย', href: route('env.assets.report') },
            { label: 'ครุภัณฑ์ที่เสี่ยง', href: route('env.assets.risk') },
            { label: 'การสอบเทียบ', href: route('env.assets.inspection') },
        ],
    },
    {
        id: 'pm-plan',
        title: 'วางแผนบำรุงรักษาก่อนลงมือทำ',
        summary: 'สร้างแผนมาตรฐาน ผูกกับเครื่อง และเตรียมอะไหล่',
        icon: Wrench,
        body: [
            'แผนมาตรฐานคือต้นแบบงานที่ต้องทำซ้ำ เช่น ตรวจรายเดือนหรือรายปี หนึ่งเครื่องผูกได้หลายแผน จึงมีทั้งงานรายวันและงานรายปีบนเครื่องเดียวกันได้',
            'แผนคิดได้สองแบบ คือตามเวลา หรือตามชั่วโมงการใช้งานที่อ่านจากมิเตอร์',
        ],
        steps: [
            'เปิดแท็บแผนมาตรฐาน แล้วเพิ่มชื่อแผน ความถี่ และขั้นตอนการทำงาน',
            'ใส่รายการตรวจ แต่ละข้อเป็นตรวจเช็ก ค่าวัด หรือข้อความ พร้อมช่วงที่รับได้',
            'เปิดแท็บอะไหล่ บันทึกรหัส ราคา สต็อกคงเหลือ และจำนวนขั้นต่ำ',
            'ผูกอะไหล่ที่ต้องเปลี่ยนเข้ากับแผน พร้อมจำนวนต่อรอบ',
            'จากทะเบียนครุภัณฑ์ เปิดแผนของเครื่อง แล้วเลือกแผนมาตรฐานที่จะใช้',
        ],
        tips: [
            'เครื่องสำคัญควรผูกแผนถี่กว่า และตรวจสต็อกอะไหล่ให้อยู่เหนือขั้นต่ำก่อนถึงรอบ',
            'แผนตามชั่วโมงจะออกใบงานเมื่อบันทึกมิเตอร์แล้วค่าถึงรอบที่กำหนด',
        ],
        links: [
            { label: 'แผนมาตรฐาน', href: route('env.pm.standards.index') },
            { label: 'อะไหล่', href: route('env.pm.parts.index') },
        ],
    },
    {
        id: 'pm-daily',
        title: 'ทำงานบำรุงรักษาในแต่ละวัน',
        summary: 'ออกใบงาน มอบหมายช่าง แล้วบันทึกผล',
        icon: CalendarClock,
        body: [
            'ระบบสร้างใบงานให้อัตโนมัติทุกวันเวลา 07:30 น. เมื่อใกล้ถึงรอบ หรือกดปุ่มสร้างใบงานที่ถึงรอบบนแดชบอร์ดได้เอง',
            'ใบงานใช้เลขขึ้นต้น PM ตามด้วยวันที่ ผู้รับผิดชอบเลือกได้หลายคน คนแรกคือหัวหน้างาน',
        ],
        steps: [
            'ดูงานใกล้ถึงและงานเลยกำหนดบนแดชบอร์ด หรือเปิดปฏิทินรายเดือน',
            'เปิดใบงาน แล้วเลือกช่างที่จะรับผิดชอบ',
            'ถ่ายรูปก่อนทำ อัปโหลดไว้ในใบงาน',
            'ทำตามรายการตรวจ ใส่ค่าที่วัดได้จริง และจำนวนอะไหล่ที่เบิก',
            'ถ่ายรูปหลังทำ แล้วกดบันทึกผลเพื่อปิดใบงาน',
        ],
        tips: [
            'ค่ารายการที่เป็นตัวเลข ถ้าอยู่นอกช่วงที่กำหนด ระบบตั้งผลข้อนั้นเป็นไม่ผ่านให้เอง',
            'เมื่อปิดงาน ระบบเลื่อนวันครบรอบถัดไป หรือเลื่อนค่ามิเตอร์รอบถัดไปให้อัตโนมัติ',
            'ถ้าเบิกอะไหล่จนต่ำกว่าขั้นต่ำ ยังบันทึกได้ แต่ใบงานจะติดเครื่องหมายให้ไปเติมสต็อก',
        ],
        links: [
            { label: 'แดชบอร์ด PM', href: route('env.pm.index') },
            { label: 'ปฏิทิน', href: route('env.pm.calendar') },
            { label: 'ใบสั่งงาน', href: route('env.pm.work-orders.index') },
        ],
    },
    {
        id: 'pm-fail',
        title: 'เมื่อตรวจแล้วไม่ผ่าน',
        summary: 'เปิดใบแจ้งซ่อมต่อจากใบบำรุงรักษาทันที',
        icon: ShieldAlert,
        body: [
            'ถ้าผลรวมไม่ผ่าน หรือมีรายการตรวจไม่ผ่าน ให้เลือกความเร่งด่วนก่อนปิดใบงาน ระบบจะเปิดใบแจ้งซ่อมให้ช่างทันที',
            'ใบแจ้งซ่อมใช้เลขขึ้นต้น MR และผูกกลับมาที่ใบ PM เดิม สถานะเครื่องจะเปลี่ยนเป็นส่งซ่อม',
        ],
        steps: [
            'เลือกผลไม่ผ่าน หรือปล่อยให้ค่าที่วัดได้นอกเกณฑ์',
            'เลือกความเร่งด่วนของใบแจ้งซ่อม',
            'เขียนปัญหาที่พบให้สั้นและชัด',
            'ปิดใบงาน แล้วเปิดลิงก์ใบแจ้งซ่อมเพื่อติดตามในใบงานช่าง',
        ],
        warnings: [
            'อย่าปิดงานไม่ผ่านโดยไม่เลือกความเร่งด่วน เพราะระบบต้องใช้ค่านั้นเปิดใบซ่อม',
        ],
        links: [{ label: 'ดูใบสั่งงาน PM', href: route('env.pm.work-orders.index') }],
    },
    {
        id: 'kpi',
        title: 'อ่านตัวเลขบนแดชบอร์ด',
        summary: 'ใช้คุยกับหัวหน้างานว่าแผนเดินตามเวลาหรือไม่',
        icon: Gauge,
        body: [
            'แดชบอร์ด PM กรองได้ทั้งปีหรือรายเดือน ตัวเลขช่วยดูว่างานทำทัน งานค้างนานแค่ไหน และใช้งบไปเท่าไร',
        ],
        bullets: [
            'ความครบถ้วนตามกำหนด คือจำนวนใบงานที่ปิดไม่เกินวันกำหนด หารด้วยใบงานที่ครบกำหนดในช่วงนั้น',
            'งานค้าง คือใบงานที่ยังไม่ปิดและเลยวันกำหนดแล้ว',
            'เวลาซ่อมเฉลี่ย (MTTR) คือเวลาเฉลี่ยตั้งแต่เริ่มซ่อมจนปิดใบแจ้งซ่อมที่ผูกกับเครื่อง',
            'เวลาก่อนเสียเฉลี่ย (MTBF) คำนวณได้เมื่อเครื่องเดียวกันมีใบซ่อมที่ปิดแล้วอย่างน้อยสองครั้ง',
            'ต้นทุน คือค่าแรงบวกค่าอะไหล่ของงาน PM ที่ปิดแล้ว เทียบกับงบต่อปีของเครื่อง',
        ],
        tips: [
            'ตั้งอัตราค่าแรงต่อชั่วโมงบนแดชบอร์ด ระบบจะคิดค่าแรงจากจำนวนนาทีที่บันทึกในใบงาน',
            'ใบซ่อมเก่าที่ยังไม่ได้ผูกกับเครื่อง จะยังไม่ถูกนำมาคิดเวลาซ่อมและเวลาก่อนเสีย',
        ],
        links: [{ label: 'เปิดแดชบอร์ด PM', href: route('env.pm.index') }],
    },
    {
        id: 'other',
        title: 'สาธารณูปโภคและอุบัติการณ์',
        summary: 'บันทึกค่าใช้จ่ายรายเดือน และเหตุการณ์ด้านความปลอดภัย',
        icon: Droplets,
        body: [
            'สองงานนี้อยู่ในระบบเดียวกัน แต่คนละเรื่องกับแผนบำรุงรักษาเครื่อง',
        ],
        bullets: [
            'สาธารณูปโภคใช้ติดตามค่าใช้จ่ายรายเดือน แยกประเภท และดูแนวโน้มของปีงบประมาณ',
            'รายงานอุบัติการณ์ใช้แจ้งเหตุ ระบุความรุนแรง สถานที่ และผู้รับผิดชอบ แล้วติดตามจนปิดเรื่อง',
        ],
        steps: [
            'เปิดสาธารณูปโภค เลือกประเภท แล้วบันทึกยอดของเดือนนั้น',
            'เมื่อเกิดเหตุ ให้เปิดรายงานอุบัติการณ์ แล้วกรอกรายละเอียดและความรุนแรง',
            'มอบหมายผู้ติดตาม และอัปเดตสถานะเมื่อแก้ไขเสร็จ',
        ],
        links: [
            { label: 'สาธารณูปโภค', href: route('env.utilities.index') },
            { label: 'รายงานอุบัติการณ์', href: route('env.incidents.index') },
        ],
    },
    ];
}

function buildShortcuts() {
    return [
    { label: 'Dashboard', href: route('env.index'), icon: Gauge },
    { label: 'ทะเบียนครุภัณฑ์', href: route('env.assets.index'), icon: Box },
    { label: 'แผน PM', href: route('env.pm.index'), icon: Wrench },
    { label: 'สาธารณูปโภค', href: route('env.utilities.index'), icon: Droplets },
    { label: 'อุบัติการณ์', href: route('env.incidents.index'), icon: AlertTriangle },
];
}

export default function Guide() {
    const SECTIONS = buildSections();
    const shortcuts = buildShortcuts();
    const [active, setActive] = useState(SECTIONS[0].id);

    useEffect(() => {
        const onScroll = () => {
            for (const section of [...SECTIONS].reverse()) {
                const el = document.getElementById(`env-guide-${section.id}`);
                if (!el) continue;
                if (el.getBoundingClientRect().top <= 120) {
                    setActive(section.id);
                    break;
                }
            }
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const scrollTo = (id: string) => {
        setActive(id);
        document.getElementById(`env-guide-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <QualityPage
            tone="teal"
            icon={BookOpen}
            badge="ศูนย์พัฒนาคุณภาพ · ENV"
            title="คู่มือใช้งานระบบ ENV"
            subtitle="อ่านทีละเรื่องได้ จากทะเบียนครุภัณฑ์จนถึงตัวเลขบนแดชบอร์ด"
            breadcrumbs={[
                { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
                { title: 'ENV', href: route('env.index') },
                { title: 'คู่มือใช้งาน', href: route('env.guide') },
            ]}
            headTitle="คู่มือ ENV"
            subNav={<EnvSubNav active="env.guide" />}
            actions={
                <Button asChild className="rounded-xl bg-teal-600 hover:bg-teal-700">
                    <Link href={route('env.pm.index')}>
                        <Wrench className="mr-2 h-4 w-4" />
                        ไปที่แผน PM
                    </Link>
                </Button>
            }
        >
            <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                <aside className="lg:sticky lg:top-4 lg:self-start">
                    <Panel title="สารบัญ" description="คลิกเพื่อไปยังหัวข้อ">
                        <nav className="space-y-1">
                            {SECTIONS.map((section, index) => {
                                const Icon = section.icon;
                                const isActive = active === section.id;
                                return (
                                    <button
                                        key={section.id}
                                        type="button"
                                        onClick={() => scrollTo(section.id)}
                                        className={cn(
                                            'flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition',
                                            isActive
                                                ? 'bg-teal-50 font-semibold text-teal-800 ring-1 ring-teal-200'
                                                : 'text-slate-600 hover:bg-slate-50',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold',
                                                isActive ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-700',
                                            )}
                                        >
                                            {index + 1}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center gap-1.5 text-sm leading-snug">
                                                <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                                <span className="line-clamp-2">{section.title}</span>
                                            </span>
                                            <span className="mt-0.5 block line-clamp-2 text-[11px] font-normal leading-snug text-slate-500">
                                                {section.summary}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                        </nav>
                    </Panel>
                    <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">ทางลัด</div>
                        <div className="grid gap-2">
                            {shortcuts.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                                >
                                    <item.icon className="h-4 w-4 text-teal-600" />
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </aside>

                <div className="space-y-6">
                    <div className="overflow-hidden rounded-3xl border border-teal-100 bg-gradient-to-br from-slate-900 via-teal-950 to-emerald-900 p-6 text-white shadow-xl shadow-teal-900/20">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-teal-100">
                            <BookOpen className="h-3.5 w-3.5" />
                            คู่มือฉบับใช้งานจริง
                        </div>
                        <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">ดูแลเครื่องให้พร้อมใช้ และรู้ว่างานบำรุงเดินตามแผนหรือไม่</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-teal-100/85 md:text-base">
                            อ่านตามลำดับ หรือกระโดดจากสารบัญซ้ายมือได้ทันที เหมาะทั้งช่างที่เพิ่งเริ่มใช้ และหัวหน้างานที่ต้องการทบทวนขั้นตอน
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <StatusPill label="ทะเบียนครุภัณฑ์" className="border-emerald-300/30 bg-emerald-400/15 text-emerald-100" />
                            <StatusPill label="แผนบำรุงรักษา" className="border-teal-300/30 bg-teal-400/15 text-teal-100" />
                            <StatusPill label="ใบแจ้งซ่อมเมื่อไม่ผ่าน" className="border-amber-300/30 bg-amber-400/15 text-amber-100" />
                        </div>
                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            {[
                                { icon: Box, title: 'ขึ้นทะเบียนก่อน', desc: 'ใส่ความเสี่ยง สถานที่ และงบต่อปี' },
                                { icon: Wrench, title: 'ผูกแผนกับเครื่อง', desc: 'แล้วให้ระบบออกใบงานตามรอบ' },
                                { icon: Gauge, title: 'ดูแดชบอร์ดทุกเดือน', desc: 'งานทันเวลา งานค้าง และต้นทุน' },
                            ].map((card) => (
                                <div key={card.title} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                                    <card.icon className="mb-2 h-4 w-4 text-teal-200" />
                                    <div className="text-sm font-semibold">{card.title}</div>
                                    <div className="mt-1 text-xs text-teal-100/75">{card.desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {SECTIONS.map((section, index) => {
                        const Icon = section.icon;
                        return (
                            <section key={section.id} id={`env-guide-${section.id}`} className="scroll-mt-6">
                                <Panel title={`${index + 1}. ${section.title}`} description={section.summary}>
                                    <div className="flex items-start gap-4">
                                        <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 sm:flex">
                                            <Icon className="h-7 w-7" />
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-3 text-sm leading-relaxed text-slate-600">
                                            {section.body.map((paragraph) => (
                                                <p key={paragraph}>{paragraph}</p>
                                            ))}
                                        </div>
                                    </div>

                                    {section.bullets?.length ? (
                                        <div className="mt-5">
                                            <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                                                <CheckCircle2 className="h-4 w-4 text-teal-600" />
                                                สิ่งที่ควรรู้
                                            </h4>
                                            <ul className="grid gap-2 sm:grid-cols-2">
                                                {section.bullets.map((item) => (
                                                    <li key={item} className="rounded-2xl border border-teal-50 bg-teal-50/50 px-3 py-2.5 text-sm text-slate-700">
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : null}

                                    {section.steps?.length ? (
                                        <div className="mt-5">
                                            <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                                                <ListOrdered className="h-4 w-4 text-teal-600" />
                                                ทำตามทีละขั้นตอน
                                            </h4>
                                            <ol className="space-y-2">
                                                {section.steps.map((step, stepIndex) => (
                                                    <li
                                                        key={`${section.id}-${stepIndex}`}
                                                        className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2.5 text-sm text-slate-700"
                                                    >
                                                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-600 text-[11px] font-bold text-white">
                                                            {stepIndex + 1}
                                                        </span>
                                                        <span className="leading-relaxed">{step}</span>
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>
                                    ) : null}

                                    {section.tips?.length ? (
                                        <div className="mt-5 space-y-2 rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                                            {section.tips.map((tip) => (
                                                <div key={tip} className="flex items-start gap-2 text-sm text-amber-900">
                                                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
                                                    <span>{tip}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}

                                    {section.warnings?.length ? (
                                        <div className="mt-5 space-y-2 rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
                                            {section.warnings.map((warning) => (
                                                <div key={warning} className="flex items-start gap-2 text-sm text-rose-800">
                                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                                    <span>{warning}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}

                                    {section.links?.length ? (
                                        <div className="mt-5 flex flex-wrap gap-2">
                                            {section.links.map((link) => (
                                                <Link
                                                    key={link.href + link.label}
                                                    href={link.href}
                                                    className="rounded-full border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-50"
                                                >
                                                    {link.label}
                                                </Link>
                                            ))}
                                        </div>
                                    ) : null}
                                </Panel>
                            </section>
                        );
                    })}

                    <div className="rounded-3xl border border-teal-100 bg-teal-50/70 p-5">
                        <div className="flex items-center gap-2 font-bold text-teal-800">
                            <CheckCircle2 className="h-5 w-5" />
                            ใช้ระบบให้ได้ผลในแต่ละเดือน
                        </div>
                        <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                            <li>ขึ้นทะเบียนเครื่องให้ครบความเสี่ยง สถานที่ และงบต่อปี</li>
                            <li>ผูกแผนมาตรฐานก่อน แล้วตรวจใบงานที่ถึงรอบทุกสัปดาห์</li>
                            <li>งานที่ไม่ผ่านให้เปิดใบซ่อมทันที และเติมอะไหล่ที่ต่ำกว่าขั้นต่ำ</li>
                            <li>ดูความครบถ้วนตามกำหนด งานค้าง และต้นทุนบนแดชบอร์ดทุกสิ้นเดือน</li>
                        </ul>
                    </div>
                </div>
            </div>
        </QualityPage>
    );
}
