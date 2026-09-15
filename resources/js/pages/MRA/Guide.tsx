import React, { useEffect, useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    AlertTriangle,
    BarChart3,
    BookOpen,
    CheckCircle2,
    ClipboardCheck,
    ClipboardList,
    FileSearch,
    LayoutDashboard,
    Lightbulb,
    ListOrdered,
    Plus,
    Settings,
    Sparkles,
    Stethoscope,
    BedDouble,
    Zap,
    type LucideIcon,
} from 'lucide-react';
import { QualityPage, Panel, StatusPill } from '@/components/quality/quality-ui';
import MraSubNav, { mraBreadcrumbs } from './MraSubNav';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

const SECTIONS: GuideSection[] = [
    {
        id: 'overview',
        title: 'ระบบ MRA คืออะไร',
        summary: 'ตรวจคุณภาพการบันทึกเวชระเบียน ตามคู่มือปี 2563',
        icon: Sparkles,
        body: [
            'MRA (Medical Record Audit) คือระบบช่วยตรวจประเมินความถูกต้องและความสมบูรณ์ของการบันทึกเวชระเบียน โดยอ้างอิง Medical Record Audit Guideline ปี 2563 ของ สปสช. / สรพ. / HA',
            'ระบบแยกเกณฑ์เป็น 2 ช่องทางชัดเจน ได้แก่ ผู้ป่วยนอก (OPD) และผู้ป่วยใน (IPD) และคำนวณคะแนนแบบ ผ่าน=1 / ไม่ผ่าน=0 / N/A=ไม่คิดคะแนน',
        ],
        bullets: [
            'เกณฑ์ผ่าน: ความถูกต้อง ≥ 80%',
            'OPD: 7 หมวด (รวม Follow up / Operative / Consent)',
            'IPD: 12 หมวด (Discharge Summary ถึง Nurses’ Note)',
            'เชื่อมข้อมูล HOSxP เพื่อช่วยตรวจอัตโนมัติบางข้อ',
            'ดูภาพรวม รายงาน และเกณฑ์ได้ในเมนูเดียวกัน',
        ],
        links: [
            { label: 'ไปหน้าภาพรวม', href: '/mra/dashboard' },
            { label: 'สร้างการตรวจใหม่', href: '/mra/create' },
            { label: 'ดูเกณฑ์การตรวจ', href: '/mra/settings' },
        ],
    },
    {
        id: 'scoring',
        title: 'วิธีให้คะแนนและเกณฑ์ผ่าน',
        summary: 'เข้าใจปุ่มผ่าน / ไม่ผ่าน / N/A',
        icon: ClipboardCheck,
        body: [
            'การให้คะแนนรายข้อใช้หลักเดียวกับคู่มือ MRA 2563 เพื่อให้ผลตรวจนำไปเปรียบเทียบและพัฒนาคุณภาพได้จริง',
        ],
        bullets: [
            'ผ่าน (1): บันทึกครบตามเกณฑ์ของข้อนั้น',
            'ไม่ผ่าน (0): ไม่ครบ / ไม่ถูกต้อง / อ่านไม่ออกตามเกณฑ์',
            'N/A: ข้อหรือหมวดนั้นไม่เกี่ยวข้องกับเคสนี้ (ไม่นำมาคิดคะแนน)',
            'เปอร์เซ็นต์ = (คะแนนที่ได้ ÷ คะแนนเต็มของข้อที่นำมาคิด) × 100',
            'ผ่านเกณฑ์เมื่อเปอร์เซ็นต์ ≥ 80%',
        ],
        tips: [
            'หมวดเงื่อนไข (เช่น Follow up, Operative, Consent, Labour) หากเคสไม่มีเอกสารนั้น ให้กด “N/A ทั้งหมวด”',
            'อย่าสรุปผลเมื่อทุกรายการเป็น N/A เพราะจะไม่มีคะแนนให้คำนวณ',
        ],
        warnings: [
            'ข้อที่เลือก “ไม่ผ่าน” ควรใส่มหมายเหตุสั้น ๆ เพื่อใช้วิเคราะห์ข้อผิดพลาดซ้ำในรายงาน',
        ],
    },
    {
        id: 'opd-ipd',
        title: 'แยกเกณฑ์ OPD และ IPD',
        summary: 'เลือกประเภทให้ตรงกับ Visit ที่ตรวจ',
        icon: Stethoscope,
        body: [
            'ตอนสร้างการตรวจ ระบบจะใช้ audit_type (OPD หรือ IPD) เพื่อโหลดชุดเกณฑ์ที่ถูกต้อง ดังนั้นต้องเลือกประเภทให้ตรงกับ Visit',
        ],
        bullets: [
            'OPD: Profile, History, Physical Exam, Treatment, Follow up, Operative Note, Informed Consent',
            'IPD: Discharge Summary (Dx/Others), Consent, History, PE, Progress, Consult, Anesthetic, Operative, Labour, Rehab, Nurses’ Note',
            'รายงานสรุปผลแยกโซน OPD / IPD ชัดเจน',
            'ดูรายการเกณฑ์ทั้งหมดได้ที่เมนูตั้งค่า',
        ],
        tips: [
            'ถ้า Visit เป็นผู้ป่วยใน ควรเลือก IPD แม้จะเปิดจาก ovst ก็ตาม เพื่อให้ได้หมวด Discharge Summary และ Progress Notes',
        ],
        links: [
            { label: 'ดูเกณฑ์ OPD/IPD', href: '/mra/settings' },
            { label: 'รายงานแยกช่องทาง', href: '/mra/reports' },
        ],
    },
    {
        id: 'create',
        title: 'เริ่มสร้างการตรวจใหม่',
        summary: 'ค้นหาผู้ป่วย → เลือก Visit → สร้างเคส',
        icon: Plus,
        body: [
            'เริ่มจากค้นหา HN ใน HOSxP แล้วเลือก Visit ที่ต้องการสุ่มตรวจ ระบบจะดึงข้อมูลเบื้องต้น เช่น ชื่อ สิทธิ CC PDx และสัญญาณชีพมาเตรียมให้',
        ],
        steps: [
            'ไปที่เมนู “สร้างการตรวจใหม่”',
            'พิมพ์ HN แล้วค้นหาผู้ป่วยจาก HOSxP',
            'เลือก Visit (OPD/IPD) ที่ต้องการตรวจ',
            'ตรวจสอบข้อมูลที่ดึงมา แล้วกดสร้างการตรวจ',
            'ระบบพาไปหน้าประเมิน Checklist ทันที',
        ],
        tips: [
            'ถ้าค้นหาไม่เจอ ลองใส่ HN ให้ครบหลัก (บางระบบมีเลขนำหน้าศูนย์)',
            'ควรสุ่มตรวจกระจายตามแพทย์/แผนก/ช่วงเวลา เพื่อให้ผลสะท้อนคุณภาพจริง',
        ],
        links: [{ label: 'เปิดหน้าสร้างการตรวจ', href: '/mra/create' }],
    },
    {
        id: 'audit',
        title: 'หน้าประเมิน Checklist',
        summary: 'ใช้งานหน้าจอประเมินให้เร็วและครบ',
        icon: ClipboardList,
        body: [
            'หน้าประเมินออกแบบให้เห็นคะแนนสดทางซ้าย และรายการข้อตรวจทางขวา สามารถกระโดดไปหมวดที่ต้องการได้จากเมนูหมวด',
        ],
        steps: [
            'ดูข้อมูลผู้ป่วยและ VS ด้านซ้ายเพื่อประกอบการตัดสิน',
            'กด “ตรวจจาก HOSxP” เพื่อเติมผลอัตโนมัติในข้อที่ดึงข้อมูลได้',
            'ตรวจข้อที่เหลือด้วยตนเอง กด ผ่าน / ไม่ผ่าน / N/A',
            'หมวดเงื่อนไขที่ไม่เกี่ยวข้อง กด “N/A ทั้งหมวด”',
            'เมื่อครบทุกข้อ กด “สรุปผลและบันทึก”',
        ],
        bullets: [
            'Sidebar แสดง % คะแนน ความคืบหน้า จำนวนผ่าน/ไม่ผ่าน/N/A',
            'ค่าที่ดึงจาก HOSxP จะโชว์ใต้ข้อนั้นเป็นข้อมูลอ้างอิง',
            'บันทึกแบบร่างได้ตลอด หากยังประเมินไม่จบ',
        ],
        tips: [
            'เริ่มจากหมวดบังคับก่อน แล้วค่อยจัดการหมวดเงื่อนไข',
            'ถ้าคะแนนยังไม่ถึง 80% ให้กลับไปดูข้อที่ไม่ผ่านและวางแผนพัฒนา',
        ],
    },
    {
        id: 'autocheck',
        title: 'ตรวจอัตโนมัติจาก HOSxP',
        summary: 'ช่วยลดเวลาในข้อที่มีข้อมูลในระบบ',
        icon: Zap,
        body: [
            'ระบบดึงข้อมูลจากตารางหลักของ HOSxP เช่น patient, ovst, opdscreen, ovstdiag, lab_head, xray_head, doctor, opd_allergy, oapp เพื่อช่วยตัดสินบางข้อล่วงหน้า',
        ],
        bullets: [
            'ข้อมูลทั่วไปผู้ป่วย: ชื่อ HN เพศ วันเกิด ที่อยู่ เลขบัตร',
            'ประวัติแพ้ยา: patient.drugallergy / opd_allergy / found_allergy',
            'CC / HPI / PE จาก opdscreen',
            'Vital signs: BP (bps/bpd), Pulse, RR, น้ำหนัก ส่วนสูง',
            'PDx จาก ovstdiag, แพทย์จาก doctor, Lab จาก lab_head',
        ],
        tips: [
            'ข้อที่ระบบ “ต้องตรวจเอง” มักเป็นเรื่องคุณภาพเอกสาร เช่น ลายมือ อ่านออกได้ ความครบของ SOAP ใบยินยอม',
            'หากไม่ได้สั่ง Lab/X-ray ระบบจะไม่ปักเป็นไม่ผ่าน ให้เลือก N/A เอง',
        ],
        warnings: [
            'ผล Auto เป็นตัวช่วย ไม่ใช่คำตัดสินสุดท้าย Auditor ควรทวนกับเวชระเบียนจริงทุกครั้ง',
        ],
    },
    {
        id: 'dashboard-reports',
        title: 'ภาพรวมและรายงานสรุป',
        summary: 'ติดตามผลและจุดที่พบบ่อย',
        icon: BarChart3,
        body: [
            'ใช้ Dashboard เพื่อดูสถานการณ์รวม และใช้รายงานเพื่อวิเคราะห์แยก OPD/IPD ตามช่วงวันที่',
        ],
        steps: [
            'เปิด “ภาพรวม” เพื่อดูจำนวนตรวจ ความถูกต้องเฉลี่ย และรายการล่าสุด',
            'เปิด “รายงาน” เลือกช่วงวันที่',
            'เลือกช่องทาง ทั้งหมด / OPD / IPD',
            'ดูผลตามหมวดและ Top ข้อผิดพลาด เพื่อนำไปปรับปรุง',
        ],
        bullets: [
            'รายงานแยกโซน OPD (เขียว) และ IPD (ม่วง)',
            'แสดงจำนวนผ่านเกณฑ์ ≥ 80%',
            'พิมพ์รายงานได้จากปุ่มพิมพ์ของเบราว์เซอร์',
        ],
        links: [
            { label: 'เปิดภาพรวม', href: '/mra/dashboard' },
            { label: 'เปิดรายงาน', href: '/mra/reports' },
        ],
    },
    {
        id: 'settings',
        title: 'ตั้งค่าและดูเกณฑ์',
        summary: 'ตรวจสอบหัวข้อการตรวจทั้งหมด',
        icon: Settings,
        body: [
            'หน้าตั้งค่าใช้สำหรับดูหมวดและเกณฑ์ที่ระบบใช้อยู่ (MRA 2563) สามารถกรองดูเฉพาะ OPD หรือ IPD ได้',
        ],
        bullets: [
            'รหัสหมวดเช่น OPD-01, IPD-04',
            'ข้อที่มีป้าย Auto หมายถึงสามารถดึงจาก HOSxP ได้บางส่วน',
            'ข้อโบนัส (+1) เป็นคะแนนเพิ่มตามคู่มือ',
        ],
        tips: ['หากต้องการปรับข้อความเกณฑ์ ให้แจ้งผู้ดูแลระบบ เพราะเกณฑ์ถูก seed ตามมาตรฐานกลาง'],
        links: [{ label: 'เปิดหน้าตั้งค่า', href: '/mra/settings' }],
    },
    {
        id: 'faq',
        title: 'คำถามที่พบบ่อย',
        summary: 'แก้ปัญหาใช้งานเบื้องต้น',
        icon: Lightbulb,
        body: ['รวมคำตอบสั้น ๆ สำหรับสถานการณ์ที่พบบ่อยระหว่างใช้งาน'],
        bullets: [
            'หา Visit ไม่เจอ: ตรวจการเชื่อมต่อ HOSxP และรูปแบบ HN',
            'Auto ไม่พบทั้งที่มีข้อมูล: กดตรวจใหม่หลังอัปเดต Visit หรือตรวจว่าเลือก OPD/IPD ถูกต้อง',
            'สรุปผลไม่ได้: ยังมีข้อค้างเป็น “รอตรวจ” หรือทุกรายการเป็น N/A',
            'คะแนนต่ำผิดปกติ: ตรวจว่าเผลอไม่กด N/A ในหมวดที่ไม่เกี่ยวข้องหรือไม่',
            'รายงานว่าง: ยังไม่มีเคสสถานะ audited/corrected ในช่วงวันที่ที่เลือก',
        ],
        warnings: [
            'อย่าลบเคสตรวจที่สรุปผลแล้วโดยไม่จำเป็น เพราะจะกระทบสถิติรายงานย้อนหลัง',
        ],
    },
];

