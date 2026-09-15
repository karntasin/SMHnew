import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ThaiDatePicker, formatThaiDateFromIso } from '@/components/ui/thai-date-picker';
import RduSubNav from '@/pages/Rdu/RduSubNav';
import { cn } from '@/lib/utils';
import {
    AlertTriangle,
    Download,
    Filter,
    Pill,
    ShieldAlert,
    Stethoscope,
    TrendingUp,
    Users,
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    Legend,
} from 'recharts';

interface Connection {
    connected: boolean;
    message?: string;
}

interface TopDrug {
    rank: number;
    drug_code: string;
    drug_name: string;
    total_qty: number;
    visits: number;
    total_amount: number;
    qty_share_percent: number;
}

interface MonthlyTrend {
    period: string;
    label: string;
    drug_visits: number;
    ab_visits: number;
    ab_rate: number | null;
    total_qty: number;
    ab_qty: number;
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
        drug_visits: number;
        patients: number;
        drug_lines: number;
        total_qty: number;
        total_amount: number;
        ab_visits: number;
        ab_rate: number | null;
        opd_visits: number;
        ipd_visits: number;
    };
    top_drugs: TopDrug[];
    monthly_trend: MonthlyTrend[];
    opd_ipd: { name: string; visits: number }[];
    high_risk: { key: string; label: string; visits: number }[];
}

const PIE_COLORS = ['#10b981', '#6366f1'];

const rateColor = (rate: number | null) => {
    if (rate == null) return 'text-slate-400';
    if (rate >= 40) return 'text-rose-600';
    if (rate >= 20) return 'text-amber-600';
    return 'text-emerald-600';
};

