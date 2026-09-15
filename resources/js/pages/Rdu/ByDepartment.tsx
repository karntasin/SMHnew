import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ThaiDatePicker, formatThaiDateFromIso } from '@/components/ui/thai-date-picker';
import RduSubNav from '@/pages/Rdu/RduSubNav';
import { cn } from '@/lib/utils';
import { AlertTriangle, Building2, Filter, Stethoscope, UserRound } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DeptRow {
    department_code: string;
    department_name: string;
    drug_visits: number;
    drug_lines: number;
    total_qty: number;
    total_amount: number;
    ab_visits: number;
    ab_rate: number | null;
}

interface DoctorRow {
    doctor_code: string;
    doctor_name: string;
    drug_visits: number;
    drug_lines: number;
    total_qty: number;
}

interface Props {
    connection: { connected: boolean; message?: string };
    filter: {
        start_date: string;
        end_date: string;
        start_date_label?: string;
        end_date_label?: string;
    };
    visit_type: string | null;
    departments: DeptRow[];
    doctors: DoctorRow[];
}

const fmtNum = (n: number) => n.toLocaleString('th-TH');

const rateColor = (rate: number | null) => {
    if (rate == null) return 'text-slate-400';
    if (rate >= 40) return 'text-rose-600';
    if (rate >= 20) return 'text-amber-600';
    return 'text-emerald-600';
};

