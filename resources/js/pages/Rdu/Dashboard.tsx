import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ThaiDatePicker, formatThaiDateFromIso } from '@/components/ui/thai-date-picker';
import { cn } from '@/lib/utils';
import {
    Activity,
    AlertTriangle,
    ArrowRight,
    ClipboardList,
    Filter,
    Pill,
    ShieldAlert,
    TrendingUp,
} from 'lucide-react';
import RduSubNav from '@/pages/Rdu/RduSubNav';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface Connection {
    connected: boolean;
    database?: string | null;
    message?: string;
}

interface Indicator {
    id: string;
    group: string;
    group_label: string;
    name: string;
    name_th: string;
    description: string;
    color?: string;
    denominator: number;
    case_count: number;
    rate: number | null;
    rate_label: string;
}

interface Props {
    connection: Connection;
    filter: {
        start_date: string;
        end_date: string;
        start_date_label?: string;
        end_date_label?: string;
    };
    summary: {
        total_cases: number;
        group_a_cases: number;
        group_b_cases: number;
        indicator_count: number;
        worst_indicator: Indicator | null;
    };
    indicators: Indicator[];
    chart: {
        by_group: { name: string; value: number }[];
    };
}

const PIE_COLORS = ['#f43f5e', '#8b5cf6'];

const colorMap: Record<string, string> = {
    rose: 'border-rose-200 bg-rose-50/80',
    orange: 'border-orange-200 bg-orange-50/80',
    amber: 'border-amber-200 bg-amber-50/80',
    violet: 'border-violet-200 bg-violet-50/80',
    fuchsia: 'border-fuchsia-200 bg-fuchsia-50/80',
    sky: 'border-sky-200 bg-sky-50/80',
};

const rateColor = (rate: number | null) => {
    if (rate == null) return 'text-slate-400';
    if (rate >= 40) return 'text-rose-600';
    if (rate >= 20) return 'text-amber-600';
    return 'text-emerald-600';
};

