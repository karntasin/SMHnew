import React, { useMemo, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
    Download,
    Printer,
    BarChart3,
    Target,
    CheckCircle2,
    Calendar,
    FileText,
    FileSearch,
    Stethoscope,
    BedDouble,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QualityPage, StatCard, Panel, StatusPill, EmptyState, Field, qualityInput } from '@/components/quality/quality-ui';
import MraSubNav, { mraBreadcrumbs } from './MraSubNav';

interface CategoryStat {
    id: number;
    code: string;
    name: string;
    audit_type?: string;
    total: number;
    passed: number;
    failed: number;
    accuracy: number;
}

interface TopError {
    criteria_code: string;
    criteria_name: string;
    category_name: string;
    audit_type?: string;
    fail_count: number;
}

interface ChannelStats {
    total_audits: number;
    completed_audits: number;
    avg_accuracy: number;
    passed_audits?: number;
    target: number;
}

interface ChannelBlock {
    stats: ChannelStats;
    categoryStats: CategoryStat[];
    topErrors: TopError[];
}

interface Props {
    stats: ChannelStats;
    opd: ChannelBlock;
    ipd: ChannelBlock;
    categoryStats?: CategoryStat[];
    topErrors?: TopError[];
    filters: {
        from_date: string;
        to_date: string;
        channel?: 'all' | 'opd' | 'ipd';
    };
}