export default function ByDepartment({ connection, filter, visit_type, departments, doctors }: Props) {
    const [startDate, setStartDate] = useState(filter.start_date);
    const [endDate, setEndDate] = useState(filter.end_date);
    const [visitType, setVisitType] = useState(visit_type || 'all');

    const applyFilter = () => {
        const params: Record<string, string> = { start_date: startDate, end_date: endDate };
        if (visitType !== 'all') {
            params.visit_type = visitType;
        }
        router.get(route('rdu.drugs.by-department'), params, { preserveState: true });
    };

    const deptChart = departments.slice(0, 12).map((d) => ({
        name: d.department_name.length > 16 ? d.department_name.slice(0, 16) + '…' : d.department_name,
        visits: d.drug_visits,
        ab_rate: d.ab_rate ?? 0,
    }));

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
                { title: 'เภสัชกรรม', href: '/pharmacy' },
                { title: 'รายงาน RDU', href: '/rdu' },
                { title: 'By Department', href: '/rdu/drugs/by-department' },
            ]}
        >
            <Head title="Drugs by Department" />

            <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e0f2fe_0,#f8fafc_38%,#ffffff_76%)]">
                <div className="relative overflow-hidden border-b border-sky-100 bg-white/80 backdrop-blur">
                    <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-200/45 blur-3xl" />
                    <div className="absolute left-1/4 top-10 h-36 w-36 rounded-full bg-emerald-200/40 blur-2xl" />
                    <div className="relative mx-auto max-w-7xl px-6 py-9">
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-700 shadow-sm">
                            <Building2 className="h-3.5 w-3.5" />
                            Department & Doctor · Phase 1.5
                        </div>
                        <h1 className="bg-gradient-to-r from-sky-700 via-cyan-700 to-emerald-700 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-4xl">รายงานการใช้ยาตามแผนกและแพทย์</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">เปรียบเทียบ visit ยาและอัตรา AB ตามแผนก OPD/IPD</p>

                        <div className="mt-6 space-y-4">
                            <RduSubNav active="rdu.drugs.by-department" startDate={startDate} endDate={endDate} visitType={visitType !== 'all' ? visitType : null} />

                            <div className="flex flex-wrap items-end gap-3 rounded-3xl border border-white/70 bg-white/85 p-4 shadow-xl shadow-sky-900/5 backdrop-blur">
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500">วันเริ่ม</Label>
                                    <ThaiDatePicker value={startDate} onChange={setStartDate} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500">วันสิ้นสุด</Label>
                                    <ThaiDatePicker value={endDate} onChange={setEndDate} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500">ประเภท Visit</Label>
                                    <Select value={visitType} onValueChange={setVisitType}>
                                        <SelectTrigger className="w-[140px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">ทั้งหมด</SelectItem>
                                            <SelectItem value="opd">OPD</SelectItem>
                                            <SelectItem value="ipd">IPD</SelectItem>
                                        </SelectContent>
                                    </Select>
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
                    <Card className="overflow-hidden border-white/70 bg-white/90 shadow-lg shadow-sky-900/5 transition-all duration-300 hover:shadow-xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Building2 className="h-4 w-4" />
                                Top แผนกตาม Visit ยา
                            </CardTitle>
                            <CardDescription>
                                {filter.start_date_label || formatThaiDateFromIso(filter.start_date)} –{' '}
                                {filter.end_date_label || formatThaiDateFromIso(filter.end_date)}
                                {visit_type ? ` · ${visit_type.toUpperCase()}` : ''}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="h-72">
                            {deptChart.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={deptChart}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={80} />
                                        <YAxis tickFormatter={(v) => fmtNum(v)} />
                                        <Tooltip formatter={(v: number, name: string) => [name === 'ab_rate' ? `${v}%` : fmtNum(v), name === 'ab_rate' ? 'AB %' : 'Visit ยา']} />
                                        <Bar dataKey="visits" name="Visit ยา" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center text-sm text-slate-400">ไม่มีข้อมูล</div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <Card className="overflow-hidden border-white/70 bg-white/90 shadow-lg shadow-slate-900/5 transition-all duration-300 hover:shadow-xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Stethoscope className="h-4 w-4" />
                                    ตามแผนก (Top 50)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="max-h-[480px] overflow-auto">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-white">
                                        <tr className="border-b bg-slate-50/80 text-left text-xs text-slate-500">
                                            <th className="pb-2 pr-2">แผนก</th>
                                            <th className="pb-2 pr-2 text-right">Visit</th>
                                            <th className="pb-2 pr-2 text-right">AB</th>
                                            <th className="pb-2 text-right">AB %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {departments.map((d) => (
                                            <tr key={d.department_code} className="border-b border-slate-100 transition hover:bg-sky-50/50">
                                                <td className="max-w-[180px] truncate py-2 pr-2 font-medium">{d.department_name}</td>
                                                <td className="py-2 pr-2 text-right tabular-nums">{fmtNum(d.drug_visits)}</td>
                                                <td className="py-2 pr-2 text-right tabular-nums">{fmtNum(d.ab_visits)}</td>
                                                <td className={cn('py-2 text-right tabular-nums font-medium', rateColor(d.ab_rate))}>
                                                    {d.ab_rate != null ? `${d.ab_rate}%` : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>

                        <Card className="overflow-hidden border-white/70 bg-white/90 shadow-lg shadow-slate-900/5 transition-all duration-300 hover:shadow-xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <UserRound className="h-4 w-4" />
                                    ตามแพทย์ (Top 10)
                                </CardTitle>
                                <CardDescription>แพทย์เจ้าของ visit (ovst.doctor) — เฉพาะแพทย์ (provider type 01)</CardDescription>
                            </CardHeader>
                            <CardContent className="max-h-[480px] overflow-auto">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-white">
                                        <tr className="border-b bg-slate-50/80 text-left text-xs text-slate-500">
                                            <th className="pb-2 pr-2">แพทย์</th>
                                            <th className="pb-2 pr-2 text-right">Visit</th>
                                            <th className="pb-2 pr-2 text-right">รายการ</th>
                                            <th className="pb-2 text-right">Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {doctors.map((doc) => (
                                            <tr key={doc.doctor_code} className="border-b border-slate-100 transition hover:bg-emerald-50/50">
                                                <td className="max-w-[240px] truncate py-2 pr-2 font-medium">{doc.doctor_name}</td>
                                                <td className="py-2 pr-2 text-right tabular-nums">{fmtNum(doc.drug_visits)}</td>
                                                <td className="py-2 pr-2 text-right tabular-nums">{fmtNum(doc.drug_lines)}</td>
                                                <td className="py-2 text-right tabular-nums">{fmtNum(doc.total_qty)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