export default function RduDashboard({ connection, filter, summary, indicators, chart }: Props) {
    const [startDate, setStartDate] = useState(filter.start_date);
    const [endDate, setEndDate] = useState(filter.end_date);

    const applyFilter = () => {
        router.get(route('rdu.index'), { start_date: startDate, end_date: endDate }, { preserveState: true });
    };

    const groupA = indicators.filter((i) => i.group === 'A');
    const groupB = indicators.filter((i) => i.group === 'B');

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
                { title: 'เภสัชกรรม', href: '/pharmacy' },
                { title: 'รายงาน RDU', href: '/rdu' },
            ]}
        >
            <Head title="RDU Dashboard" />

            <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dcfce7_0,#f8fafc_36%,#ffffff_72%)]">
                <div className="relative overflow-hidden border-b border-emerald-100 bg-white/80 backdrop-blur">
                    <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
                    <div className="absolute left-1/3 top-12 h-32 w-32 rounded-full bg-cyan-200/40 blur-2xl" />
                    <div className="relative mx-auto max-w-7xl px-6 py-9">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700 shadow-sm">
                                    <Pill className="h-3.5 w-3.5" />
                                    Quality Center · Rational Drug Use
                                </div>
                                <h1 className="bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-4xl">
                                    รายงาน RDU โรงพยาบาล
                                </h1>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                                    ภาพรวมตัวชี้วัดการใช้ยาอย่างสมเหตุผล จากข้อมูลจริงใน HOSxP — สำหรับทีมเภสัชกรรมและคณะกรรมการยา
                                </p>
                            </div>

                            <div className="flex flex-wrap items-end gap-3 rounded-3xl border border-white/70 bg-white/85 p-4 shadow-xl shadow-emerald-900/5 backdrop-blur">
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500">วันเริ่ม</Label>
                                    <ThaiDatePicker value={startDate} onChange={setStartDate} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500">วันสิ้นสุด</Label>
                                    <ThaiDatePicker value={endDate} onChange={setEndDate} />
                                </div>
                                <Button onClick={applyFilter} className="gap-1">
                                    <Filter className="h-4 w-4" />
                                    กรอง
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href={route('rdu.cases', { start_date: startDate, end_date: endDate })}>
                                        <ClipboardList className="mr-1 h-4 w-4" />
                                        Case Audit
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        {!connection.connected && (
                            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                <AlertTriangle className="mr-2 inline h-4 w-4" />
                                {connection.message || 'เชื่อมต่อ HOSxP ไม่ได้'}
                            </div>
                        )}

                        <div className="mt-6">
                            <RduSubNav active="rdu.index" startDate={startDate} endDate={endDate} />
                        </div>
                    </div>
                </div>

                <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <Card className="overflow-hidden border-white/70 bg-white/90 shadow-lg shadow-slate-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-1">
                                    <Activity className="h-4 w-4" /> Case ที่เข้าเงื่อนไข
                                </CardDescription>
                                <CardTitle className="text-3xl tabular-nums">{summary.total_cases.toLocaleString()}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs text-slate-500">
                                ช่วง {filter.start_date_label || formatThaiDateFromIso(filter.start_date)} –{' '}
                                {filter.end_date_label || formatThaiDateFromIso(filter.end_date)}
                            </CardContent>
                        </Card>

                        <Card className="overflow-hidden border-rose-100 bg-white/90 shadow-lg shadow-rose-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                            <CardHeader className="pb-2">
                                <CardDescription>กลุ่ม A · Antibiotic</CardDescription>
                                <CardTitle className="text-3xl tabular-nums text-rose-600">
                                    {summary.group_a_cases.toLocaleString()}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs text-slate-500">URI / ท้องเสีย / แผลสด + AB</CardContent>
                        </Card>

                        <Card className="overflow-hidden border-violet-100 bg-white/90 shadow-lg shadow-violet-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                            <CardHeader className="pb-2">
                                <CardDescription>กลุ่ม B · High-risk</CardDescription>
                                <CardTitle className="text-3xl tabular-nums text-violet-600">
                                    {summary.group_b_cases.toLocaleString()}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs text-slate-500">CKD-NSAID / Duplicate / Elderly BZD</CardContent>
                        </Card>

                        <Card className="overflow-hidden border-amber-100 bg-white/90 shadow-lg shadow-amber-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-1">
                                    <TrendingUp className="h-4 w-4" /> อัตราสูงสุด
                                </CardDescription>
                                <CardTitle className={cn('text-3xl tabular-nums', rateColor(summary.worst_indicator?.rate ?? null))}>
                                    {summary.worst_indicator?.rate_label ?? '—'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="truncate text-xs text-slate-500">
                                {summary.worst_indicator?.name_th ?? 'ยังไม่มีข้อมูล'}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <Card className="overflow-hidden border-white/70 bg-white/90 shadow-xl shadow-slate-900/5 lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="text-base">สรุปตามกลุ่มตัวชี้วัด</CardTitle>
                                <CardDescription>จำนวน case ที่เข้าเงื่อนไขผิดปกติ</CardDescription>
                            </CardHeader>
                            <CardContent className="h-64">
                                {chart.by_group.some((g) => g.value > 0) ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={chart.by_group}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={55}
                                                outerRadius={90}
                                                paddingAngle={3}
                                            >
                                                {chart.by_group.map((_, i) => (
                                                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(v: number) => `${v.toLocaleString()} cases`} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex h-full items-center justify-center text-sm text-slate-400">
                                        ไม่พบ case ในช่วงเวลานี้
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="overflow-hidden border-white/70 bg-white/90 shadow-xl shadow-emerald-900/5">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <ShieldAlert className="h-4 w-4 text-emerald-600" />
                                    วิธีใช้ Phase 1
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-slate-600">
                                <p>1. ดูภาพรวมตัวชี้วัดด้านล่าง</p>
                                <p>2. กด &quot;ดู Case&quot; เพื่อเปิดรายการตรวจย้อนหลัง</p>
                                <p>3. บันทึกสถานะทบทวนไว้ในระบบท้องถิ่น (ฐานข้อมูล Phase 2)</p>
                                <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                                    นิยาม ICD/ยาปรับได้ที่ <code className="rounded bg-white px-1">config/rdu.php</code>
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <IndicatorSection
                        title="กลุ่ม A: Antibiotic RDU"
                        subtitle="การใช้ยาปฏิชีวนะในโรคที่มักไม่จำเป็น"
                        items={groupA}
                        startDate={startDate}
                        endDate={endDate}
                    />

                    <IndicatorSection
                        title="กลุ่ม B: High-risk Drug"
                        subtitle="ยาที่มีความเสี่ยงสูงในกลุ่มผู้ป่วยเฉพาะ"
                        items={groupB}
                        startDate={startDate}
                        endDate={endDate}
                    />
                </div>
            </div>
        </AppLayout>
    );
}

function IndicatorSection({
    title,
    subtitle,
    items,
    startDate,
    endDate,
}: {
    title: string;
    subtitle: string;
    items: Indicator[];
    startDate: string;
    endDate: string;
}) {
    return (
        <div>
            <div className="mb-3">
                <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                <p className="text-sm text-slate-500">{subtitle}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                    <Card
                        key={item.id}
                        className={cn('border shadow-sm transition hover:shadow-md', colorMap[item.color || ''] || 'border-slate-200')}
                    >
                        <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <Badge variant="outline" className="mb-2 text-[10px]">
                                        {item.id}
                                    </Badge>
                                    <CardTitle className="text-base leading-snug">{item.name_th}</CardTitle>
                                </div>
                                <div className={cn('text-right text-2xl font-bold tabular-nums', rateColor(item.rate))}>
                                    {item.rate_label}
                                </div>
                            </div>
                            <CardDescription className="line-clamp-2 text-xs">{item.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
                                <div className="rounded-lg bg-white/70 px-3 py-2">
                                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Cases</p>
                                    <p className="font-semibold tabular-nums text-slate-800">{item.case_count.toLocaleString()}</p>
                                </div>
                                <div className="rounded-lg bg-white/70 px-3 py-2">
                                    <p className="text-[10px] uppercase tracking-wide text-slate-400">ฐาน (Denom)</p>
                                    <p className="font-semibold tabular-nums text-slate-800">{item.denominator.toLocaleString()}</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" className="w-full justify-between" asChild>
                                <Link
                                    href={route('rdu.cases', {
                                        indicator: item.id,
                                        start_date: startDate,
                                        end_date: endDate,
                                    })}
                                >
                                    ดู Case Audit
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