export default function MraGuide() {
    const [active, setActive] = useState(SECTIONS[0].id);

    useEffect(() => {
        const onScroll = () => {
            for (const section of [...SECTIONS].reverse()) {
                const el = document.getElementById(`mra-guide-${section.id}`);
                if (!el) continue;
                const top = el.getBoundingClientRect().top;
                if (top <= 120) {
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
        document.getElementById(`mra-guide-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <QualityPage
            tone="indigo"
            icon={BookOpen}
            badge="ศูนย์พัฒนาคุณภาพ · MRA"
            title="คู่มือใช้งานระบบ MRA"
            subtitle="ตรวจคุณภาพเวชระเบียนแบบเข้าใจง่าย · ตามเกณฑ์ปี 2563"
            breadcrumbs={mraBreadcrumbs({ title: 'คู่มือใช้งาน', href: route('mra.guide') })}
            headTitle="คู่มือ MRA"
            subNav={<MraSubNav active="mra.guide" />}
            actions={
                <Button asChild className="rounded-xl bg-indigo-600 hover:bg-indigo-700">
                    <Link href="/mra/create">
                        <Plus className="mr-2 h-4 w-4" />
                        เริ่มตรวจเลย
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
                                                ? 'bg-indigo-50 font-semibold text-indigo-800 ring-1 ring-indigo-200'
                                                : 'text-slate-600 hover:bg-slate-50',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold',
                                                isActive ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700',
                                            )}
                                        >
                                            {index + 1}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center gap-1.5 text-sm leading-snug">
                                                <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                                <span className="line-clamp-2">{section.title}</span>
                                            </span>
                                            <span className="mt-0.5 block text-[11px] font-normal leading-snug text-slate-500 line-clamp-2">
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
                            {[
                                { label: 'ภาพรวม', href: '/mra/dashboard', icon: LayoutDashboard },
                                { label: 'รายการตรวจ', href: '/mra', icon: FileSearch },
                                { label: 'รายงาน', href: '/mra/reports', icon: BarChart3 },
                                { label: 'ตั้งค่าเกณฑ์', href: '/mra/settings', icon: Settings },
                            ].map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                                >
                                    <item.icon className="h-4 w-4 text-indigo-500" />
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </aside>

                <div className="space-y-6">
                    <div className="overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-slate-900 via-indigo-950 to-sky-900 p-6 text-white shadow-xl shadow-indigo-900/20">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-sky-100">
                            <BookOpen className="h-3.5 w-3.5" />
                            คู่มือฉบับใช้งานจริง
                        </div>
                        <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">ตรวจเวชระเบียนให้ถูกต้อง ครบ และนำไปพัฒนาได้</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sky-100/85 md:text-base">
                            อ่านตามลำดับ หรือกระโดดจากสารบัญซ้ายมือได้ทันที เหมาะทั้งผู้ตรวจใหม่และทีมคุณภาพที่ต้องการทบทวนวิธีใช้งาน
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <StatusPill label="OPD 7 หมวด" className="border-emerald-300/30 bg-emerald-400/15 text-emerald-100" />
                            <StatusPill label="IPD 12 หมวด" className="border-violet-300/30 bg-violet-400/15 text-violet-100" />
                            <StatusPill label="ผ่านเกณฑ์ ≥ 80%" className="border-amber-300/30 bg-amber-400/15 text-amber-100" />
                            <StatusPill label="Auto-check HOSxP" className="border-sky-300/30 bg-sky-400/15 text-sky-100" />
                        </div>
                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            {[
                                { icon: Stethoscope, title: 'เลือกช่องทางให้ถูก', desc: 'OPD หรือ IPD ตั้งแต่สร้างเคส' },
                                { icon: Zap, title: 'ใช้ Auto ช่วยก่อน', desc: 'แล้วทวนข้อที่ต้องดูเอกสาร' },
                                { icon: BedDouble, title: 'ดูรายงานแยกช่องทาง', desc: 'วิเคราะห์จุดอ่อนได้ตรงกลุ่ม' },
                            ].map((card) => (
                                <div key={card.title} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                                    <card.icon className="mb-2 h-4 w-4 text-sky-200" />
                                    <div className="text-sm font-semibold">{card.title}</div>
                                    <div className="mt-1 text-xs text-sky-100/75">{card.desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {SECTIONS.map((section, index) => {
                        const Icon = section.icon;
                        return (
                            <section key={section.id} id={`mra-guide-${section.id}`} className="scroll-mt-6">
                                <Panel title={`${index + 1}. ${section.title}`} description={section.summary}>
                                    <div className="flex items-start gap-4">
                                        <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 sm:flex">
                                            <Icon className="h-7 w-7" />
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-3 text-sm leading-relaxed text-slate-600">
                                            {section.body.map((p) => (
                                                <p key={p}>{p}</p>
                                            ))}
                                        </div>
                                    </div>

                                    {section.bullets?.length ? (
                                        <div className="mt-5">
                                            <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                                                <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                                                สิ่งที่ควรรู้
                                            </h4>
                                            <ul className="grid gap-2 sm:grid-cols-2">
                                                {section.bullets.map((item) => (
                                                    <li
                                                        key={item}
                                                        className="rounded-2xl border border-indigo-50 bg-indigo-50/40 px-3 py-2.5 text-sm text-slate-700"
                                                    >
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : null}

                                    {section.steps?.length ? (
                                        <div className="mt-5">
                                            <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                                                <ListOrdered className="h-4 w-4 text-indigo-600" />
                                                ทำตามทีละขั้นตอน
                                            </h4>
                                            <ol className="space-y-2">
                                                {section.steps.map((step, stepIndex) => (
                                                    <li
                                                        key={`${section.id}-step-${stepIndex}`}
                                                        className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2.5 text-sm text-slate-700"
                                                    >
                                                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
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
                                                    key={link.href}
                                                    href={link.href}
                                                    className="rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50"
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

                    <div className="rounded-3xl border border-indigo-100 bg-indigo-50/60 p-5">
                        <div className="flex items-center gap-2 font-bold text-indigo-800">
                            <CheckCircle2 className="h-5 w-5" />
                            สรุปการใช้งานให้ได้ผล
                        </div>
                        <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                            <li>• สุ่มตรวจสม่ำเสมอ และแยกวิเคราะห์ OPD/IPD ทุกเดือน</li>
                            <li>• ใช้ Auto-check ลดเวลา แต่ทวนข้อคุณภาพเอกสารด้วยตาเสมอ</li>
                            <li>• นำ Top errors จากรายงานไปวางแผนพัฒนาการบันทึกของแพทย์/แผนก</li>
                        </ul>
                        <div className="mt-4">
                            <Button asChild className="rounded-xl bg-indigo-600 hover:bg-indigo-700">
                                <Link href="/mra/create">เริ่มสร้างการตรวจใหม่</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </QualityPage>
    );
}
