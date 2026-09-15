import React, { useEffect, useMemo, useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Droplets, FileDown, Plus, Trash2 } from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ComposedChart,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { QualityPage, Panel, EmptyState, StatusPill } from '@/components/quality/quality-ui';
import EnvSubNav from '@/pages/Env/EnvSubNav';
import UtilitiesSubNav from '@/pages/Env/Utilities/UtilitiesSubNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Category {
    id: number;
    code: string;
    name: string;
    has_invoice: boolean;
    has_medical: boolean;
    has_revenue: boolean;
    has_admin: boolean;
    has_line_items: boolean;
}

interface Entry {
    id: number;
    year_be: number;
    month: number;
    period_label: string;
    invoice_amount?: number | null;
    budget_medical?: number | null;
    budget_revenue?: number | null;
    budget_admin?: number | null;
    amount?: number | null;
    line_label?: string | null;
    note?: string | null;
    note_text?: string | null;
    units?: number | null;
    prev_reading?: number | null;
    curr_reading?: number | null;
    rate?: number | null;
    display_total: number;
}

interface AcPeriod {
    key: string;
    label: string;
    prev_label: string;
    curr_label: string;
    year_be: number;
    month: number;
    has_data?: boolean;
    rows: {
        no: number;
        name: string;
        prev_reading?: number | null;
        curr_reading?: number | null;
        units?: number | null;
        rate?: number | null;
        cost: number;
        note?: string | null;
        entry_id: number;
    }[];
    total_units: number;
    total_cost: number;
}

interface MeterReport {
    title: string;
    default_rate: number;
    periods: AcPeriod[];
    totals: { units: number; cost: number };
}

interface LedgerPeriod {
    key: string;
    label: string;
    year_be: number;
    month: number;
    has_data: boolean;
    rows: {
        id: number;
        is_sub: boolean;
        line_label?: string | null;
        invoice_amount?: number | null;
        budget_medical?: number | null;
        budget_revenue?: number | null;
        budget_admin?: number | null;
        note?: string | null;
        display_total: number;
    }[];
    totals: {
        invoice: number;
        medical: number;
        revenue: number;
        admin: number;
        display_total: number;
    };
}

interface Ledger {
    periods: LedgerPeriod[];
    grand_totals: {
        invoice: number;
        medical: number;
        revenue: number;
        admin: number;
        display_total: number;
    };
    has_invoice: boolean;
    has_medical: boolean;
    has_revenue: boolean;
    has_admin: boolean;
    has_line_items: boolean;
}

interface Props {
    fiscalYear: number;
    fiscalYears: number[];
    category: Category;
    categories: Category[];
    entries: Entry[];
    monthly: { label: string; total: number; units?: number }[];
    months: { year_be: number; month: number; label: string }[];
    meterReport?: MeterReport | null;
    ledger?: Ledger | null;
    defaultAcRate?: number;
    acMeterNames?: string[];
    acCarryEntries?: Entry[];
}

const money = (n?: number | null) =>
    n == null || Number.isNaN(n)
        ? '-'
        : new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const num = (n?: number | null, digits = 0) =>
    n == null || Number.isNaN(n)
        ? '-'
        : new Intl.NumberFormat('th-TH', {
              minimumFractionDigits: digits,
              maximumFractionDigits: digits,
          }).format(n);

