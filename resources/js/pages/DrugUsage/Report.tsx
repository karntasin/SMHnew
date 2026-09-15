import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ThaiDatePicker } from '@/components/ui/thai-date-picker';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertTriangle,
    Download,
    Filter,
    Pill,
    Search,
    ChevronLeft,
    ChevronRight,
    FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QualityPage, Panel, EmptyState, qualityInput } from '@/components/quality/quality-ui';
import DrugUsageSubNav, { drugUsageBreadcrumbs } from './DrugUsageSubNav';

interface DrugRow {
    icode: string;
    name: string;
    strength: string;
    units: string;
    form: string;
    form_label: string;
    sub_form?: string;
    sub_form_label?: string;
    unitprice: number;
    total_qty: number;
    total_amount: number;
}

interface FormRow {
    form: string;
    label: string;
    drug_count: number;
    total_qty: number;
    total_amount: number;
    qty_share_percent: number;
    amount_share_percent: number;
    subtypes?: {
        sub_form: string;
        label: string;
        drug_count: number;
        total_qty: number;
        total_amount: number;
        qty_share_percent: number;
        amount_share_percent: number;
    }[];
}

interface Connection {
    connected: boolean;
    message?: string;
}

interface Props {
    connection: Connection;
    filter: {
        start_date: string;
        end_date: string;
        start_date_label?: string;
        end_date_label?: string;
    };
    rows: DrugRow[];
    total: number;
    units: string[];
    by_form: FormRow[];
    form_catalog: Record<string, string>;
    filters: {
        search: string;
        unit: string;
        form: string;
        page: number;
        per_page: number;
    };
    error?: string | null;
}

const FORM_COLORS: Record<string, string> = {
    tablet: 'border-cyan-200 bg-cyan-50 text-cyan-800',
    liquid: 'border-indigo-200 bg-indigo-50 text-indigo-800',
    injection: 'border-rose-200 bg-rose-50 text-rose-800',
    topical: 'border-violet-200 bg-violet-50 text-violet-800',
    other: 'border-slate-200 bg-slate-50 text-slate-700',
};

