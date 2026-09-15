import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ThaiDatePicker } from '@/components/ui/thai-date-picker';
import axios from '@/lib/axios';
import { cn } from '@/lib/utils';
import {
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    Download,
    Filter,
    Search,
} from 'lucide-react';
import RduSubNav from '@/pages/Rdu/RduSubNav';

interface CaseRow {
    indicator_id: string;
    vn: string;
    hn: string | null;
    vstdate: string | null;
    vsttime: string | null;
    patient_name: string;
    age_y: number | null;
    sex: string | null;
    department_name: string | null;
    specialty_name: string | null;
    doctor_name: string;
    icd10_list: string | null;
    drug_list: string | null;
    audit_status: string;
    audit_notes: string | null;
    reviewed_by_name?: string | null;
    reviewed_at?: string | null;
}

interface IndicatorMeta {
    id: string;
    name: string;
    name_th: string;
    group: string;
    description?: string;
}

interface Props {
    connection: { connected: boolean; message?: string };
    filter: {
        start_date: string;
        end_date: string;
        indicator: string;
        department?: string | null;
        page: number;
        per_page: number;
    };
    indicator: IndicatorMeta | null;
    indicators: IndicatorMeta[];
    rows: CaseRow[];
    total: number;
    audit_statuses: Record<string, string>;
}

const statusColor: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-700',
    reviewed: 'bg-sky-100 text-sky-800',
    justified: 'bg-emerald-100 text-emerald-800',
    unjustified: 'bg-rose-100 text-rose-800',
    excluded: 'bg-amber-100 text-amber-800',
};