export default function CategoryPage({
    fiscalYear,
    fiscalYears,
    category,
    categories,
    entries,
    monthly,
    months,
    meterReport,
    ledger,
    defaultAcRate = 4.45,
    acMeterNames = [],
    acCarryEntries = [],
}: Props) {
    const isAcMeter = category.code === 'ac_meter';
    const [showForm, setShowForm] = useState(false);
    const form = useForm({
        category_id: category.id,
        year_be: months[months.length - 1]?.year_be || fiscalYear,
        month: months[months.length - 1]?.month || 1,
        invoice_amount: '' as string | number,
        budget_medical: '' as string | number,
        budget_revenue: '' as string | number,
        budget_admin: '' as string | number,
        amount: '' as string | number,
        line_label: '',
        note: '',
    });

    const setYear = (y: number) => {
        router.get(route('env.utilities.category', category.code), { fiscal_year: y }, { preserveState: true, replace: true });
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.transform((data) => ({
            category_id: data.category_id,
            year_be: data.year_be,
            month: data.month,
            invoice_amount: data.invoice_amount === '' ? null : Number(data.invoice_amount),
            budget_medical: data.budget_medical === '' ? null : Number(data.budget_medical),
            budget_revenue: data.budget_revenue === '' ? null : Number(data.budget_revenue),
            budget_admin: data.budget_admin === '' ? null : Number(data.budget_admin),
            amount: data.amount === '' ? null : Number(data.amount),
            line_label: data.line_label || '',
            note: data.note || null,
        }));
        form.post(route('env.utilities.entries.store'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset(
                    'invoice_amount',
                    'budget_medical',
                    'budget_revenue',
                    'budget_admin',
                    'amount',
                    'line_label',
                    'note',
                );
                setShowForm(false);
            },
        });
    };

    return (
        <QualityPage
            tone="teal"
            icon={Droplets}
            badge="ศูนย์พัฒนาคุณภาพ · ENV"
            title={category.name}
            subtitle={
                isAcMeter
                    ? `ทะเบียนคุมมิเตอร์แอร์แยกแผนก · ปีงบ ${fiscalYear}`
                    : `บันทึกและรายงานแยกประเภท · ปีงบ ${fiscalYear}`
            }
            breadcrumbs={[
                { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
                { title: 'ENV', href: route('env.index') },
                { title: 'สาธารณูปโภค', href: route('env.utilities.index') },
                { title: category.name, href: route('env.utilities.category', category.code) },
            ]}
            headTitle={`${category.name} · สาธารณูปโภค`}
            subNav={<EnvSubNav active="env.utilities.index" />}
            actions={
                <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" className="rounded-xl">
                        <Link href={route('env.utilities.index', { fiscal_year: fiscalYear })}>
                            <ArrowLeft className="mr-1 h-4 w-4" />
                            ภาพรวม
                        </Link>
                    </Button>
                    {isAcMeter && (
                        <Button asChild variant="outline" className="rounded-xl">
                            <a
                                href={route('env.utilities.ac-pdf', { fiscal_year: fiscalYear })}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <FileDown className="mr-1 h-4 w-4" />
                                PDF มิเตอร์แอร์
                            </a>
                        </Button>
                    )}
                    <select
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                        value={fiscalYear}
                        onChange={(e) => setYear(Number(e.target.value))}
                    >
                        {fiscalYears.map((y) => (
                            <option key={y} value={y}>
                                ปีงบ {y}
                            </option>
                        ))}
                    </select>
                </div>
            }
        >
            <UtilitiesSubNav active="overview" />

            <div className="mb-4 flex flex-wrap gap-2">
                {categories.map((c) => (
                    <Link key={c.code} href={route('env.utilities.category', c.code) + `?fiscal_year=${fiscalYear}`}>
                        <StatusPill
                            label={c.name}
                            className={
                                c.code === category.code
                                    ? 'border-teal-600 bg-teal-600 text-white'
                                    : 'border-slate-200 bg-white text-slate-700'
                            }
                        />
                    </Link>
                ))}
            </div>

            {!isAcMeter && (
                <Panel title="แนวโน้มรายเดือน" className="mb-4">
                    <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthly}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} width={70} />
                                <Tooltip formatter={(v: number) => money(v)} />
                                <Bar dataKey="total" name="บาท" fill="#0891b2" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Panel>
            )}

            {isAcMeter && meterReport ? (
                <AcMeterRegister
                    meterReport={meterReport}
                    showForm={showForm}
                    setShowForm={setShowForm}
                    months={months}
                    fiscalYear={fiscalYear}
                    defaultAcRate={defaultAcRate}
                    categoryId={category.id}
                    entries={entries}
                    acMeterNames={acMeterNames}
                    acCarryEntries={acCarryEntries}
                />
            ) : ledger ? (
                <CategoryLedgerPanel
                    category={category}
                    ledger={ledger}
                    showForm={showForm}
                    setShowForm={setShowForm}
                    form={form}
                    months={months}
                    submit={submit}
                />
            ) : (
                <EmptyState text="ยังไม่มีรายการในปีงบนี้" />
            )}
        </QualityPage>
    );
}

type AcDraftRow = {
    uid: string;
    line_label: string;
    prev_reading: string;
    curr_reading: string;
    rate: string;
    note: string;
    fromExisting: boolean;
};

const acReading = (v?: number | null) => (v == null || Number.isNaN(Number(v)) ? '' : String(v));

function findAcEntry(list: Entry[], name: string, yearBe: number, month: number) {
    return list.find(
        (e) =>
            String(e.line_label || '').trim() === name &&
            Number(e.year_be) === yearBe &&
            Number(e.month) === month,
    );
}

/** หาเรคคอร์ดล่าสุดของมิเตอร์ที่มาก่อนเดือนที่เลือก (ข้ามเดือนที่ไม่มีข้อมูลได้) */
function findLatestPriorAcEntry(list: Entry[], name: string, yearBe: number, month: number) {
    const prior = list
        .filter((e) => String(e.line_label || '').trim() === name)
        .filter((e) => {
            const y = Number(e.year_be);
            const m = Number(e.month);
            return y < yearBe || (y === yearBe && m < month);
        })
        .sort((a, b) => {
            if (Number(a.year_be) !== Number(b.year_be)) {
                return Number(a.year_be) - Number(b.year_be);
            }
            return Number(a.month) - Number(b.month);
        });

    return prior.length > 0 ? prior[prior.length - 1] : undefined;
}

