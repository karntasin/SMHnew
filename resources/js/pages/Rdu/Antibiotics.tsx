import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ThaiDatePicker, formatThaiDateFromIso } from '@/components/ui/thai-date-picker';
import RduSubNav from '@/pages/Rdu/RduSubNav';
import { cn } from '@/lib/utils';
import { AlertTriangle, ArrowRight, Filter, Pill, Syringe, TrendingUp } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    Legend,
} from 'recharts';

interface Indicator {
    id: string;
    name_th: string;
    case_count: number;
    denominator: number;
    rate: number | null;
    rate_label: string;
    color?: string;
}

interface Props {
    connection: { connected: boolean; message?: string };
    filter: {
        start_date: string;
        end_date: string;
        start_date_label?: string;
        end_date_label?: string;
    };
    summary: {
        prescription_lines: number;
        ab_visits: number;
        patients: number;
        distinct_drugs: number;
        total_qty: number;
        total_amount: number;
    };
    top_antibiotics: {
        rank: number;
        drug_code: string;
        drug_name: string;
        therapeutic_group: string;
        total_qty: number;
        visits: number;
    }[];
    by_therapeutic_group: { name: string; visits: number; total_qty: number }[];
    monthly_trend: { period: string; label: string; ab_visits: number; ab_qty: number }[];
    rdu_indicators: Indicator[];
}

const fmtNum = (n: number) => n.toLocaleString('th-TH');

const rateColor = (rate: number | null) => {
    if (rate == null) return 'text-slate-400';
    if (rate >= 40) return 'text-rose-600';
    if (rate >= 20) return 'text-amber-600';
    return 'text-emerald-600';
};

