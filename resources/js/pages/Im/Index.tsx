import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import ImSubNav from '@/pages/Im/ImSubNav';
import { cn } from '@/lib/utils';
import {
    Target,
    ShieldAlert,
    Lock,
    Headset,
    FileCheck,
    Code2,
    Server,
    ChevronRight,
    Sparkles,
    ClipboardList,
    AlertTriangle,
    FileText,
    Ticket,
    GitPullRequest,
    BookOpen,
} from 'lucide-react';

interface Props {
    stats: {
        plans: number;
        action_plans: number;
        open_risks: number;
        policies: number;
        open_tickets: number;
        open_incidents: number;
        pending_changes: number;
        mr_audits: number;
    };
}

export default function ImHub({ stats }: Props) {
    const categories = [
        {
            no: 1,
            title: 'IT Master Plan & Strategy',
            th: 'แผนแม่บทเทคโนโลยีสารสนเทศและแผนปฏิบัติการ',
            desc: 'Strategic Alignment, Action Plan Manager, PDCA Tracking และสรุปผลย้อนหลัง 2-3 ปี',
            icon: Target,
            color: 'text-sky-600',
            bg: 'bg-sky-100',
            gradient: 'from-sky-500 to-blue-600',
            href: '/im/master-plan',
        },
        {
            no: 2,
            title: 'IT Risk Management',
            th: 'บริหารจัดการความเสี่ยงด้านสารสนเทศ',
            desc: 'ประเมินความเสี่ยง P×I, กลยุทธ์ 4 ด้าน (Avoid/Reduce/Share/Accept), เปรียบเทียบก่อน-หลัง',
            icon: ShieldAlert,
            color: 'text-rose-600',
            bg: 'bg-rose-100',
            gradient: 'from-rose-500 to-red-600',
            href: '/im/risk',
        },
        {
            no: 3,
            title: 'Security, PDPA & BCP',
            th: 'นโยบายความมั่นคงปลอดภัยและการกู้คืนระบบ',
            desc: 'ศูนย์นโยบาย/PDPA, ประเมินความเข้าใจบุคลากร, ซ้อมแผน BCP/DRP, บันทึก Backup',
            icon: Lock,
            color: 'text-violet-600',
            bg: 'bg-violet-100',
            gradient: 'from-violet-500 to-purple-600',
            href: '/im/security',
        },
        {
            no: 4,
            title: 'Service Desk & Incident',
            th: 'รับเรื่อง บันทึกอุบัติการณ์ และประเมินเจ้าหน้าที่ IT',
            desc: 'SLA Monitor, Incident/Problem ตามมาตรฐาน HAIT, Timesheet และประเมินผลเจ้าหน้าที่ IT ทุก 3/6/12 เดือน',
            icon: Headset,
            color: 'text-amber-600',
            bg: 'bg-amber-100',
            gradient: 'from-amber-500 to-orange-600',
            href: '/im/service-desk',
        },
        {
            no: 5,
            title: 'Medical Record Quality',
            th: 'ควบคุมคุณภาพเวชระเบียน (OPD/IPD Audit)',
            desc: 'สุ่มตรวจให้คะแนน, แดชบอร์ดรายหัวข้อ/รายแพทย์, ตรวจการพิมพ์และความขัดแย้งข้อมูล',
            icon: FileCheck,
            color: 'text-emerald-600',
            bg: 'bg-emerald-100',
            gradient: 'from-emerald-500 to-teal-600',
            href: '/im/medical-record',
        },
        {
            no: 6,
            title: 'Software Development QA',
            th: 'ควบคุมคุณภาพการพัฒนาโปรแกรม',
            desc: 'คลังเอกสาร SDLC, เชื่อม Git Repository, บันทึกผล Code Review',
            icon: Code2,
            color: 'text-indigo-600',
            bg: 'bg-indigo-100',
            gradient: 'from-indigo-500 to-blue-600',
            href: '/im/software-qa',
        },
        {
            no: 7,
            title: 'Resource, Competency & Change',
            th: 'จัดการทรัพยากร ความรู้ และการเปลี่ยนแปลง',
            desc: 'ทะเบียนสินทรัพย์+Utilization, Gap Analysis, Competency/IDP, Change Request',
            icon: Server,
            color: 'text-cyan-600',
            bg: 'bg-cyan-100',
            gradient: 'from-cyan-500 to-sky-600',
            href: '/im/resource',
        },
    ];

    const kpis = [
        { label: 'แผนแม่บท', value: stats.plans, sub: `${stats.action_plans} โครงการ`, icon: ClipboardList, color: 'text-sky-600', bg: 'bg-sky-50' },
        { label: 'ความเสี่ยงคงค้าง', value: stats.open_risks, sub: 'รายการ', icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50' },
        { label: 'นโยบายเผยแพร่', value: stats.policies, sub: 'ฉบับ', icon: FileText, color: 'text-violet-600', bg: 'bg-violet-50' },
        { label: 'Ticket เปิดอยู่', value: stats.open_tickets, sub: `${stats.open_incidents} อุบัติการณ์`, icon: Ticket, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Change รออนุมัติ', value: stats.pending_changes, sub: 'คำขอ', icon: GitPullRequest, color: 'text-cyan-600', bg: 'bg-cyan-50' },
        { label: 'ตรวจเวชระเบียน', value: stats.mr_audits, sub: 'ครั้งปีนี้', icon: FileCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ];

    return (
        <AppLayout breadcrumbs={[{ title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' }, { title: 'งานสารสนเทศ (IM)', href: '/im' }]}>
            <Head title="งานสารสนเทศ (IM)" />

            <div className="min-h-screen bg-slate-50/60">
                {/* Hero */}
                <div className="relative overflow-hidden border-b border-slate-100 bg-white">
                    <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-blue-50/40 to-indigo-50 opacity-70" />
                    <div className="relative mx-auto max-w-7xl px-6 py-10 sm:py-12">
                        <div className="flex flex-wrap items-end justify-between gap-6">
                            <div className="max-w-3xl">
                                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white px-3 py-1 text-sm font-medium text-sky-600 shadow-sm">
                                    <Sparkles className="h-4 w-4 text-sky-500" />
                                    <span className="bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent">
                                        IT Management System · HAIT
                                    </span>
                                </div>
                                <h1 className="mb-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                                    งานสารสนเทศโรงพยาบาล (IM)
                                </h1>
                                <p className="text-lg leading-relaxed text-slate-600">
                                    บริหารจัดการงานเทคโนโลยีสารสนเทศครบทั้ง 7 หมวดตามมาตรฐาน HAIT ตั้งแต่แผนแม่บท ความเสี่ยง ความปลอดภัย จนถึงคุณภาพเวชระเบียนและการพัฒนาโปรแกรม
                                </p>
                            </div>
                            <Link
                                href="/im/manual"
                                className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50"
                            >
                                <BookOpen className="h-4 w-4" />
                                คู่มือการใช้งาน
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
                    <ImSubNav active="im.index" />

                    {/* KPI */}
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                        {kpis.map((kpi) => {
                            const Icon = kpi.icon;
                            return (
                                <div key={kpi.label} className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
                                    <div className={cn('mb-3 flex h-10 w-10 items-center justify-center rounded-xl', kpi.bg)}>
                                        <Icon className={cn('h-5 w-5', kpi.color)} />
                                    </div>
                                    <div className="text-2xl font-bold text-slate-900">{kpi.value}</div>
                                    <div className="text-xs font-medium text-slate-500">{kpi.label}</div>
                                    <div className="text-[11px] text-slate-400">{kpi.sub}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Category cards */}
                    <div>
                        <h2 className="mb-4 text-lg font-bold text-slate-900">7 หมวดงานสารสนเทศ</h2>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {categories.map((cat) => {
                                const Icon = cat.icon;
                                return (
                                    <Link
                                        key={cat.no}
                                        href={cat.href}
                                        className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-sky-100 hover:shadow-xl"
                                    >
                                        <div className={cn('absolute left-0 top-0 h-1 w-full bg-gradient-to-r opacity-0 transition-opacity duration-300 group-hover:opacity-100', cat.gradient)} />
                                        <div className="p-6">
                                            <div className="mb-4 flex items-center justify-between">
                                                <div className={cn('flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110', cat.bg)}>
                                                    <Icon className={cn('h-7 w-7', cat.color)} />
                                                </div>
                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                                                    หมวด {cat.no}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900 transition-colors group-hover:text-sky-700">
                                                {cat.title}
                                            </h3>
                                            <p className="mt-1 text-sm font-medium text-slate-600">{cat.th}</p>
                                            <p className="mt-3 text-sm leading-relaxed text-slate-500">{cat.desc}</p>
                                        </div>
                                        <div className="mt-auto flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-3 text-sm font-semibold text-sky-600">
                                            <span>เข้าใช้งาน</span>
                                            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