function buildAcDraftRows({
    yearBe,
    month,
    months,
    entries,
    carryEntries,
    meterNames,
    defaultAcRate,
}: {
    yearBe: number;
    month: number;
    months: { year_be: number; month: number; label: string }[];
    entries: Entry[];
    carryEntries: Entry[];
    meterNames: string[];
    defaultAcRate: number;
}): AcDraftRow[] {
    const lookup = [...carryEntries, ...entries];

    const names = Array.from(
        new Set([
            ...meterNames.map((n) => n.trim()).filter(Boolean),
            ...entries.map((e) => String(e.line_label || '').trim()).filter(Boolean),
            ...carryEntries.map((e) => String(e.line_label || '').trim()).filter(Boolean),
        ]),
    ).sort((a, b) => a.localeCompare(b, 'th'));

    return names.map((name, i) => {
        const current = findAcEntry(entries, name, yearBe, month);
        const priorEntry = findLatestPriorAcEntry(lookup, name, yearBe, month);

        // ถ้าเดือนนี้บันทึกแล้วใช้เลขเดือนก่อนที่เก็บไว้ ไม่งั้นดึงจากเดือนล่าสุดที่มีข้อมูล
        const prevReading =
            current?.prev_reading != null
                ? current.prev_reading
                : priorEntry?.curr_reading != null
                  ? priorEntry.curr_reading
                  : null;

        const rate =
            current?.rate != null
                ? current.rate
                : priorEntry?.rate != null
                  ? priorEntry.rate
                  : defaultAcRate;

        return {
            uid: `m-${i}-${name}`,
            line_label: name,
            prev_reading: acReading(prevReading),
            curr_reading: acReading(current?.curr_reading),
            rate: acReading(rate) || String(defaultAcRate),
            note: current?.note_text || '',
            fromExisting: true,
        };
    });
}