export default function Antibiotics({
    connection,
    filter,
    summary,
    top_antibiotics,
    by_therapeutic_group,
    monthly_trend,
    rdu_indicators,
}: Props) {
    const [startDate, setStartDate] = useState(filter.start_date);
    const [endDate, setEndDate] = useState(filter.end_date);

    const applyFilter = () => {
        router.get(route('rdu.drugs.antibiotics'), { start_date: startDate, end_date: endDate }, { preserveState: true });
    };

    const groupChart = by_therapeutic_group.slice(0, 8).map((g) => ({
        name: g.name.length > 18 ? g.name.slice(0, 18) + '…' : g.name,
        qty: g.total_qty,
    }));

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
                { title: 'เภสัชกรรม', href: '/pharmacy' },
                { title: 'รายงาน RDU', href: '/rdu' },
                { title: 'Antibiotics', href: '/rdu/drugs/antibiotics' },
            ]}
        >
            <Head title="Antibiotic Report" />

            <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ffe4e6_0,#f8fafc_38%,#ffffff_76%)]">
                <div className="relative overflow-hidden border-b border-rose-100 bg-white/80 backdrop-blur">
                    <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-rose-200/45 blur-3xl" />
                    <div className="absolute left-1/4 top-10 h-36 w-36 rounded-full bg-emerald-200/40 blur-2xl" />
                    <div className="relative mx-auto max-w-7xl px-6 py-9">
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rose-700 shadow-sm">
                            <Syringe className="h-3.5 w-3.5" />
                            Antibiotic Utilization · Phase 1.5
                        </div>
                        <h1 className="bg-gradient-to-r from-rose-700 via-pink-700 to-emerald-700 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-4xl">รายงานยาปฏิชีวนะ</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Top AB, กลุ่มเวชภัณฑ์, แนวโน้มรายเดือน และตัวชี้วัด RDU กลุ่ม A</p>

                        <div className="mt-6 space-y-4">
                            <RduSubNav active="rdu.drugs.antibiotics" startDate={startDate} endDate={endDate} />

                            <div className="flex flex-wrap items-end gap-3 rounded-3xl border border-white/70 bg-white/85 p-4 shadow-xl shadow-rose-900/5 backdrop-blur">
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
                            </div>
                        </div>

                        {!connection.connected && (
                            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                <AlertTriangle className="mr-2 inline h-4 w-4" />
                                {connection.message || 'เชื่อมต่อ HOSxP ไม่ได้'}
                            </div>
                        )}
                    </div>
                </div>

                <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <Card className="overflow-hidden border-rose-100 bg-white/90 shadow-lg shadow-rose-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                            <CardHeader className="pb-2">
                                <CardDescription>Visit ที่ได้ AB</CardDescription>
                                <CardTitle className="text-3xl tabular-nums text-rose-600">{fmtNum(summary.ab_visits)}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs text-slate-500">{fmtNum(summary.prescription_lines)} รายการจ่าย</CardContent>
                        </Card>
                        <Card className="overflow-hidden border-white/70 bg-white/90 shadow-lg shadow-slate-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                            <CardHeader className="pb-2">
                                <CardDescription>ผู้ป่วย / ชนิดยา AB</CardDescription>
                                <CardTitle className="text-3xl tabular-nums">
                                    {fmtNum(summary.patients)} / {fmtNum(summary.distinct_drugs)}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs text-slate-500">HN ที่ได้ AB · icode ที่แตกต่าง</CardContent>
                        </Card>
                        <Card className="overflow-hidden border-white/70 bg-white/90 shadow-lg shadow-slate-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                            <CardHeader className="pb-2">
                                <CardDescription>จำนวน AB รวม</CardDescription>
                                <CardTitle className="text-3xl tabular-nums">{fmtNum(summary.total_qty)}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs text-slate-500">หน่วยจาก opitemrece</CardContent>
                        </Card>
                        <Card className="overflow-hidden border-white/70 bg-white/90 shadow-lg shadow-slate-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-1">
                                    <TrendingUp className="h-4 w-4" /> มูลค่า AB
                                </CardDescription>
                                <CardTitle className="text-3xl tabular-nums">
                                    {summary.total_amount.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs text-slate-500">
                                {filter.start_date_label || formatThaiDateFromIso(filter.start_date)} –{' '}
                                {filter.end_date_label || formatThaiDateFromIso(filter.end_date)}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <Card className="overflow-hidden border-white/70 bg-white/90 shadow-xl shadow-rose-900/5">
                            <CardHeader>
                                <CardTitle className="text-base">Top 20 ยาปฏิชีวนะ</CardTitle>
                            </CardHeader>
                            <CardContent className="max-h-96 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-white/95 backdrop-blur">
                                        <tr className="border-b bg-rose-50/70 text-left text-xs text-slate-500">
                                            <th className="pb-2 pr-2">#</th>
                                            <th className="pb-2 pr-2">ชื่อยา</th>
                                            <th className="pb-2 pr-2 text-right">Qty</th>
                                            <th className="pb-2 text-right">Visit</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {top_antibiotics.map((d) => (
                                            <tr key={d.drug_code} className="border-b border-slate-100 transition hover:bg-rose-50/60">
                                                <td className="py-2 pr-2 text-slate-400">{d.rank}</td>
                                                <td className="py-2 pr-2">
                                                    <p className="font-medium">{d.drug_name}</p>
                                                    <p className="text-[10px] text-slate-400">{d.therapeutic_group}</p>
                                                </td>
                                                <td className="py-2 pr-2 text-right tabular-nums">{fmtNum(d.total_qty)}</td>
                                                <td className="py-2 text-right tabular-nums">{fmtNum(d.visits)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>

                        <Card className="overflow-hidden border-white/70 bg-white/90 shadow-xl shadow-rose-900/5">
                            <CardHeader>
                                <CardTitle className="text-base">ตามกลุ่มเวชภัณฑ์</CardTitle>
                            </CardHeader>
                            <CardContent className="h-80">
                                {groupChart.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={groupChart}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={70} />
                                            <YAxis tickFormatter={(v) => fmtNum(v)} />
                                            <Tooltip formatter={(v: number) => fmtNum(v)} />
                                            <Bar dataKey="qty" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex h-full items-center justify-center text-sm text-slate-400">ไม่มีข้อมูล</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="overflow-hidden border-white/70 bg-white/90 shadow-xl shadow-rose-900/5">
                        <CardHeader>
                            <CardTitle className="text-base">แนวโน้ม AB รายเดือน</CardTitle>
                        </CardHeader>
                        <CardContent className="h-64">
                            {monthly_trend.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={monthly_trend}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                        <YAxis yAxisId="left" tickFormatter={(v) => fmtNum(v)} />
                                        <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => fmtNum(v)} />
                                        <Tooltip />
                                        <Legend />
                                        <Line yAxisId="left" type="monotone" dataKey="ab_visits" name="Visit AB" stroke="#f43f5e" strokeWidth={2} />
                                        <Line yAxisId="right" type="monotone" dataKey="ab_qty" name="Qty AB" stroke="#6366f1" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center text-sm text-slate-400">ไม่มีข้อมูล</div>
                            )}
                        </CardContent>
                    </Card>

                    <div>
                        <div className="mb-3 flex items-center gap-2">
                            <Pill className="h-5 w-5 text-emerald-600" />
                            <h2 className="text-lg font-semibold text-slate-900">ตัวชี้วัด RDU กลุ่ม A (Antibiotic)</h2>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            {rdu_indicators.map((ind) => (
                                <Card key={ind.id} className="overflow-hidden border-white/70 bg-white/90 shadow-lg shadow-slate-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <Badge variant="outline" className="mb-2 text-[10px]">
                                                    {ind.id}
                                                </Badge>
                                                <CardTitle className="text-base leading-snug">{ind.name_th}</CardTitle>
                                            </div>
                                            <span className={cn('text-2xl font-bold tabular-nums', rateColor(ind.rate))}>{ind.rate_label}</span>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
                                            <div className="rounded-lg bg-slate-50 px-3 py-2">
                                                <p className="text-[10px] text-slate-400">Cases</p>
                                                <p className="font-semibold tabular-nums">{fmtNum(ind.case_count)}</p>
                                            </div>
                                            <div className="rounded-lg bg-slate-50 px-3 py-2">
                                                <p className="text-[10px] text-slate-400">ฐาน</p>
                                                <p className="font-semibold tabular-nums">{fmtNum(ind.denominator)}</p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" className="w-full justify-between" asChild>
                                            <Link
                                                href={route('rdu.cases', {
                                                    indicator: ind.id,
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
                </div>
            </div>
        </AppLayout>
    );
}
