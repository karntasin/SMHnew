import React, { useMemo, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import {
    Zap,
    FileDown,
    Save,
    Building2,
    TrendingUp,
} from 'lucide-react';
import {
    QualityPage,
    Panel,
    StatCard,
    EmptyState,
} from '@/components/quality/quality-ui';
import EnvSubNav from '@/pages/Env/EnvSubNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
interface DeptOption {
    id: number;
    name: string;
    code?: string | null;
}

interface EntryRow {
    id?: number | null;
    department_id: number;
    department_name: string;
    department_code?: string | null;
    kwh: number | null;
    cost: number | null;
    meter_start?: number | null;
    meter_end?: number | null;
    notes?: string | null;
    recorded_by_name?: string | null;
    updated_at?: string | null;
}

interface MonthPoint {
    month: number;
    label: string;
    kwh: number;
    cost: number;
    records?: number;
}

interface DeptPoint {
    department_id: number;
    name: string;
    code?: string | null;
    kwh: number;
    cost: number;
}

interface Props {
    departments: DeptOption[];
    entries: EntryRow[];
    monthlyOverview: MonthPoint[];
    byDepartmentYear: DeptPoint[];
    departmentHistory: MonthPoint[] | null;
    summary: {
        year_kwh: number;
        year_cost: number;
        month_kwh: number;
        month_cost: number;
        filled: number;
        total_departments: number;
    };
    filters: {
        year: number;
        month: number;
        department_id?: number | null;
    };
    availableYears: number[];
    monthLabels: Record<number, string>;
}

const money = (n?: number | null) =>
    n == null
        ? '-'
        : new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const num = (n?: number | null) =>
    n == null ? '-' : new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 }).format(n);

type DraftRow = {
    department_id: number;
    kwh: string;
    cost: string;
    meter_start: string;
    meter_end: string;
    notes: string;
};