const fmtNum = (n: number) => n.toLocaleString('th-TH');
const fmtMoney = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DrugUsageReport({
    connection,
    filter,
    rows,
    total,
    units,
    by_form,
    form_catalog,
    filters,
    error,
}: Props) {
    const [startDate, setStartDate] = useState(filter.start_date);
    const [endDate, setEndDate] = useState(filter.end_date);
    const [search, setSearch] = useState(filters.search);
    const [unit, setUnit] = useState(filters.unit || 'all');
    const [form, setForm] = useState(filters.form || 'all');

    const lastPage = Math.max(1, Math.ceil(total / filters.per_page));

    const buildParams = (page = filters.page) => ({
        start_date: startDate,
        end_date: endDate,
        search: search || undefined,
        unit: unit !== 'all' ? unit : undefined,
        form: form !== 'all' ? form : undefined,
        page,
        per_page: filters.per_page,
    });

    const applyFilter = () => {
        router.get(route('drug-usage.report'), buildParams(1), { preserveState: true });
    };

    const goPage = (page: number) => {
        router.get(route('drug-usage.report'), buildParams(page), { preserveState: true });
    };

    const setFormQuick = (next: string) => {
        setForm(next);
        router.get(
            route('drug-usage.report'),
            {
                start_date: startDate,
                end_date: endDate,
                search: search || undefined,
                unit: unit !== 'all' ? unit : undefined,
                form: next !== 'all' ? next : undefined,
                page: 1,
                per_page: filters.per_page,
            },
            { preserveState: true },
        );
    };

    const exportUrl = route('drug-usage.export', buildParams());
    const exportPdfUrl = route('drug-usage.export-pdf', buildParams());

    const from = total === 0 ? 0 : (filters.page - 1) * filters.per_page + 1;
    const to = Math.min(filters.page * filters.per_page, total);

    // group current page rows by form + sub-form for section headers
    const groupedRows: { form: string; label: string; subForm: string; subLabel: string; items: DrugRow[] }[] = [];
    rows.forEach((row) => {
        const last = groupedRows[groupedRows.length - 1];
        const subForm = row.sub_form || 'other';
        const subLabel = row.sub_form_label || '-';
        if (last && last.form === row.form && last.subForm === subForm) {
            last.items.push(row);
        } else {
            groupedRows.push({
                form: row.form,
                label: row.form_label,
                subForm,
                subLabel,
                items: [row],
            });
        }
    });

    return (
        <QualityPage
            tone="cyan"
            icon={Pill}
            badge="ศูนย์พัฒนาคุณภาพ · รายงานยา"
            title="รายงานรายการยาและการใช้ยา"
            subtitle="แยกตามประเภทยา (เม็ด / น้ำ / ฉีด / ใช้ภายนอก) และรูปแบบบรรจุ พร้อมส่งออก Excel และ PDF"
            breadcrumbs={drugUsageBreadcrumbs({ title: 'รายงาน', href: route('drug-usage.report') })}
            headTitle="รายงานรายการยา"
            subNav={<DrugUsageSubNav active="drug-usage.report" />}
            actions={
                <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" className="rounded-xl">
                        <a href={exportUrl}>
                            <Download className="mr-2 h-4 w-4" />
                            Excel
                        </a>
                    </Button>
                    <Button asChild className="rounded-xl bg-cyan-600 hover:bg-cyan-700">
                        <a href={exportPdfUrl}>
                            <FileText className="mr-2 h-4 w-4" />
                            PDF
                        </a>
                    </Button>
                </div>
            }
        >
            <Panel
                title="กรองข้อมูล"
                description={`${filter.start_date_label} – ${filter.end_date_label} · ทั้งหมด ${fmtNum(total)} รายการยา`}
            >
                <div className="space-y-4">
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-500">วันเริ่ม</Label>
                            <ThaiDatePicker value={startDate} onChange={setStartDate} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-500">วันสิ้นสุด</Label>
                            <ThaiDatePicker value={endDate} onChange={setEndDate} />
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                placeholder="ค้นหาชื่อยา..."
                                className={cn(qualityInput, 'w-56 pl-10')}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
                            />
                        </div>
                        <Select value={form} onValueChange={setForm}>
                            <SelectTrigger className={cn(qualityInput, 'h-auto w-40 py-2')}>
                                <SelectValue placeholder="ประเภทยา" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">ทุกประเภท</SelectItem>
                                {Object.entries(form_catalog).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={unit} onValueChange={setUnit}>
                            <SelectTrigger className={cn(qualityInput, 'h-auto w-40 py-2')}>
                                <SelectValue placeholder="หน่วยยา" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">ทุกหน่วย</SelectItem>
                                {units.map((u) => (
                                    <SelectItem key={u} value={u}>{u}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={applyFilter} className="rounded-xl bg-cyan-600 hover:bg-cyan-700">
                            <Filter className="mr-2 h-4 w-4" />
                            กรอง
                        </Button>
                    </div>
                </div>
            </Panel>

            {(!connection.connected || error) && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <AlertTriangle className="mr-2 inline h-4 w-4" />
                    {error || connection.message || 'เชื่อมต่อ HOSxP ไม่ได้'}
                </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <button
                    type="button"
                    onClick={() => setFormQuick('all')}
                    className={cn(
                        'rounded-2xl border p-3 text-left transition',
                        form === 'all' ? 'border-cyan-400 bg-cyan-50 shadow-sm' : 'border-slate-200 bg-white hover:border-cyan-200',
                    )}
                >
                    <div className="text-xs text-slate-500">ทั้งหมด</div>
                    <div className="mt-1 text-lg font-semibold tabular-nums">
                        {fmtNum(by_form.reduce((s, f) => s + f.drug_count, 0))}
                    </div>
                </button>
                {by_form.map((f) => (
                    <button
                        key={f.form}
                        type="button"
                        onClick={() => setFormQuick(f.form)}
                        className={cn(
                            'rounded-2xl border p-3 text-left transition',
                            form === f.form ? 'border-cyan-400 bg-cyan-50 shadow-sm' : 'border-slate-200 bg-white hover:border-cyan-200',
                        )}
                    >
                        <div className="text-xs text-slate-500">{f.label}</div>
                        <div className="mt-1 text-lg font-semibold tabular-nums">{fmtNum(f.drug_count)}</div>
                        <div className="mt-0.5 text-[11px] text-slate-400">
                            {fmtNum(f.total_qty)} · {f.qty_share_percent}%
                        </div>
                        {(f.subtypes ?? []).length > 0 && (
                            <div className="mt-1 space-y-0.5 text-[10px] leading-tight text-slate-400">
                                {f.subtypes!.slice(0, 3).map((s) => (
                                    <div key={s.sub_form}>{s.label}: {fmtNum(s.drug_count)}</div>
                                ))}
                            </div>
                        )}
                    </button>
                ))}
            </div>

            <Panel title="ตารางรายการยา" description="จัดกลุ่มตามประเภทยาและรูปแบบบรรจุ · เรียงหน่วยและชื่อยา">
                {rows.length === 0 ? (
                    <EmptyState text="ไม่พบข้อมูลการจ่ายยาในช่วงที่เลือก" />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                                        <th className="py-2 pr-3 w-12">#</th>
                                        <th className="py-2 pr-3">รหัส</th>
                                        <th className="py-2 pr-3">ชื่อยา</th>
                                        <th className="py-2 pr-3">ความแรง</th>
                                        <th className="py-2 pr-3">หน่วย</th>
                                        <th className="py-2 pr-3">ประเภท</th>
                                        <th className="py-2 pr-3">รูปแบบ</th>
                                        <th className="py-2 pr-3 text-right">ราคา/หน่วย</th>
                                        <th className="py-2 pr-3 text-right">จำนวนรวม</th>
                                        <th className="py-2 text-right">มูลค่ารวม</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupedRows.map((group) => (
                                        <React.Fragment key={group.form + group.subForm + group.items[0]?.icode}>
                                            <tr className="bg-cyan-50/60">
                                                <td colSpan={10} className="px-2 py-2 text-sm font-semibold text-cyan-800">
                                                    {group.label} · {group.subLabel}
                                                    <span className="ml-2 text-xs font-normal text-cyan-600">
                                                        ({group.items.length} รายการในหน้านี้)
                                                    </span>
                                                </td>
                                            </tr>
                                            {group.items.map((row, index) => {
                                                const globalIndex =
                                                    (filters.page - 1) * filters.per_page +
                                                    rows.findIndex((r) => r.icode === row.icode) +
                                                    1;

                                                return (
                                                    <tr key={row.icode} className="border-b border-slate-50 hover:bg-cyan-50/30">
                                                        <td className="py-2.5 pr-3 text-slate-400">{globalIndex || index + 1}</td>
                                                        <td className="py-2.5 pr-3 font-mono text-xs text-cyan-700">{row.icode}</td>
                                                        <td className="py-2.5 pr-3 font-medium text-slate-800">{row.name}</td>
                                                        <td className="py-2.5 pr-3 text-slate-500">{row.strength || '-'}</td>
                                                        <td className="py-2.5 pr-3 text-slate-500">{row.units}</td>
                                                        <td className="py-2.5 pr-3">
                                                            <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium', FORM_COLORS[row.form] || FORM_COLORS.other)}>
                                                                {row.form_label}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 pr-3 text-slate-500">{row.sub_form_label || '-'}</td>
                                                        <td className="py-2.5 pr-3 text-right tabular-nums">{fmtMoney(row.unitprice)}</td>
                                                        <td className="py-2.5 pr-3 text-right tabular-nums font-medium">{fmtNum(row.total_qty)}</td>
                                                        <td className="py-2.5 text-right tabular-nums font-medium text-emerald-700">{fmtMoney(row.total_amount)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-slate-200 bg-slate-50/50 font-semibold">
                                        <td colSpan={8} className="py-3 pr-3 text-right text-slate-600">
                                            รวมหน้านี้ ({rows.length} รายการ)
                                        </td>
                                        <td className="py-3 pr-3 text-right tabular-nums">
                                            {fmtNum(rows.reduce((s, r) => s + r.total_qty, 0))}
                                        </td>
                                        <td className="py-3 text-right tabular-nums text-emerald-700">
                                            {fmtMoney(rows.reduce((s, r) => s + r.total_amount, 0))}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {lastPage > 1 && (
                            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                                <div className="text-sm text-slate-500">
                                    แสดง {from} – {to} จาก {fmtNum(total)} รายการ
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl"
                                        disabled={filters.page <= 1}
                                        onClick={() => goPage(filters.page - 1)}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="flex items-center px-2 text-sm text-slate-600">
                                        หน้า {filters.page} / {lastPage}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl"
                                        disabled={filters.page >= lastPage}
                                        onClick={() => goPage(filters.page + 1)}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </Panel>
        </QualityPage>
    );
}