function CategoryTable({ rows, emptyText }: { rows: CategoryStat[]; emptyText: string }) {
    if (rows.length === 0) {
        return <EmptyState text={emptyText} />;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                        <th className="w-24 py-2 pr-3">รหัส</th>
                        <th className="py-2 pr-3">หมวดหมู่</th>
                        <th className="py-2 pr-3 text-center">ตรวจ</th>
                        <th className="py-2 pr-3 text-center">ผ่าน</th>
                        <th className="py-2 pr-3 text-center">ไม่ผ่าน</th>
                        <th className="w-48 py-2 pr-3">ความถูกต้อง</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((cat) => (
                        <tr key={cat.id} className="border-b border-slate-50">
                            <td className="py-2.5 pr-3 font-mono text-slate-600">{cat.code}</td>
                            <td className="py-2.5 pr-3 font-medium text-slate-800">{cat.name}</td>
                            <td className="py-2.5 pr-3 text-center text-slate-600">{cat.total}</td>
                            <td className="py-2.5 pr-3 text-center text-emerald-600">{cat.passed}</td>
                            <td className="py-2.5 pr-3 text-center text-rose-600">{cat.failed}</td>
                            <td className="py-2.5 pr-3">
                                <div className="flex items-center gap-2">
                                    <Progress
                                        value={cat.accuracy}
                                        className={cn(
                                            'h-2 flex-1',
                                            cat.accuracy >= 80
                                                ? '[&>div]:bg-emerald-500'
                                                : cat.accuracy >= 70
                                                  ? '[&>div]:bg-amber-500'
                                                  : '[&>div]:bg-rose-500',
                                        )}
                                    />
                                    <span
                                        className={cn(
                                            'w-12 text-right text-sm font-medium',
                                            cat.accuracy >= 80
                                                ? 'text-emerald-600'
                                                : cat.accuracy >= 70
                                                  ? 'text-amber-600'
                                                  : 'text-rose-600',
                                        )}
                                    >
                                        {cat.accuracy}%
                                    </span>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function ErrorsTable({ rows, emptyText }: { rows: TopError[]; emptyText: string }) {
    if (rows.length === 0) {
        return <EmptyState text={emptyText} />;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                        <th className="w-12 py-2 pr-3">#</th>
                        <th className="w-24 py-2 pr-3">รหัส</th>
                        <th className="py-2 pr-3">รายการ</th>
                        <th className="py-2 pr-3">หมวด</th>
                        <th className="py-2 pr-3 text-center">จำนวนครั้ง</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((error, index) => (
                        <tr key={`${error.criteria_code}-${index}`} className="border-b border-slate-50">
                            <td className="py-2.5 pr-3 text-slate-500">{index + 1}</td>
                            <td className="py-2.5 pr-3 font-mono text-xs text-slate-600">{error.criteria_code}</td>
                            <td className="py-2.5 pr-3 font-medium text-slate-800">{error.criteria_name}</td>
                            <td className="py-2.5 pr-3 text-slate-500">{error.category_name}</td>
                            <td className="py-2.5 pr-3 text-center">
                                <StatusPill label={String(error.fail_count)} className="border-rose-200 bg-rose-50 text-rose-700" />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function ChannelSection({
    title,
    badge,
    tone,
    icon: Icon,
    block,
}: {
    title: string;
    badge: string;
    tone: 'emerald' | 'violet';
    icon: React.ComponentType<{ className?: string }>;
    block: ChannelBlock;
}) {
    const shell =
        tone === 'emerald'
            ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-white'
            : 'border-violet-200 bg-gradient-to-br from-violet-50/80 via-white to-white';
    const badgeClass =
        tone === 'emerald'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-violet-200 bg-violet-50 text-violet-800';

    return (
        <section className={cn('space-y-4 rounded-[1.75rem] border p-4 shadow-sm sm:p-5', shell)}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div
                        className={cn(
                            'flex h-11 w-11 items-center justify-center rounded-2xl',
                            tone === 'emerald' ? 'bg-emerald-600 text-white' : 'bg-violet-600 text-white',
                        )}
                    >
                        <Icon className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                            <StatusPill label={badge} className={badgeClass} />
                        </div>
                        <p className="text-sm text-slate-500">
                            สรุปผลการตรวจ · เกณฑ์ผ่าน {block.stats.target}% · ตรวจเสร็จ {block.stats.completed_audits} ราย
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label="ตรวจสอบทั้งหมด" value={block.stats.total_audits} icon={FileText} tone="indigo" />
                <StatCard label="ตรวจเสร็จสิ้น" value={block.stats.completed_audits} icon={CheckCircle2} tone="emerald" />
                <StatCard
                    label="ความถูกต้องเฉลี่ย"
                    value={`${block.stats.avg_accuracy}%`}
                    icon={BarChart3}
                    tone={block.stats.avg_accuracy >= 80 ? 'emerald' : block.stats.avg_accuracy >= 70 ? 'amber' : 'rose'}
                />
                <StatCard
                    label={`ผ่านเกณฑ์ ≥${block.stats.target}%`}
                    value={block.stats.passed_audits ?? 0}
                    icon={Target}
                    tone="violet"
                />
            </div>

            <Panel
                title={`ผลตามหมวด · ${badge}`}
                description={badge === 'OPD' ? '7 หมวดตามเกณฑ์ผู้ป่วยนอก MRA 2563' : '12 หมวดตามเกณฑ์ผู้ป่วยใน MRA 2563'}
            >
                <CategoryTable rows={block.categoryStats} emptyText={`ยังไม่มีข้อมูลหมวด${badge}ในช่วงที่เลือก`} />
            </Panel>

            <Panel title={`ข้อผิดพลาดที่พบบ่อย · ${badge}`} description="Top 10 รายการที่ไม่ผ่านบ่อยที่สุดในช่องทางนี้">
                <ErrorsTable rows={block.topErrors} emptyText={`ไม่พบข้อผิดพลาด${badge}ในช่วงเวลาที่เลือก`} />
            </Panel>
        </section>
    );
}

export default function MraReports({ stats, opd, ipd, filters }: Props) {
    const [fromDate, setFromDate] = useState(filters.from_date);
    const [toDate, setToDate] = useState(filters.to_date);
    const [channel, setChannel] = useState<'all' | 'opd' | 'ipd'>(filters.channel || 'all');

    const handleFilter = () => {
        router.get(
            '/mra/reports',
            {
                from_date: fromDate,
                to_date: toDate,
                channel,
            },
            { preserveState: true },
        );
    };

    const pdfHref = useMemo(() => {
        const params = new URLSearchParams({
            from_date: fromDate,
            to_date: toDate,
            channel,
        });

        return `${route('mra.reports.export-pdf')}?${params.toString()}`;
    }, [fromDate, toDate, channel]);

    const visibleSections = useMemo(() => {
        if (channel === 'opd') return ['opd'] as const;
        if (channel === 'ipd') return ['ipd'] as const;
        return ['opd', 'ipd'] as const;
    }, [channel]);

    return (
        <QualityPage
            tone="indigo"
            icon={FileSearch}
            badge="ศูนย์พัฒนาคุณภาพ · MRA"
            title="รายงานสรุปผลการตรวจ"
            subtitle="แยกสรุป OPD และ IPD ตามเกณฑ์ MRA ปี 2563"
            breadcrumbs={mraBreadcrumbs({ title: 'รายงาน', href: route('mra.reports') })}
            headTitle="รายงาน MRA"
            actions={
                <div className="flex gap-2 print:hidden">
                    <Button variant="outline" onClick={() => window.print()} className="rounded-xl">
                        <Printer className="mr-2 h-4 w-4" />
                        พิมพ์
                    </Button>
                    <Button variant="outline" className="rounded-xl" asChild>
                        <a href={pdfHref} target="_blank" rel="noreferrer">
                            <Download className="mr-2 h-4 w-4" />
                            ส่งออก PDF
                        </a>
                    </Button>
                </div>
            }
            subNav={<MraSubNav active="mra.reports" />}
        >
            <div className="hidden text-center print:block">
                <h1 className="text-xl font-bold">รายงานสรุปผลการตรวจสอบคุณภาพเวชระเบียน</h1>
                <p className="text-sm">แยก OPD / IPD · ตามเกณฑ์ MRA 2563</p>
                <p className="mt-2 text-sm">
                    ช่วงวันที่: {new Date(fromDate).toLocaleDateString('th-TH')} - {new Date(toDate).toLocaleDateString('th-TH')}
                </p>
            </div>

            <Panel title="ตัวกรองรายงาน" description="เลือกช่วงวันที่และช่องทางที่ต้องการดู" className="print:hidden">
                <div className="flex flex-wrap items-end gap-4">
                    <Field label="จากวันที่">
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className={cn(qualityInput, 'w-44')}
                        />
                    </Field>
                    <Field label="ถึงวันที่">
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className={cn(qualityInput, 'w-44')}
                        />
                    </Field>
                    <Field label="ช่องทาง">
                        <div className="flex flex-wrap gap-2">
                            {(
                                [
                                    ['all', 'ทั้งหมด'],
                                    ['opd', 'OPD'],
                                    ['ipd', 'IPD'],
                                ] as const
                            ).map(([key, label]) => (
                                <Button
                                    key={key}
                                    type="button"
                                    variant={channel === key ? 'default' : 'outline'}
                                    className={cn(
                                        'rounded-xl',
                                        channel === key && key === 'opd' && 'bg-emerald-600 hover:bg-emerald-700',
                                        channel === key && key === 'ipd' && 'bg-violet-600 hover:bg-violet-700',
                                        channel === key && key === 'all' && 'bg-indigo-600 hover:bg-indigo-700',
                                    )}
                                    onClick={() => setChannel(key)}
                                >
                                    {label}
                                </Button>
                            ))}
                        </div>
                    </Field>
                    <Button onClick={handleFilter} className="rounded-xl bg-indigo-600 hover:bg-indigo-700">
                        <Calendar className="mr-2 h-4 w-4" />
                        แสดงรายงาน
                    </Button>
                </div>
            </Panel>

            {channel === 'all' ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <StatCard label="ทั้งหมด (OPD+IPD)" value={stats.total_audits} icon={FileText} tone="indigo" />
                    <StatCard label="ตรวจเสร็จสิ้น" value={stats.completed_audits} icon={CheckCircle2} tone="emerald" />
                    <StatCard
                        label="ความถูกต้องเฉลี่ยรวม"
                        value={`${stats.avg_accuracy}%`}
                        icon={BarChart3}
                        tone={stats.avg_accuracy >= 80 ? 'emerald' : stats.avg_accuracy >= 70 ? 'amber' : 'rose'}
                    />
                    <StatCard label="เป้าหมายผ่าน" value={`${stats.target}%`} icon={Target} tone="violet" />
                </div>
            ) : null}

            {visibleSections.includes('opd') ? (
                <ChannelSection title="ผู้ป่วยนอก" badge="OPD" tone="emerald" icon={Stethoscope} block={opd} />
            ) : null}

            {visibleSections.includes('ipd') ? (
                <ChannelSection title="ผู้ป่วยใน" badge="IPD" tone="violet" icon={BedDouble} block={ipd} />
            ) : null}

            <div className="print:hidden">
                <Link href="/mra">
                    <Button variant="outline" className="rounded-xl">
                        กลับรายการตรวจ
                    </Button>
                </Link>
            </div>
        </QualityPage>
    );
}