export default function RduCases({
    connection,
    filter,
    indicator,
    indicators,
    rows: initialRows,
    total,
    audit_statuses,
}: Props) {
    const [startDate, setStartDate] = useState(filter.start_date);
    const [endDate, setEndDate] = useState(filter.end_date);
    const [indicatorId, setIndicatorId] = useState(filter.indicator);
    const [department, setDepartment] = useState(filter.department || '');
    const [rows, setRows] = useState(initialRows);
    const [selectedVn, setSelectedVn] = useState<string | null>(initialRows[0]?.vn ?? null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const selected = useMemo(() => rows.find((r) => r.vn === selectedVn) ?? null, [rows, selectedVn]);
    const [auditStatus, setAuditStatus] = useState(selected?.audit_status || 'pending');
    const [notes, setNotes] = useState(selected?.audit_notes || '');

    useEffect(() => {
        setRows(initialRows);
        const first = initialRows[0]?.vn ?? null;
        setSelectedVn(first);
    }, [initialRows]);

    useEffect(() => {
        setAuditStatus(selected?.audit_status || 'pending');
        setNotes(selected?.audit_notes || '');
        setMessage('');
    }, [selected?.vn, selected?.audit_status, selected?.audit_notes]);

    const totalPages = Math.max(1, Math.ceil(total / filter.per_page));

    const applyFilter = (page = 1) => {
        router.get(
            route('rdu.cases'),
            {
                start_date: startDate,
                end_date: endDate,
                indicator: indicatorId,
                department: department || undefined,
                page,
                per_page: filter.per_page,
            },
            { preserveState: true },
        );
    };

    const saveAudit = async () => {
        if (!selected) return;
        setSaving(true);
        setMessage('');
        try {
            const { data } = await axios.post(route('rdu.audits.store'), {
                indicator_id: selected.indicator_id,
                vn: selected.vn,
                hn: selected.hn,
                vstdate: selected.vstdate,
                status: auditStatus,
                notes,
                snapshot: {
                    icd10_list: selected.icd10_list,
                    drug_list: selected.drug_list,
                    department_name: selected.department_name,
                    doctor_name: selected.doctor_name,
                    patient_name: selected.patient_name,
                    age_y: selected.age_y,
                },
            });

            setRows((prev) =>
                prev.map((r) =>
                    r.vn === selected.vn
                        ? {
                              ...r,
                              audit_status: data.audit.audit_status,
                              audit_notes: data.audit.audit_notes,
                              reviewed_by_name: data.audit.reviewed_by_name,
                              reviewed_at: data.audit.reviewed_at,
                          }
                        : r,
                ),
            );
            setMessage('บันทึกการทบทวนแล้ว');
        } catch {
            setMessage('บันทึกไม่สำเร็จ');
        } finally {
            setSaving(false);
        }
    };

    const exportUrl = route('rdu.export', {
        indicator: indicatorId,
        start_date: startDate,
        end_date: endDate,
    });

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
                { title: 'เภสัชกรรม', href: '/pharmacy' },
                { title: 'รายงาน RDU', href: '/rdu' },
                { title: 'Case Audit', href: '/rdu/cases' },
            ]}
        >
            <Head title="RDU Case Audit" />

            <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ccfbf1_0,#f8fafc_38%,#ffffff_78%)]">
                <div className="relative overflow-hidden border-b border-emerald-100 bg-white/80 backdrop-blur">
                    <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-teal-200/40 blur-3xl" />
                    <div className="absolute left-1/4 top-10 h-32 w-32 rounded-full bg-emerald-200/50 blur-2xl" />
                    <div className="relative mx-auto max-w-[1400px] px-6 py-8">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <p className="inline-flex rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 shadow-sm">Case Audit</p>
                                <h1 className="mt-3 bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700 bg-clip-text text-3xl font-black text-transparent">
                                    {indicator?.name_th || 'รายการ case RDU'}
                                </h1>
                                <p className="mt-2 text-sm text-slate-600">
                                    พบ {total.toLocaleString()} รายการ · ทบทวนย้อนหลังจาก HOSxP
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" asChild>
                                    <Link href={route('rdu.index', { start_date: startDate, end_date: endDate })}>
                                        กลับ Dashboard
                                    </Link>
                                </Button>
                                <Button variant="outline" asChild>
                                    <a href={exportUrl}>
                                        <Download className="mr-1 h-4 w-4" />
                                        Export Excel
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

                        <div className="mt-4">
                            <RduSubNav active="rdu.cases" startDate={startDate} endDate={endDate} />
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 rounded-3xl border border-white/70 bg-white/85 p-4 shadow-xl shadow-emerald-900/5 backdrop-blur md:grid-cols-2 xl:grid-cols-5">
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">ตัวชี้วัด</Label>
                                <Select value={indicatorId} onValueChange={setIndicatorId}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {indicators.map((i) => (
                                            <SelectItem key={i.id} value={i.id}>
                                                {i.group}: {i.name_th}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">วันเริ่ม</Label>
                                <ThaiDatePicker value={startDate} onChange={setStartDate} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">วันสิ้นสุด</Label>
                                <ThaiDatePicker value={endDate} onChange={setEndDate} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">ค้นหาแผนก</Label>
                                <input
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                    value={department}
                                    onChange={(e) => setDepartment(e.target.value)}
                                    placeholder="ชื่อแผนก / depcode"
                                />
                            </div>
                            <div className="flex items-end">
                                <Button className="w-full gap-1" onClick={() => applyFilter(1)}>
                                    <Filter className="h-4 w-4" />
                                    กรอง
                                </Button>
                            </div>
                        </div>

                        {!connection.connected && (
                            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                <AlertTriangle className="mr-2 inline h-4 w-4" />
                                {connection.message || 'เชื่อมต่อ HOSxP ไม่ได้'}
                            </div>
                        )}
                    </div>
                </div>

                <div className="mx-auto grid max-w-[1400px] gap-4 px-6 py-6 lg:grid-cols-[1.4fr_0.9fr]">
                    <Card className="overflow-hidden border-white/70 bg-white/95 shadow-xl shadow-slate-900/5">
                        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-white to-emerald-50/60 py-4">
                            <CardTitle className="text-base">รายการ Case</CardTitle>
                            <CardDescription>{indicator?.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                                        <tr>
                                            <th className="px-3 py-2">วันที่</th>
                                            <th className="px-3 py-2">HN / VN</th>
                                            <th className="px-3 py-2">ผู้ป่วย</th>
                                            <th className="px-3 py-2">แผนก</th>
                                            <th className="px-3 py-2">สถานะ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-3 py-10 text-center text-slate-400">
                                                    <Search className="mx-auto mb-2 h-6 w-6 opacity-40" />
                                                    ไม่พบ case ตามเงื่อนไข
                                                </td>
                                            </tr>
                                        ) : (
                                            rows.map((row) => (
                                                <tr
                                                    key={row.vn}
                                                    onClick={() => setSelectedVn(row.vn)}
                                                    className={cn(
                                                        'cursor-pointer border-t border-slate-100 transition hover:bg-emerald-50/50',
                                                        selectedVn === row.vn && 'bg-emerald-50/90 shadow-[inset_4px_0_0_#10b981]',
                                                    )}
                                                >
                                                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                                                        {row.vstdate}
                                                        {row.vsttime ? ` ${String(row.vsttime).slice(0, 5)}` : ''}
                                                    </td>
                                                    <td className="px-3 py-2.5 font-mono text-xs">
                                                        <div>{row.hn}</div>
                                                        <div className="text-slate-400">{row.vn}</div>
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <div className="font-medium text-slate-800">{row.patient_name}</div>
                                                        <div className="text-xs text-slate-400">
                                                            {row.age_y != null ? `${row.age_y} ปี` : '—'}
                                                            {row.sex ? ` · ${row.sex}` : ''}
                                                        </div>
                                                    </td>
                                                    <td className="max-w-[140px] truncate px-3 py-2.5 text-slate-600">
                                                        {row.department_name || '—'}
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <span
                                                            className={cn(
                                                                'rounded-full px-2 py-0.5 text-[11px] font-medium',
                                                                statusColor[row.audit_status] || statusColor.pending,
                                                            )}
                                                        >
                                                            {audit_statuses[row.audit_status] || row.audit_status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                                <span>
                                    หน้า {filter.page} / {totalPages}
                                </span>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={filter.page <= 1}
                                        onClick={() => applyFilter(filter.page - 1)}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={filter.page >= totalPages}
                                        onClick={() => applyFilter(filter.page + 1)}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden border-white/70 bg-white/95 shadow-xl shadow-emerald-900/5 lg:sticky lg:top-4 lg:self-start">
                        <CardHeader className="bg-gradient-to-r from-emerald-50 to-cyan-50">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <ClipboardCheck className="h-4 w-4 text-emerald-600" />
                                รายละเอียดและทบทวน
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!selected ? (
                                <p className="text-sm text-slate-400">เลือก case จากตารางด้านซ้าย</p>
                            ) : (
                                <>
                                    <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 text-sm shadow-inner">
                                        <div className="mb-2 flex flex-wrap gap-2">
                                            <Badge variant="outline">HN {selected.hn}</Badge>
                                            <Badge variant="outline">VN {selected.vn}</Badge>
                                        </div>
                                        <p className="font-semibold text-slate-900">{selected.patient_name}</p>
                                        <p className="text-xs text-slate-500">
                                            {selected.vstdate} · อายุ {selected.age_y ?? '—'} ปี · {selected.department_name || '—'}
                                        </p>
                                        <p className="mt-2 text-xs text-slate-500">แพทย์: {selected.doctor_name || '—'}</p>
                                    </div>

                                    <div>
                                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">ICD-10</p>
                                        <p className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                                            {selected.icd10_list || '—'}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">ยาที่เกี่ยวข้อง</p>
                                        <p className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm leading-relaxed text-slate-700 shadow-sm">
                                            {selected.drug_list || '—'}
                                        </p>
                                    </div>

                                    <div className="space-y-1">
                                        <Label>สถานะทบทวน</Label>
                                        <Select value={auditStatus} onValueChange={setAuditStatus}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(audit_statuses).map(([key, label]) => (
                                                    <SelectItem key={key} value={key}>
                                                        {label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1">
                                        <Label>บันทึกเภสัชกร</Label>
                                        <Textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            rows={4}
                                            placeholder="เหตุผล / การติดตาม / หมายเหตุสำหรับ Phase 2"
                                        />
                                    </div>

                                    <Button className="w-full" onClick={saveAudit} disabled={saving}>
                                        {saving ? 'กำลังบันทึก...' : 'บันทึกการทบทวน'}
                                    </Button>

                                    {(message || selected.reviewed_at) && (
                                        <p className="text-center text-xs text-slate-500">
                                            {message || `ทบทวนล่าสุดโดย ${selected.reviewed_by_name || '—'} · ${selected.reviewed_at}`}
                                        </p>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