export default function Index({
    departments,
    entries,
    monthlyOverview,
    byDepartmentYear,
    departmentHistory,
    summary,
    filters,
    availableYears,
    monthLabels,
}: Props) {
    const [year, setYear] = useState(String(filters.year));
    const [month, setMonth] = useState(String(filters.month));
    const [departmentId, setDepartmentId] = useState(
        filters.department_id ? String(filters.department_id) : 'all',
    );

    const initialDrafts: DraftRow[] = useMemo(
        () =>
            entries.map((e) => ({
                department_id: e.department_id,
                kwh: e.kwh != null ? String(e.kwh) : '',
                cost: e.cost != null ? String(e.cost) : '',
                meter_start: e.meter_start != null ? String(e.meter_start) : '',
                meter_end: e.meter_end != null ? String(e.meter_end) : '',
                notes: e.notes || '',
            })),
        [entries],
    );

    const form = useForm({
        year: filters.year,
        month: filters.month,
        entries: initialDrafts,
    });

    // Keep form rows in sync when server props change after filter
    React.useEffect(() => {
        form.setData({
            year: filters.year,
            month: filters.month,
            entries: initialDrafts,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.year, filters.month, initialDrafts]);

    const applyFilters = (next?: { year?: string; month?: string; department_id?: string }) => {
        const y = next?.year ?? year;
        const m = next?.month ?? month;
        const d = next?.department_id ?? departmentId;
        router.get(
            route('env.electricity.index'),
            {
                year: y,
                month: m,
                department_id: d !== 'all' ? d : undefined,
            },
            { preserveState: true, replace: true },
        );
    };

    const updateRow = (index: number, field: keyof DraftRow, value: string) => {
        const next = [...form.data.entries];
        next[index] = { ...next[index], [field]: value };
        form.setData('entries', next);
    };

    const submitBatch = (e: React.FormEvent) => {
        e.preventDefault();
        form.transform((data) => ({
            year: Number(data.year),
            month: Number(data.month),
            entries: data.entries.map((row) => ({
                department_id: row.department_id,
                kwh: row.kwh === '' ? null : Number(row.kwh),
                cost: row.cost === '' ? null : Number(row.cost),
                meter_start: row.meter_start === '' ? null : Number(row.meter_start),
                meter_end: row.meter_end === '' ? null : Number(row.meter_end),
                notes: row.notes || null,
            })),
        }));
        form.post(route('env.electricity.store-batch'), {
            preserveScroll: true,
            onFinish: () => form.transform((d) => d),
        });
    };

    const pdfUrl = route('env.electricity.pdf', {
        year: filters.year,
        month: filters.month,
        department_id: filters.department_id || undefined,
    });

    const pdfYearUrl = route('env.electricity.pdf', {
        year: filters.year,
        department_id: filters.department_id || undefined,
    });

    const deptChart = byDepartmentYear.slice(0, 15).map((d) => ({
        name: d.name.length > 14 ? `${d.name.slice(0, 14)}…` : d.name,
        kwh: d.kwh,
        cost: d.cost,
    }));

    const selectedDeptName = departments.find((d) => d.id === filters.department_id)?.name;

    const years = useMemo(() => {
        const set = new Set(availableYears.map(Number));
        set.add(Number(year));
        set.add(new Date().getFullYear());
        return Array.from(set).sort((a, b) => b - a);
    }, [availableYears, year]);

    return (
        <QualityPage
            tone="teal"
            icon={Zap}
            badge="ศูนย์พัฒนาคุณภาพ · ENV"
            title="บันทึกการใช้ไฟฟ้า"
            subtitle="แยกตามแผนกทั้งหมดในระบบ · กราฟประวัติ · รายงาน PDF"
            breadcrumbs={[
                { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
                { title: 'ENV', href: route('env.index') },
                { title: 'การใช้ไฟฟ้า', href: route('env.electricity.index') },
            ]}
            headTitle="การใช้ไฟฟ้า ENV"
            subNav={<EnvSubNav active="env.index" />}
            actions={
                <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" className="rounded-xl">
                        <a href={pdfUrl} target="_blank" rel="noreferrer">
                            <FileDown className="mr-2 h-4 w-4" />
                            PDF เดือนนี้
                        </a>
                    </Button>
                    <Button asChild variant="outline" className="rounded-xl">
                        <a href={pdfYearUrl} target="_blank" rel="noreferrer">
                            <FileDown className="mr-2 h-4 w-4" />
                            PDF ทั้งปี
                        </a>
                    </Button>
                </div>
            }
        >
            <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm">
                <div className="space-y-1">
                    <div className="text-xs text-slate-500">ปี พ.ศ.</div>
                    <Select
                        value={year}
                        onValueChange={(v) => {
                            setYear(v);
                            applyFilters({ year: v });
                        }}
                    >
                        <SelectTrigger className="w-[140px] rounded-xl">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map((y) => (
                                <SelectItem key={y} value={String(y)}>
                                    {y + 543}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1">
                    <div className="text-xs text-slate-500">เดือนบันทึก</div>
                    <Select
                        value={month}
                        onValueChange={(v) => {
                            setMonth(v);
                            applyFilters({ month: v });
                        }}
                    >
                        <SelectTrigger className="w-[140px] rounded-xl">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(monthLabels).map(([m, label]) => (
                                <SelectItem key={m} value={String(m)}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1">
                    <div className="text-xs text-slate-500">กราฟรายแผนก</div>
                    <Select
                        value={departmentId}
                        onValueChange={(v) => {
                            setDepartmentId(v);
                            applyFilters({ department_id: v });
                        }}
                    >
                        <SelectTrigger className="w-[240px] rounded-xl">
                            <SelectValue placeholder="ทุกแผนก" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">ภาพรวมทุกแผนก</SelectItem>
                            {departments.map((d) => (
                                <SelectItem key={d.id} value={String(d.id)}>
                                    {d.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label={`kWh ปี ${filters.year + 543}`}
                    value={num(summary.year_kwh)}
                    sub="รวมทุกแผนก"
                    icon={Zap}
                    tone="teal"
                />
                <StatCard
                    label={`ค่าไฟปี ${filters.year + 543}`}
                    value={money(summary.year_cost)}
                    sub="บาท"
                    icon={TrendingUp}
                    tone="amber"
                />
                <StatCard
                    label={`kWh ${monthLabels[filters.month] || ''}`}
                    value={num(summary.month_kwh)}
                    sub="เดือนที่เลือก"
                    icon={Zap}
                    tone="cyan"
                />
                <StatCard
                    label="บันทึกแล้ว"
                    value={`${summary.filled}/${summary.total_departments}`}
                    sub="แผนกในเดือนนี้"
                    icon={Building2}
                    tone="emerald"
                />
            </div>

            <div className="mb-4 grid gap-4 xl:grid-cols-2">
                <Panel title="ภาพรวมการใช้ไฟรายเดือน" description={`ปี ${filters.year + 543} · ทุกแผนก`}>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={monthlyOverview}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                                <Tooltip
                                    formatter={(value: number, name: string) => [
                                        name === 'kwh' ? num(value) : money(value),
                                        name === 'kwh' ? 'kWh' : 'บาท',
                                    ]}
                                />
                                <Legend />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="kwh"
                                    name="kWh"
                                    stroke="#0d9488"
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="cost"
                                    name="ค่าไฟ"
                                    stroke="#d97706"
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Panel>

                <Panel
                    title={selectedDeptName ? `ประวัติ · ${selectedDeptName}` : 'ใช้ไฟแยกแผนก (ปีนี้)'}
                    description={
                        selectedDeptName
                            ? `แนวโน้ม 12 เดือน ปี ${filters.year + 543}`
                            : 'Top 15 แผนกตามหน่วยใช้ไฟ'
                    }
                >
                    <div className="h-72">
                        {selectedDeptName && departmentHistory ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={departmentHistory}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip
                                        formatter={(value: number, name: string) => [
                                            name === 'kwh' ? num(value) : money(value),
                                            name === 'kwh' ? 'kWh' : 'บาท',
                                        ]}
                                    />
                                    <Legend />
                                    <Bar dataKey="kwh" name="kWh" fill="#0d9488" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="cost" name="ค่าไฟ" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : deptChart.length === 0 ? (
                            <EmptyState text="ยังไม่มีข้อมูลปีนี้" />
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={deptChart} layout="vertical" margin={{ left: 8, right: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis type="number" tick={{ fontSize: 11 }} />
                                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                                    <Tooltip
                                        formatter={(value: number) => [num(value), 'kWh']}
                                    />
                                    <Bar dataKey="kwh" name="kWh" fill="#0f766e" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </Panel>
            </div>

            <Panel
                title={`บันทึกเดือน${monthLabels[filters.month] || ''} ${filters.year + 543}`}
                description="กรอก kWh / ค่าไฟ ของทุกแผนกแล้วกดบันทึกทั้งชุด · เว้นว่างไว้จะไม่บันทึก (หรือลบถ้าเคยมี)"
                action={
                    <Button className="rounded-xl" onClick={submitBatch} disabled={form.processing}>
                        <Save className="mr-2 h-4 w-4" />
                        บันทึกทั้งเดือน
                    </Button>
                }
            >
                {departments.length === 0 ? (
                    <EmptyState text="ยังไม่มีแผนกในระบบ — เพิ่มแผนกที่ตั้งค่าแผนกก่อน" />
                ) : (
                    <form onSubmit={submitBatch} className="overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full min-w-[980px] border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                    <th className="px-3 py-2.5">แผนก</th>
                                    <th className="px-3 py-2.5 w-28">kWh</th>
                                    <th className="px-3 py-2.5 w-32">ค่าไฟ (บาท)</th>
                                    <th className="px-3 py-2.5 w-28">มิเตอร์เริ่ม</th>
                                    <th className="px-3 py-2.5 w-28">มิเตอร์สิ้น</th>
                                    <th className="px-3 py-2.5">หมายเหตุ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {form.data.entries.map((row, idx) => {
                                    const meta = entries[idx];
                                    return (
                                        <tr key={row.department_id} className="border-b border-slate-50 hover:bg-teal-50/30">
                                            <td className="px-3 py-2 align-top">
                                                <div className="font-medium text-slate-900">
                                                    {meta?.department_name}
                                                </div>
                                                <div className="text-[11px] text-slate-400">
                                                    {meta?.department_code || ''}
                                                    {meta?.updated_at ? ` · อัปเดต ${meta.updated_at}` : ''}
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 align-top">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min={0}
                                                    className="rounded-lg"
                                                    value={row.kwh}
                                                    onChange={(e) => updateRow(idx, 'kwh', e.target.value)}
                                                />
                                            </td>
                                            <td className="px-2 py-2 align-top">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min={0}
                                                    className="rounded-lg"
                                                    value={row.cost}
                                                    onChange={(e) => updateRow(idx, 'cost', e.target.value)}
                                                />
                                            </td>
                                            <td className="px-2 py-2 align-top">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min={0}
                                                    className="rounded-lg"
                                                    value={row.meter_start}
                                                    onChange={(e) => updateRow(idx, 'meter_start', e.target.value)}
                                                />
                                            </td>
                                            <td className="px-2 py-2 align-top">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min={0}
                                                    className="rounded-lg"
                                                    value={row.meter_end}
                                                    onChange={(e) => updateRow(idx, 'meter_end', e.target.value)}
                                                />
                                            </td>
                                            <td className="px-2 py-2 align-top">
                                                <Input
                                                    className="rounded-lg"
                                                    value={row.notes}
                                                    onChange={(e) => updateRow(idx, 'notes', e.target.value)}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <div className="flex justify-end border-t border-slate-100 bg-slate-50/50 px-3 py-3">
                            <Button type="submit" className="rounded-xl" disabled={form.processing}>
                                <Save className="mr-2 h-4 w-4" />
                                บันทึกทั้งเดือน
                            </Button>
                        </div>
                    </form>
                )}
            </Panel>
        </QualityPage>
    );
}