function AcMeterRegister({
    meterReport,
    showForm,
    setShowForm,
    months,
    fiscalYear,
    defaultAcRate,
    categoryId,
    entries,
    acMeterNames,
    acCarryEntries,
}: {
    meterReport: MeterReport;
    showForm: boolean;
    setShowForm: (v: boolean | ((p: boolean) => boolean)) => void;
    months: { year_be: number; month: number; label: string }[];
    fiscalYear: number;
    defaultAcRate: number;
    categoryId: number;
    entries: Entry[];
    acMeterNames: string[];
    acCarryEntries: Entry[];
}) {
    const periods = meterReport.periods;
    const filledPeriods = useMemo(() => periods.filter((p) => p.has_data !== false && p.rows.length > 0), [periods]);
    const defaultKey = filledPeriods[filledPeriods.length - 1]?.key || periods[0]?.key || '';
    const [activeKey, setActiveKey] = useState(defaultKey);

    const defaultFormMonth = months[months.length - 1] || { year_be: fiscalYear, month: 1, label: '' };
    const [formYearBe, setFormYearBe] = useState(defaultFormMonth.year_be);
    const [formMonth, setFormMonth] = useState(defaultFormMonth.month);
    const [rows, setRows] = useState<AcDraftRow[]>([]);
    const [sharedRate, setSharedRate] = useState(String(defaultAcRate));
    const [saving, setSaving] = useState(false);

    const active = useMemo(
        () => periods.find((p) => p.key === activeKey) || filledPeriods[filledPeriods.length - 1] || null,
        [periods, filledPeriods, activeKey],
    );

    const meterCompareChart = useMemo(() => {
        if (!active || !(active.has_data ?? active.rows.length > 0)) return [];
        return [...active.rows]
            .map((r) => ({
                name: r.name.length > 16 ? `${r.name.slice(0, 15)}…` : r.name,
                fullName: r.name,
                units: Number(r.units ?? 0),
                cost: Number(r.cost ?? 0),
            }))
            .sort((a, b) => b.cost - a.cost);
    }, [active]);

    const meterChartHeight = Math.max(320, meterCompareChart.length * 34);

    const reloadDraftRows = (yearBe: number, month: number) => {
        const next = buildAcDraftRows({
            yearBe,
            month,
            months,
            entries,
            carryEntries: acCarryEntries,
            meterNames: acMeterNames,
            defaultAcRate,
        });
        setRows(next.length > 0 ? next : []);
        const rateSeed = next.find((r) => r.rate)?.rate || String(defaultAcRate);
        setSharedRate(rateSeed);
    };

    useEffect(() => {
        if (showForm) {
            reloadDraftRows(formYearBe, formMonth);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showForm, formYearBe, formMonth, entries, acMeterNames, acCarryEntries, defaultAcRate, months]);

    const updateRow = (uid: string, patch: Partial<AcDraftRow>) => {
        setRows((prev) => prev.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));
    };

    const addMeterRow = () => {
        setRows((prev) => [
            ...prev,
            {
                uid: `new-${Date.now()}`,
                line_label: '',
                prev_reading: '',
                curr_reading: '',
                rate: sharedRate || String(defaultAcRate),
                note: '',
                fromExisting: false,
            },
        ]);
    };

    const applySharedRate = () => {
        const rate = sharedRate || String(defaultAcRate);
        setRows((prev) => prev.map((r) => ({ ...r, rate })));
    };

    const submitBatch = (e: React.FormEvent) => {
        e.preventDefault();
        const payloadRows = rows
            .map((r) => ({
                line_label: r.line_label.trim(),
                prev_reading: r.prev_reading === '' ? null : Number(r.prev_reading),
                curr_reading: r.curr_reading === '' ? null : Number(r.curr_reading),
                rate: r.rate === '' ? null : Number(r.rate),
                note: r.note.trim() || null,
            }))
            .filter((r) => r.line_label !== '' && r.curr_reading !== null);

        if (payloadRows.length === 0) {
            alert('กรุณากรอกเลขมิเตอร์เดือนใหม่ อย่างน้อย 1 รายการ');
            return;
        }

        setSaving(true);
        router.post(
            route('env.utilities.ac-meters.batch'),
            {
                category_id: categoryId,
                year_be: formYearBe,
                month: formMonth,
                rows: payloadRows,
            },
            {
                preserveScroll: true,
                onFinish: () => setSaving(false),
                onSuccess: () => {
                    setShowForm(false);
                    setActiveKey(`${formYearBe}-${formMonth}`);
                },
            },
        );
    };

    const rowPreview = (row: AcDraftRow) => {
        const prev = row.prev_reading === '' ? null : Number(row.prev_reading);
        const curr = row.curr_reading === '' ? null : Number(row.curr_reading);
        const rate = row.rate === '' ? defaultAcRate : Number(row.rate);
        if (prev == null || curr == null || Number.isNaN(prev) || Number.isNaN(curr)) {
            return { units: null as number | null, cost: null as number | null };
        }
        const units = Math.round((curr - prev) * 100) / 100;
        const cost = Math.round(units * rate * 100) / 100;
        return { units, cost };
    };

    return (
        <div className="space-y-4">
            <Panel
                title="รายงานมิเตอร์แอร์"
                description="แยกเป็นช่องรายเดือน · ในแต่ละเดือนแสดงหน่วยที่ใช้และคิดเป็นเงิน"
                action={
                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" className="rounded-xl">
                            <a
                                href={route('env.utilities.ac-pdf', { fiscal_year: fiscalYear })}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <FileDown className="mr-1 h-4 w-4" />
                                PDF ทั้งปี
                            </a>
                        </Button>
                        <Button
                            className="rounded-xl"
                            onClick={() => {
                                if (!showForm && active) {
                                    setFormYearBe(active.year_be);
                                    setFormMonth(active.month);
                                }
                                setShowForm((v) => !v);
                            }}
                        >
                            <Plus className="mr-1 h-4 w-4" />
                            บันทึกข้อมูล
                        </Button>
                    </div>
                }
            >
                {showForm && (
                    <form
                        onSubmit={submitBatch}
                        className="mb-4 space-y-4 rounded-2xl border border-cyan-100 bg-cyan-50/40 p-4"
                    >
                        <div className="flex flex-wrap items-end gap-3">
                            <div>
                                <label className="mb-1 block text-xs text-slate-600">เดือนที่บันทึก *</label>
                                <select
                                    className="h-10 min-w-[160px] rounded-xl border border-slate-200 bg-white px-3 text-sm"
                                    value={`${formYearBe}-${formMonth}`}
                                    onChange={(e) => {
                                        const [y, m] = e.target.value.split('-').map(Number);
                                        setFormYearBe(y);
                                        setFormMonth(m);
                                    }}
                                >
                                    {months.map((m) => (
                                        <option key={`${m.year_be}-${m.month}`} value={`${m.year_be}-${m.month}`}>
                                            {m.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-slate-600">ค่าไฟ/หน่วย (ใช้ร่วม)</label>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={sharedRate}
                                        onChange={(e) => setSharedRate(e.target.value)}
                                        className="w-28 rounded-xl bg-white"
                                    />
                                    <Button type="button" variant="outline" className="rounded-xl" onClick={applySharedRate}>
                                        ใส่ทุกแถว
                                    </Button>
                                </div>
                            </div>
                            <Button type="button" variant="outline" className="rounded-xl" onClick={addMeterRow}>
                                <Plus className="mr-1 h-4 w-4" />
                                เพิ่มมิเตอร์ใหม่
                            </Button>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                            <table className="w-full min-w-[980px] border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold text-slate-600">
                                        <th className="w-10 px-2 py-2.5 text-center">#</th>
                                        <th className="min-w-[180px] px-2 py-2.5">มิเตอร์ประจำแผนก</th>
                                        <th className="w-32 px-2 py-2.5 text-right">เลขมิเตอร์เดือนก่อน</th>
                                        <th className="w-32 px-2 py-2.5 text-right">เลขมิเตอร์เดือนใหม่</th>
                                        <th className="w-28 px-2 py-2.5 text-right">ค่าไฟ/หน่วย</th>
                                        <th className="w-24 px-2 py-2.5 text-right">หน่วย</th>
                                        <th className="w-28 px-2 py-2.5 text-right">เป็นเงิน</th>
                                        <th className="min-w-[140px] px-2 py-2.5">หมายเหตุ</th>
                                        <th className="w-10 px-2 py-2.5"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="px-3 py-6 text-center text-slate-500">
                                                ยังไม่มีรายชื่อมิเตอร์ · กด “เพิ่มมิเตอร์ใหม่” เพื่อเริ่มบันทึก
                                            </td>
                                        </tr>
                                    ) : (
                                        rows.map((row, idx) => {
                                            const preview = rowPreview(row);
                                            return (
                                                <tr key={row.uid} className="border-b border-slate-50">
                                                    <td className="px-2 py-2 text-center text-slate-400">{idx + 1}</td>
                                                    <td className="px-2 py-2">
                                                        {row.fromExisting ? (
                                                            <div className="font-medium text-slate-900">{row.line_label}</div>
                                                        ) : (
                                                            <Input
                                                                value={row.line_label}
                                                                onChange={(e) =>
                                                                    updateRow(row.uid, { line_label: e.target.value })
                                                                }
                                                                placeholder="ชื่อแผนก / มิเตอร์"
                                                                className="h-9 rounded-lg"
                                                                required
                                                            />
                                                        )}
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <Input
                                                            type="number"
                                                            step="1"
                                                            value={row.prev_reading}
                                                            onChange={(e) =>
                                                                updateRow(row.uid, { prev_reading: e.target.value })
                                                            }
                                                            className="h-9 rounded-lg text-right"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <Input
                                                            type="number"
                                                            step="1"
                                                            value={row.curr_reading}
                                                            onChange={(e) =>
                                                                updateRow(row.uid, { curr_reading: e.target.value })
                                                            }
                                                            className="h-9 rounded-lg text-right"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={row.rate}
                                                            onChange={(e) => updateRow(row.uid, { rate: e.target.value })}
                                                            className="h-9 rounded-lg text-right"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2 text-right tabular-nums text-slate-700">
                                                        {preview.units == null ? '-' : num(preview.units)}
                                                    </td>
                                                    <td className="px-2 py-2 text-right tabular-nums font-medium text-teal-800">
                                                        {preview.cost == null ? '-' : money(preview.cost)}
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <Input
                                                            value={row.note}
                                                            onChange={(e) => updateRow(row.uid, { note: e.target.value })}
                                                            className="h-9 rounded-lg"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2 text-right">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="ghost"
                                                            className="rounded-lg text-rose-600"
                                                            onClick={() =>
                                                                setRows((prev) => prev.filter((r) => r.uid !== row.uid))
                                                            }
                                                            title="เอาออกจากฟอร์มนี้"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <p className="text-xs text-slate-500">
                            เลขมิเตอร์เดือนก่อนดึงจากเดือนที่แล้วอัตโนมัติถ้ามี · ค่าไฟ/หน่วยคงค่าเดิมไว้และแก้ได้ ·
                            ระบบคำนวณหน่วยและเงินให้อัตโนมัติเมื่อกรอกเลขมิเตอร์เดือนใหม่
                        </p>

                        <div className="flex flex-wrap gap-2">
                            <Button type="submit" className="rounded-xl" disabled={saving}>
                                บันทึกทั้งหมด
                            </Button>
                            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setShowForm(false)}>
                                ยกเลิก
                            </Button>
                        </div>
                    </form>
                )}

                <div className="mb-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-white px-4 py-3">
                        <div className="text-xs text-cyan-700">รวมทั้งปีงบ · หน่วยที่ใช้</div>
                        <div className="mt-1 text-2xl font-bold tabular-nums text-cyan-900">
                            {num(meterReport.totals.units)}{' '}
                            <span className="text-sm font-medium text-cyan-600">หน่วย</span>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white px-4 py-3">
                        <div className="text-xs text-amber-700">รวมทั้งปีงบ · คิดเป็นเงิน</div>
                        <div className="mt-1 text-2xl font-bold tabular-nums text-amber-900">
                            {money(meterReport.totals.cost)}{' '}
                            <span className="text-sm font-medium text-amber-600">บาท</span>
                        </div>
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {periods.map((period) => {
                        const hasData = Boolean(period.has_data ?? period.rows.length > 0);
                        const selected = active?.key === period.key;

                        return (
                            <button
                                key={period.key}
                                type="button"
                                onClick={() => setActiveKey(period.key)}
                                className={`rounded-2xl border p-4 text-left transition ${
                                    selected
                                        ? 'border-teal-500 bg-teal-50 shadow-sm ring-2 ring-teal-200'
                                        : hasData
                                          ? 'border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/40'
                                          : 'border-dashed border-slate-200 bg-slate-50/60 text-slate-400'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className={`text-sm font-semibold ${selected ? 'text-teal-900' : 'text-slate-800'}`}>
                                        {period.label}
                                    </div>
                                    {hasData ? (
                                        <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-medium text-teal-700">
                                            {period.rows.length} มิเตอร์
                                        </span>
                                    ) : (
                                        <span className="text-[10px]">ยังไม่มีข้อมูล</span>
                                    )}
                                </div>
                                <div className="mt-3 space-y-1.5">
                                    <div className="flex items-baseline justify-between gap-2">
                                        <span className="text-xs text-slate-500">ใช้ไฟ</span>
                                        <span className={`text-base font-bold tabular-nums ${hasData ? 'text-cyan-800' : ''}`}>
                                            {hasData ? num(period.total_units) : '-'}{' '}
                                            <span className="text-xs font-medium text-slate-500">หน่วย</span>
                                        </span>
                                    </div>
                                    <div className="flex items-baseline justify-between gap-2">
                                        <span className="text-xs text-slate-500">คิดเป็นเงิน</span>
                                        <span className={`text-base font-bold tabular-nums ${hasData ? 'text-amber-800' : ''}`}>
                                            {hasData ? money(period.total_cost) : '-'}{' '}
                                            <span className="text-xs font-medium text-slate-500">บาท</span>
                                        </span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </Panel>

            {active && (active.has_data ?? active.rows.length > 0) && (
                <Panel
                    title={`เปรียบเทียบมิเตอร์ประจำแผนก · ${active.label}`}
                    description="หน่วยไฟฟ้าที่ใช้ และจำนวนเงินของแต่ละมิเตอร์"
                >
                    <div style={{ height: meterChartHeight }} className="w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                                data={meterCompareChart}
                                layout="vertical"
                                margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                <XAxis
                                    type="number"
                                    xAxisId="cost"
                                    orientation="bottom"
                                    tick={{ fontSize: 11, fill: '#0f766e' }}
                                    tickFormatter={(v) =>
                                        new Intl.NumberFormat('th-TH', { notation: 'compact' }).format(v)
                                    }
                                />
                                <XAxis
                                    type="number"
                                    xAxisId="units"
                                    orientation="top"
                                    tick={{ fontSize: 11, fill: '#0369a1' }}
                                    tickFormatter={(v) =>
                                        new Intl.NumberFormat('th-TH', { notation: 'compact' }).format(v)
                                    }
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={128}
                                    tick={{ fontSize: 11, fill: '#334155' }}
                                />
                                <Tooltip
                                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                                    formatter={(v: number, name: string) =>
                                        name === 'บาท' ? `${money(v)} บาท` : `${num(v)} หน่วย`
                                    }
                                    contentStyle={{
                                        borderRadius: 12,
                                        border: '1px solid #ccfbf1',
                                        boxShadow: '0 8px 24px rgba(15,118,110,0.08)',
                                    }}
                                />
                                <Legend />
                                <Bar
                                    xAxisId="cost"
                                    dataKey="cost"
                                    name="บาท"
                                    fill="#0d9488"
                                    radius={[0, 8, 8, 0]}
                                    barSize={11}
                                />
                                <Bar
                                    xAxisId="units"
                                    dataKey="units"
                                    name="หน่วย"
                                    fill="#0284c7"
                                    radius={[0, 8, 8, 0]}
                                    barSize={11}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </Panel>
            )}

            {active && (
                <Panel
                    title={`รายละเอียด · ${active.label}`}
                    description="มิเตอร์ประจำแผนก · ใช้ไฟกี่หน่วย · คิดเป็นเงิน"
                    action={
                        (active.has_data ?? active.rows.length > 0) ? (
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    className="rounded-xl"
                                    onClick={() => {
                                        setFormYearBe(active.year_be);
                                        setFormMonth(active.month);
                                        setShowForm(true);
                                    }}
                                >
                                    <Plus className="mr-1 h-4 w-4" />
                                    บันทึก/แก้ไขเดือนนี้
                                </Button>
                                <Button asChild variant="outline" className="rounded-xl">
                                    <a
                                        href={route('env.utilities.ac-pdf', {
                                            fiscal_year: fiscalYear,
                                            month: active.key,
                                        })}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <FileDown className="mr-1 h-4 w-4" />
                                        PDF เดือนนี้
                                    </a>
                                </Button>
                            </div>
                        ) : (
                            <Button
                                className="rounded-xl"
                                onClick={() => {
                                    setFormYearBe(active.year_be);
                                    setFormMonth(active.month);
                                    setShowForm(true);
                                }}
                            >
                                <Plus className="mr-1 h-4 w-4" />
                                บันทึกเดือนนี้
                            </Button>
                        )
                    }
                >
                    {(active.has_data ?? active.rows.length > 0) ? (
                        <>
                            <div className="mb-4 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-xl border border-cyan-100 bg-cyan-50/50 px-4 py-3">
                                    <div className="text-xs text-cyan-700">ใช้ไฟรวมเดือนนี้</div>
                                    <div className="mt-1 text-xl font-bold tabular-nums text-cyan-900">
                                        {num(active.total_units)} หน่วย
                                    </div>
                                </div>
                                <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3">
                                    <div className="text-xs text-amber-700">คิดเป็นเงินรวมเดือนนี้</div>
                                    <div className="mt-1 text-xl font-bold tabular-nums text-amber-900">
                                        {money(active.total_cost)} บาท
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full min-w-[480px] border-collapse text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold text-slate-600">
                                            <th className="w-14 px-3 py-2.5 text-center">ลำดับ</th>
                                            <th className="px-3 py-2.5">มิเตอร์ประจำแผนก</th>
                                            <th className="px-3 py-2.5 text-right">ใช้ไฟ (หน่วย)</th>
                                            <th className="px-3 py-2.5 text-right">คิดเป็นเงิน (บาท)</th>
                                            <th className="w-12 px-3 py-2.5"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {active.rows.map((row) => (
                                            <tr key={row.entry_id} className="border-b border-slate-50 hover:bg-cyan-50/30">
                                                <td className="px-3 py-2.5 text-center tabular-nums text-slate-500">{row.no}</td>
                                                <td className="px-3 py-2.5 font-medium text-slate-900">{row.name}</td>
                                                <td className="px-3 py-2.5 text-right tabular-nums font-medium text-slate-800">
                                                    {num(row.units)}
                                                </td>
                                                <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-teal-800">
                                                    {money(row.cost)}
                                                </td>
                                                <td className="px-3 py-2.5 text-right">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="rounded-lg text-rose-600"
                                                        onClick={() => {
                                                            if (confirm('ลบรายการนี้?')) {
                                                                router.delete(route('env.utilities.entries.destroy', row.entry_id), {
                                                                    preserveScroll: true,
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 border-teal-200 bg-teal-50/80 font-semibold">
                                            <td className="px-3 py-2.5" colSpan={2}>
                                                รวม
                                            </td>
                                            <td className="px-3 py-2.5 text-right tabular-nums">{num(active.total_units)}</td>
                                            <td className="px-3 py-2.5 text-right tabular-nums text-teal-900">
                                                {money(active.total_cost)}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </>
                    ) : (
                        <EmptyState text={`ยังไม่มีข้อมูลมิเตอร์แอร์ในเดือน ${active.label}`} />
                    )}
                </Panel>
            )}
        </div>
    );
}

function CategoryLedgerPanel({
    category,
    ledger,
    showForm,
    setShowForm,
    form,
    months,
    submit,
}: {
    category: Category;
    ledger: Ledger;
    showForm: boolean;
    setShowForm: (v: boolean | ((p: boolean) => boolean)) => void;
    form: ReturnType<typeof useForm<any>>;
    months: { year_be: number; month: number; label: string }[];
    submit: (e: React.FormEvent) => void;
}) {
    return (
        <Panel
            title={category.name}
            description="รูปแบบตารางตามไฟล์ต้นทาง · แสดงเดือนทั้งปีงบ"
            action={
                <Button className="rounded-xl" onClick={() => setShowForm((v) => !v)}>
                    <Plus className="mr-1 h-4 w-4" />
                    บันทึกข้อมูล
                </Button>
            }
        >
            {showForm && (
                <form onSubmit={submit} className="mb-4 grid gap-3 rounded-2xl border border-teal-100 bg-teal-50/40 p-4 sm:grid-cols-3">
                    <div>
                        <label className="mb-1 block text-xs text-slate-600">เดือน</label>
                        <select
                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                            value={`${form.data.year_be}-${form.data.month}`}
                            onChange={(e) => {
                                const [y, m] = e.target.value.split('-').map(Number);
                                form.setData('year_be', y);
                                form.setData('month', m);
                            }}
                        >
                            {months.map((m) => (
                                <option key={`${m.year_be}-${m.month}`} value={`${m.year_be}-${m.month}`}>
                                    {m.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    {category.has_line_items && (
                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-xs text-slate-600">รายการย่อย / เลขสัญญา</label>
                            <Input
                                value={form.data.line_label}
                                onChange={(e) => form.setData('line_label', e.target.value)}
                                className="rounded-xl bg-white"
                            />
                        </div>
                    )}
                    {category.has_invoice && (
                        <div>
                            <label className="mb-1 block text-xs text-slate-600">ใบแจ้งหนี้ (บาท)</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={form.data.invoice_amount}
                                onChange={(e) => form.setData('invoice_amount', e.target.value)}
                                className="rounded-xl bg-white"
                            />
                        </div>
                    )}
                    {category.has_medical && (
                        <div>
                            <label className="mb-1 block text-xs text-slate-600">งบการแพทย์ (บาท)</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={form.data.budget_medical}
                                onChange={(e) => form.setData('budget_medical', e.target.value)}
                                className="rounded-xl bg-white"
                            />
                        </div>
                    )}
                    {category.has_revenue && (
                        <div>
                            <label className="mb-1 block text-xs text-slate-600">งบรายรับ (บาท)</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={form.data.budget_revenue}
                                onChange={(e) => form.setData('budget_revenue', e.target.value)}
                                className="rounded-xl bg-white"
                            />
                        </div>
                    )}
                    {category.has_admin && (
                        <div>
                            <label className="mb-1 block text-xs text-slate-600">งบบริหารหน่วย (บาท)</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={form.data.budget_admin}
                                onChange={(e) => form.setData('budget_admin', e.target.value)}
                                className="rounded-xl bg-white"
                            />
                        </div>
                    )}
                    <div className="sm:col-span-3">
                        <label className="mb-1 block text-xs text-slate-600">หมายเหตุ</label>
                        <Input
                            value={form.data.note}
                            onChange={(e) => form.setData('note', e.target.value)}
                            className="rounded-xl bg-white"
                        />
                    </div>
                    <div className="flex gap-2 sm:col-span-3">
                        <Button type="submit" className="rounded-xl" disabled={form.processing}>
                            บันทึก
                        </Button>
                        <Button type="button" variant="outline" className="rounded-xl" onClick={() => setShowForm(false)}>
                            ยกเลิก
                        </Button>
                    </div>
                </form>
            )}

            <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[760px] border-collapse text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold text-slate-600">
                            <th className="px-3 py-2.5 w-28">เดือนปี</th>
                            {category.has_invoice && <th className="px-3 py-2.5 text-right">ใบแจ้งหนี้</th>}
                            {category.has_medical && <th className="px-3 py-2.5 text-right">งบการแพทย์</th>}
                            {category.has_revenue && <th className="px-3 py-2.5 text-right">งบรายรับ</th>}
                            {category.has_admin && <th className="px-3 py-2.5 text-right">งบบริหารหน่วย</th>}
                            <th className="px-3 py-2.5">หมายเหตุ</th>
                            <th className="px-3 py-2.5 w-12"></th>
                        </tr>
                        <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] text-slate-400">
                            <th className="px-3 py-1"></th>
                            {category.has_invoice && <th className="px-3 py-1 text-right">จำนวนเงิน(บาท)</th>}
                            {category.has_medical && <th className="px-3 py-1 text-right">จำนวนเงิน(บาท)</th>}
                            {category.has_revenue && <th className="px-3 py-1 text-right">จำนวนเงิน(บาท)</th>}
                            {category.has_admin && <th className="px-3 py-1 text-right">จำนวนเงิน(บาท)</th>}
                            <th className="px-3 py-1"></th>
                            <th className="px-3 py-1"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {ledger.periods.map((period) => {
                            if (!period.has_data) {
                                return (
                                    <tr key={period.key} className="border-b border-slate-50 text-slate-400">
                                        <td className="px-3 py-2 font-medium text-slate-700">{period.label}</td>
                                        {category.has_invoice && <td className="px-3 py-2 text-right">-</td>}
                                        {category.has_medical && <td className="px-3 py-2 text-right">-</td>}
                                        {category.has_revenue && <td className="px-3 py-2 text-right">-</td>}
                                        {category.has_admin && <td className="px-3 py-2 text-right">-</td>}
                                        <td className="px-3 py-2">-</td>
                                        <td className="px-3 py-2"></td>
                                    </tr>
                                );
                            }

                            return period.rows.map((row, idx) => (
                                <tr
                                    key={row.id}
                                    className={`border-b border-slate-50 hover:bg-teal-50/30 ${row.is_sub ? 'bg-slate-50/40' : ''}`}
                                >
                                    <td className="px-3 py-2 font-medium text-slate-800">
                                        {idx === 0 ? period.label : ''}
                                    </td>
                                    {category.has_invoice && (
                                        <td className="px-3 py-2 text-right tabular-nums">{money(row.invoice_amount)}</td>
                                    )}
                                    {category.has_medical && (
                                        <td className="px-3 py-2 text-right tabular-nums">{money(row.budget_medical)}</td>
                                    )}
                                    {category.has_revenue && (
                                        <td className="px-3 py-2 text-right tabular-nums">{money(row.budget_revenue)}</td>
                                    )}
                                    {category.has_admin && (
                                        <td className="px-3 py-2 text-right tabular-nums">{money(row.budget_admin)}</td>
                                    )}
                                    <td className="max-w-[260px] px-3 py-2 text-xs text-slate-500">
                                        <div className="line-clamp-2">{row.note || row.line_label || '-'}</div>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="rounded-lg text-rose-600"
                                            onClick={() => {
                                                if (confirm('ลบรายการนี้?')) {
                                                    router.delete(route('env.utilities.entries.destroy', row.id), {
                                                        preserveScroll: true,
                                                    });
                                                }
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ));
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-teal-200 bg-teal-50/80 font-semibold">
                            <td className="px-3 py-2.5">รวมเงิน</td>
                            {category.has_invoice && (
                                <td className="px-3 py-2.5 text-right tabular-nums">{money(ledger.grand_totals.invoice)}</td>
                            )}
                            {category.has_medical && (
                                <td className="px-3 py-2.5 text-right tabular-nums">{money(ledger.grand_totals.medical)}</td>
                            )}
                            {category.has_revenue && (
                                <td className="px-3 py-2.5 text-right tabular-nums">{money(ledger.grand_totals.revenue)}</td>
                            )}
                            {category.has_admin && (
                                <td className="px-3 py-2.5 text-right tabular-nums">{money(ledger.grand_totals.admin)}</td>
                            )}
                            <td className="px-3 py-2.5 text-xs text-slate-500" colSpan={2}>
                                รวมใช้จ่าย {money(ledger.grand_totals.display_total)} บาท
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </Panel>
    );
}