const fmtNum = (n: number) => n.toLocaleString('th-TH');
const fmtMoney = (n: number) =>
    n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function DrugDashboard({ connection, filter, summary, top_drugs, monthly_trend, opd_ipd, high_risk }: Props) {
    const [startDate, setStartDate] = useState(filter.start_date);
    const [endDate, setEndDate] = useState(filter.end_date);

    const applyFilter = () => {
        router.get(route('rdu.drugs'), { start_date: startDate, end_date: endDate }, { preserveState: true });
    };

    const exportUrl = route('rdu.drugs.export', { start_date: startDate, end_date: endDate });
    const topChart = top_drugs.slice(0, 10).map((d) => ({
        name: d.drug_name.length > 24 ? d.drug_name.slice(0, 24) + '…' : d.drug_name,
        qty: d.total_qty,
    }));

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
                { title: 'เภสัชกรรม', href: '/pharmacy' },
                { title: 'รายงาน RDU', href: '/rdu' },
                { title: 'Drug Utilization', href: '/rdu/drugs' },
            ]}
        >
            <Head title="Drug Utilization" />

            <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e0e7ff_0,#f8fafc_36%,#ffffff_76%)]">
                <div className="relative overflow-hidden border-b border-indigo-100 bg-white/80 backdrop-blur">
                    <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
                    <div className="absolute left-1/4 top-8 h-36 w-36 rounded-full bg-emerald-200/40 blur-2xl" />
                    <div className="relative mx-auto max-w-7xl px-6 py-9">
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700 shadow-sm">
                            <Pill className="h-3.5 w-3.5" />
                            Rational Drug Use · Phase 1.5
                        </div>
                        <h1 className="bg-gradient-to-r from-indigo-700 via-violet-700 to-emerald-700 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-4xl">การใช้ยารวม (Drug Utilization)</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                            ภาพรวมการจ่ายยาจาก HOSxP — จำนวน visit, ยาอันดับต้น, แนวโน้ม AB และ OPD/IPD
                        </p>

                        <div className="mt-6 space-y-4">
                            <RduSubNav active="rdu.drugs" startDate={startDate} endDate={endDate} />

                            <div className="flex flex-wrap items-end gap-3 rounded-3xl border border-white/70 bg-white/85 p-4 shadow-xl shadow-indigo-900/5 backdrop-blur">
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
                                    <a href={exportUrl}>
                                        <Download className="mr-1 h-4 w-4" />
                                        Export Top Drugs
                                    </a>
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
                        <Card className="overflow-hidden border-white/70 bg-white/90 shadow-lg shadow-slate-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-1">
                                    <Stethoscope className="h-4 w-4" /> Visit ที่มีการจ่ายยา
                                </CardDescription>
                                <CardTitle className="text-3xl tabular-nums">{fmtNum(summary.drug_visits)}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs text-slate-500">
                                {fmtNum(summary.drug_lines)} รายการยา · OPD {fmtNum(summary.opd_visits)} / IPD {fmtNum(summary.ipd_visits)}
                            </CardContent>
                        </Card>

                        <Card className="overflow-hidden border-white/70 bg-white/90 shadow-lg shadow-slate-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-1">
                                    <Users className="h-4 w-4" /> ผู้ป่วย / จำนวนยา
                                </CardDescription>
                                <CardTitle className="text-3xl tabular-nums">{fmtNum(summary.patients)}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs text-slate-500">รวม {fmtNum(summary.total_qty)} หน่วย · {fmtMoney(summary.total_amount)} บาท</CardContent>
                        </Card>

                        <Card className="overflow-hidden border-rose-100 bg-white/90 shadow-lg shadow-rose-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                            <CardHeader className="pb-2">
                                <CardDescription>Visit ที่ได้ AB</CardDescription>
                                <CardTitle className="text-3xl tabular-nums text-rose-600">{fmtNum(summary.ab_visits)}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs text-slate-500">ยาปฏิชีวนะ (pattern + flag)</CardContent>
                        </Card>

                        <Card className="overflow-hidden border-amber-100 bg-white/90 shadow-lg shadow-amber-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-1">
                                    <TrendingUp className="h-4 w-4" /> อัตรา AB / Visit ยา
                                </CardDescription>
                                <CardTitle className={cn('text-3xl tabular-nums', rateColor(summary.ab_rate))}>
                                    {summary.ab_rate != null ? `${summary.ab_rate}%` : '—'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs text-slate-500">
                                ช่วง {filter.start_date_label || formatThaiDateFromIso(filter.start_date)} –{' '}
                                {filter.end_date_label || formatThaiDateFromIso(filter.end_date)}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <Card className="overflow-hidden border-white/70 bg-white/90 shadow-xl shadow-indigo-900/5 lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="text-base">Top 10 ยาตามจำนวน</CardTitle>
                                <CardDescription>เรียงตาม qty รวมในช่วงเวลา</CardDescription>
                            </CardHeader>
                            <CardContent className="h-72">
                                {topChart.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={topChart} layout="vertical" margin={{ left: 8, right: 16 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" tickFormatter={(v) => fmtNum(v)} />
                                            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                                            <Tooltip formatter={(v: number) => fmtNum(v)} />
                                            <Bar dataKey="qty" fill="#6366f1" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex h-full items-center justify-center text-sm text-slate-400">ไม่มีข้อมูล</div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="overflow-hidden border-white/70 bg-white/90 shadow-xl shadow-indigo-900/5">
                            <CardHeader>
                                <CardTitle className="text-base">OPD vs IPD</CardTitle>
                                <CardDescription>Visit ที่มีการจ่ายยา</CardDescription>
                            </CardHeader>
                            <CardContent className="h-72">
                                {opd_ipd.some((x) => x.visits > 0) ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={opd_ipd} dataKey="visits" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                                                {opd_ipd.map((_, i) => (
                                                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(v: number) => fmtNum(v)} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex h-full items-center justify-center text-sm text-slate-400">ไม่มีข้อมูล</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="overflow-hidden border-white/70 bg-white/90 shadow-xl shadow-indigo-900/5">
                        <CardHeader>
                            <CardTitle className="text-base">แนวโน้มรายเดือน — AB Rate</CardTitle>
                            <CardDescription>Visit ยา vs Visit ที่ได้ AB</CardDescription>
                        </CardHeader>
                        <CardContent className="h-64">
                            {monthly_trend.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={monthly_trend}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                        <YAxis yAxisId="left" tickFormatter={(v) => fmtNum(v)} />
                                        <YAxis yAxisId="right" orientation="right" unit="%" domain={[0, 'auto']} />
                                        <Tooltip />
                                        <Legend />
                                        <Line yAxisId="left" type="monotone" dataKey="drug_visits" name="Visit ยา" stroke="#6366f1" strokeWidth={2} dot={false} />
                                        <Line yAxisId="left" type="monotone" dataKey="ab_visits" name="Visit AB" stroke="#f43f5e" strokeWidth={2} dot={false} />
                                        <Line yAxisId="right" type="monotone" dataKey="ab_rate" name="AB %" stroke="#f59e0b" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center text-sm text-slate-400">ไม่มีข้อมูล</div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <Card className="overflow-hidden border-white/70 bg-white/90 shadow-xl shadow-slate-900/5">
                            <CardHeader>
                                <CardTitle className="text-base">Top 15 ยา</CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-indigo-50/70 text-left text-xs text-slate-500">
                                            <th className="pb-2 pr-2">#</th>
                                            <th className="pb-2 pr-2">ชื่อยา</th>
                                            <th className="pb-2 pr-2 text-right">Qty</th>
                                            <th className="pb-2 pr-2 text-right">Visit</th>
                                            <th className="pb-2 text-right">%</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {top_drugs.map((d) => (
                                            <tr key={d.drug_code} className="border-b border-slate-100 transition hover:bg-indigo-50/60">
                                                <td className="py-2 pr-2 tabular-nums text-slate-400">{d.rank}</td>
                                                <td className="max-w-[200px] truncate py-2 pr-2 font-medium">{d.drug_name}</td>
                                                <td className="py-2 pr-2 text-right tabular-nums">{fmtNum(d.total_qty)}</td>
                                                <td className="py-2 pr-2 text-right tabular-nums">{fmtNum(d.visits)}</td>
                                                <td className="py-2 text-right tabular-nums text-indigo-600">{d.qty_share_percent}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>

                        <Card className="overflow-hidden border-white/70 bg-white/90 shadow-xl shadow-rose-900/5">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <ShieldAlert className="h-4 w-4 text-violet-600" />
                                    ยาเสี่ยงสูง (Visit)
                                </CardTitle>
                                <CardDescription>NSAID, Long-acting BZD, High-cost</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {high_risk.map((hr) => (
                                    <div key={hr.key} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                                        <span className="text-sm font-medium text-slate-700">{hr.label}</span>
                                        <span className="text-lg font-bold tabular-nums text-violet-700">{fmtNum(hr.visits)}</span>
                                    </div>
                                ))}
                                {high_risk.length === 0 && <p className="text-sm text-slate-400">ไม่มีข้อมูล</p>}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
