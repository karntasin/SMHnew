import React, { useEffect, useMemo, useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Ban,
    CalendarDays,
    CalendarX2,
    CheckCircle2,
    ClipboardCheck,
    FileDown,
    History,
    ListPlus,
    Pencil,
    Trash2,
} from 'lucide-react';
import { QualityPage, Panel, StatusPill, EmptyState } from '@/components/quality/quality-ui';
import EnvSubNav from '@/pages/Env/EnvSubNav';
import AssetsSubNav from '@/pages/Env/Assets/AssetsSubNav';
import InspectionSubNav from '@/pages/Env/Assets/Inspection/InspectionSubNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { ThaiDatePicker, formatThaiDateFromIso, formatThaiDateRangeFromIso } from '@/components/ui/thai-date-picker';

interface AssetBrief {
    id: number;
    name: string;
    stock_number?: string | null;
    serial_number?: string | null;
    brand?: string | null;
    model?: string | null;
    risk_level_label?: string | null;
    issue_location?: string | null;
    location?: string | null;
    line?: { id: number; name: string; short_name?: string | null } | null;
}

interface Item {
    id: number;
    department_label?: string | null;
    scheduled_date?: string | null;
    scheduled_date_label?: string | null;
    result: string;
    result_label: string;
    notes?: string | null;
    inspected_at?: string | null;
    inspected_at_label?: string | null;
    inspector_name?: string | null;
    asset: AssetBrief | null;
}

interface Cycle {
    id: number;
    name: string;
    fiscal_year?: string | null;
    status: string;
    status_label: string;
    period_start?: string | null;
    period_end?: string | null;
    period_label?: string | null;
    default_scheduled_date?: string | null;
    notes?: string | null;
    items_count: number;
    pending_count: number;
    pass_count: number;
    fail_count: number;
    is_cancelled?: boolean;
    cancelled_at?: string | null;
    cancelled_by_name?: string | null;
    cancel_reason?: string | null;
}

interface CancellationLog {
    id: number;
    action: string;
    action_label: string;
    mode?: string | null;
    scheduled_date?: string | null;
    scheduled_date_label?: string | null;
    items_count: number;
    pending_count: number;
    pass_count: number;
    fail_count: number;
    had_results: boolean;
    force_confirmed: boolean;
    reason?: string | null;
    canceller_name?: string | null;
    created_at?: string | null;
}

interface Props {
    cycle: Cycle;
    items: Item[];
    availableAssets: AssetBrief[];
    availableTotal: number;
    cancellations?: CancellationLog[];
    results: { value: string; label: string }[];
    filters: { tab: string; q?: string; result?: string | null };
}

const statusStyle: Record<string, string> = {
    draft: 'border-slate-200 bg-slate-50 text-slate-700',
    scheduled: 'border-sky-200 bg-sky-50 text-sky-800',
    in_progress: 'border-amber-200 bg-amber-50 text-amber-800',
    completed: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    cancelled: 'border-rose-200 bg-rose-50 text-rose-800',
};

const resultStyle: Record<string, string> = {
    pending: 'border-amber-200 bg-amber-50 text-amber-800',
    pass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    fail: 'border-rose-200 bg-rose-50 text-rose-800',
};

type TabKey = 'register' | 'schedule' | 'results';

export default function CycleShow({
    cycle,
    items,
    availableAssets,
    availableTotal,
    cancellations = [],
    results,
    filters,
}: Props) {
    const tab = (filters.tab || 'register') as TabKey;
    const isCancelled = !!cycle.is_cancelled || cycle.status === 'cancelled';
    const [q, setQ] = useState(filters.q || '');
    const [selected, setSelected] = useState<number[]>([]);
    const [bulkDate, setBulkDate] = useState(cycle.default_scheduled_date || cycle.period_start || '');
    const [periodStart, setPeriodStart] = useState(cycle.period_start || cycle.default_scheduled_date || '');
    const [periodEnd, setPeriodEnd] = useState(cycle.period_end || cycle.period_start || cycle.default_scheduled_date || '');
    const [cancelDate, setCancelDate] = useState('');
    const [overwrite, setOverwrite] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [cancelCycleOpen, setCancelCycleOpen] = useState(false);
    const [cancelCycleReason, setCancelCycleReason] = useState('');
    const [dateCancelOpen, setDateCancelOpen] = useState(false);
    const [dateCancelMode, setDateCancelMode] = useState<'clear_date' | 'remove_items'>('clear_date');
    const [dateCancelReason, setDateCancelReason] = useState('');
    const [rowDates, setRowDates] = useState<Record<number, string>>(() =>
        Object.fromEntries(items.map((i) => [i.id, i.scheduled_date || ''])),
    );
    const [rowNotes, setRowNotes] = useState<Record<number, string>>(() =>
        Object.fromEntries(items.map((i) => [i.id, i.notes || ''])),
    );
    const [rowDept, setRowDept] = useState<Record<number, string>>(() =>
        Object.fromEntries(items.map((i) => [i.id, i.department_label || ''])),
    );

    const editForm = useForm({
        name: cycle.name,
        fiscal_year: cycle.fiscal_year || '',
        period_start: cycle.period_start || cycle.default_scheduled_date || '',
        period_end: cycle.period_end || cycle.period_start || cycle.default_scheduled_date || '',
        notes: cycle.notes || '',
    });

    useEffect(() => {
        setRowDates(Object.fromEntries(items.map((i) => [i.id, i.scheduled_date || ''])));
        setRowNotes(Object.fromEntries(items.map((i) => [i.id, i.notes || ''])));
        setRowDept(Object.fromEntries(items.map((i) => [i.id, i.department_label || ''])));
    }, [items]);

    useEffect(() => {
        setPeriodStart(cycle.period_start || cycle.default_scheduled_date || '');
        setPeriodEnd(cycle.period_end || cycle.period_start || cycle.default_scheduled_date || '');
        setBulkDate(cycle.default_scheduled_date || cycle.period_start || '');
    }, [cycle.id, cycle.period_start, cycle.period_end, cycle.default_scheduled_date]);

    const registerForm = useForm({
        select_all: false as boolean,
        asset_ids: [] as number[],
    });

    const periodDisplay =
        cycle.period_label ||
        formatThaiDateRangeFromIso(cycle.period_start, cycle.period_end) ||
        formatThaiDateFromIso(cycle.default_scheduled_date || undefined);

    const allAvailableIds = useMemo(() => availableAssets.map((a) => a.id), [availableAssets]);
    const allSelected = selected.length > 0 && selected.length === allAvailableIds.length;

    const setTab = (next: TabKey) => {
        router.get(
            route('env.assets.inspection.cycles.show', cycle.id),
            { tab: next, q: q || undefined, result: filters.result || undefined },
            { preserveState: true, replace: true },
        );
    };

    const applySearch = () => {
        router.get(
            route('env.assets.inspection.cycles.show', cycle.id),
            { tab, q: q || undefined, result: filters.result || undefined },
            { preserveState: true, replace: true },
        );
    };

    const toggleSelect = (id: number) => {
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const toggleSelectAll = () => {
        setSelected(allSelected ? [] : allAvailableIds);
    };

    const addSelected = () => {
        registerForm.transform(() => ({
            select_all: false,
            asset_ids: selected,
            scheduled_date: null,
        }));
        registerForm.post(route('env.assets.inspection.cycles.items.store', cycle.id), {
            preserveScroll: true,
            onSuccess: () => setSelected([]),
        });
    };

    const addAll = () => {
        if (!confirm(`ลงทะเบียนทั้งหมด ${availableTotal.toLocaleString('th-TH')} รายการที่ยังไม่อยู่ในวงรอบนี้?`)) {
            return;
        }
        registerForm.transform(() => ({
            select_all: true,
            asset_ids: [],
            scheduled_date: null,
        }));
        registerForm.post(route('env.assets.inspection.cycles.items.store', cycle.id), {
            preserveScroll: true,
            onSuccess: () => setSelected([]),
        });
    };

    const saveBulkDates = () => {
        router.put(
            route('env.assets.inspection.cycles.dates', cycle.id),
            {
                scheduled_date: bulkDate || null,
                overwrite,
            },
            { preserveScroll: true },
        );
    };

    const savePeriod = () => {
        router.put(
            route('env.assets.inspection.cycles.dates', cycle.id),
            {
                period_start: periodStart || null,
                period_end: periodEnd || periodStart || null,
            },
            { preserveScroll: true },
        );
    };

    const saveRowDates = () => {
        router.put(
            route('env.assets.inspection.cycles.dates', cycle.id),
            {
                item_dates: items.map((i) => ({
                    id: i.id,
                    scheduled_date: rowDates[i.id] || null,
                })),
            },
            { preserveScroll: true },
        );
    };

    const itemsOnCancelDate = useMemo(
        () => (cancelDate ? items.filter((i) => i.scheduled_date === cancelDate) : []),
        [cancelDate, items],
    );
    const countOnCancelDate = itemsOnCancelDate.length;
    const cancelDateResultCounts = useMemo(() => {
        const pass = itemsOnCancelDate.filter((i) => i.result === 'pass').length;
        const fail = itemsOnCancelDate.filter((i) => i.result === 'fail').length;
        const pending = itemsOnCancelDate.filter((i) => i.result === 'pending').length;
        return { pass, fail, pending, hadResults: pass + fail > 0 };
    }, [itemsOnCancelDate]);

    const openDateCancel = (mode: 'clear_date' | 'remove_items') => {
        if (!cancelDate || countOnCancelDate === 0 || isCancelled) return;
        setDateCancelMode(mode);
        setDateCancelReason('');
        setDateCancelOpen(true);
    };

    const confirmDateCancel = () => {
        if (!cancelDate) return;
        router.post(
            route('env.assets.inspection.cycles.cancel-date', cycle.id),
            {
                scheduled_date: cancelDate,
                mode: dateCancelMode,
                reason: dateCancelReason || null,
                confirm_force: cancelDateResultCounts.hadResults,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setCancelDate('');
                    setDateCancelOpen(false);
                    setDateCancelReason('');
                },
            },
        );
    };

    const confirmCancelCycle = () => {
        const hadResults = cycle.pass_count + cycle.fail_count > 0;
        router.post(
            route('env.assets.inspection.cycles.cancel', cycle.id),
            {
                reason: cancelCycleReason || null,
                confirm_force: hadResults,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setCancelCycleOpen(false);
                    setCancelCycleReason('');
                },
            },
        );
    };

    const saveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        editForm.transform((data) => ({
            name: data.name,
            fiscal_year: data.fiscal_year || null,
            period_start: data.period_start || null,
            period_end: data.period_end || data.period_start || null,
            notes: data.notes || null,
        }));
        editForm.put(route('env.assets.inspection.cycles.update', cycle.id), {
            preserveScroll: true,
            onSuccess: () => setShowEdit(false),
        });
    };

    const saveResult = (item: Item, result: string) => {
        if (isCancelled) return;
        router.put(
            route('env.assets.inspection.cycles.items.update', [cycle.id, item.id]),
            {
                result,
                notes: rowNotes[item.id] ?? item.notes ?? null,
                department_label: rowDept[item.id] ?? item.department_label ?? null,
                scheduled_date: rowDates[item.id] || item.scheduled_date || null,
            },
            { preserveScroll: true },
        );
    };

    const removeItem = (item: Item) => {
        if (isCancelled) return;
        const hadResults = item.result !== 'pending';
        const msg = hadResults
            ? `รายการนี้บันทึกผลตรวจแล้ว (${item.result_label}) — ยืนยันนำออกจากวงรอบ?\nข้อมูลผลตรวจจะถูกลบ`
            : 'นำรายการนี้ออกจากวงรอบ?';
        if (!confirm(msg)) return;
        const url = route('env.assets.inspection.cycles.items.destroy', [cycle.id, item.id]);
        router.delete(hadResults ? `${url}?confirm_force=1` : url, {
            preserveScroll: true,
        });
    };

    const completeCycle = () => {
        if (isCancelled) return;
        if (!confirm('ปิดวงรอบนี้เมื่อตรวจครบทุกรายการแล้ว?')) return;
        router.post(route('env.assets.inspection.cycles.complete', cycle.id), {}, { preserveScroll: true });
    };

    const tabs: { key: TabKey; label: string; icon: typeof ListPlus }[] = [
        { key: 'register', label: '1. ลงทะเบียน', icon: ListPlus },
        { key: 'schedule', label: '2. กำหนดวัน / แจ้งแผนก', icon: CalendarDays },
        { key: 'results', label: '3. บันทึกผล / รายงาน', icon: ClipboardCheck },
    ];

    return (
        <QualityPage
            tone="teal"
            icon={ClipboardCheck}
            badge="ศูนย์พัฒนาคุณภาพ · ENV"
            title={cycle.name}
            subtitle="จัดการวงรอบตรวจสภาพครุภัณฑ์"
            breadcrumbs={[
                { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
                { title: 'ENV', href: route('env.index') },
                { title: 'ทะเบียนครุภัณฑ์', href: route('env.assets.index') },
                { title: 'การสอบเทียบ', href: route('env.assets.inspection') },
                { title: 'วงรอบการสอบเทียบ', href: route('env.assets.inspection.cycles') },
                { title: cycle.name, href: route('env.assets.inspection.cycles.show', cycle.id) },
            ]}
            headTitle={`${cycle.name} · ตรวจสภาพ ENV`}
            subNav={<EnvSubNav active="env.assets.index" />}
        >
            <AssetsSubNav active="inspection" />
            <InspectionSubNav active="cycles" />

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <Button asChild variant="outline" className="rounded-xl">
                    <Link href={route('env.assets.inspection.cycles')}>
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        กลับรายการวงรอบ
                    </Link>
                </Button>
                <div className="flex flex-wrap gap-2">
                    {!isCancelled && (
                        <Button variant="outline" className="rounded-xl" onClick={() => setShowEdit((v) => !v)}>
                            <Pencil className="mr-1 h-4 w-4" />
                            แก้ไขวงรอบ
                        </Button>
                    )}
                    <Button asChild variant="outline" className="rounded-xl" disabled={cycle.items_count === 0}>
                        <a href={route('env.assets.inspection.cycles.prepare-pdf', cycle.id)} target="_blank" rel="noreferrer">
                            <FileDown className="mr-1 h-4 w-4" />
                            PDF แจ้งแผนก
                        </a>
                    </Button>
                    <Button asChild variant="outline" className="rounded-xl" disabled={cycle.items_count === 0}>
                        <a href={route('env.assets.inspection.cycles.result-pdf', cycle.id)} target="_blank" rel="noreferrer">
                            <FileDown className="mr-1 h-4 w-4" />
                            PDF รายงานผล
                        </a>
                    </Button>
                    {!isCancelled && cycle.status !== 'completed' && (
                        <Button className="rounded-xl" onClick={completeCycle} disabled={cycle.pending_count > 0 || cycle.items_count === 0}>
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            ปิดวงรอบ
                        </Button>
                    )}
                    {!isCancelled && (
                        <Button
                            variant="outline"
                            className="rounded-xl border-rose-300 text-rose-700 hover:bg-rose-50"
                            onClick={() => {
                                setCancelCycleReason('');
                                setCancelCycleOpen(true);
                            }}
                        >
                            <Ban className="mr-1 h-4 w-4" />
                            ยกเลิกวงรอบ
                        </Button>
                    )}
                </div>
            </div>

            {isCancelled && (
                <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                    <div className="font-semibold">วงรอบนี้ถูกยกเลิกแล้ว</div>
                    <div className="mt-1 text-xs text-rose-800">
                        {cycle.cancelled_at && <span>เมื่อ {cycle.cancelled_at}</span>}
                        {cycle.cancelled_by_name && <span> · โดย {cycle.cancelled_by_name}</span>}
                        {cycle.cancel_reason && <span> · เหตุผล: {cycle.cancel_reason}</span>}
                    </div>
                </div>
            )}

            {showEdit && !isCancelled && (
                <Panel title="แก้ไขข้อมูลวงรอบ" className="mb-4">
                    <form onSubmit={saveEdit} className="grid gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-xs text-slate-600">ชื่อวงรอบ *</label>
                            <Input
                                value={editForm.data.name}
                                onChange={(e) => editForm.setData('name', e.target.value)}
                                className="rounded-xl"
                                required
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-slate-600">ปีงบประมาณ</label>
                            <Input
                                value={editForm.data.fiscal_year}
                                onChange={(e) => editForm.setData('fiscal_year', e.target.value)}
                                className="rounded-xl"
                                placeholder="เช่น 2569"
                            />
                        </div>
                        <div className="sm:col-span-2 rounded-xl border border-teal-100 bg-teal-50/40 p-3">
                            <div className="mb-2 text-xs font-semibold text-teal-900">ช่วงวันตรวจของวงรอบ</div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <ThaiDatePicker
                                    label="วันเริ่มต้น"
                                    value={editForm.data.period_start}
                                    onChange={(v) => {
                                        editForm.setData('period_start', v);
                                        if (!editForm.data.period_end || (v && editForm.data.period_end < v)) {
                                            editForm.setData('period_end', v);
                                        }
                                    }}
                                    placeholder="เลือกวันเริ่ม"
                                    className="w-full"
                                />
                                <ThaiDatePicker
                                    label="วันสิ้นสุด"
                                    value={editForm.data.period_end}
                                    onChange={(v) => editForm.setData('period_end', v)}
                                    placeholder="เลือกวันสิ้นสุด"
                                    className="w-full"
                                />
                            </div>
                            {(editForm.data.period_start || editForm.data.period_end) && (
                                <div className="mt-2 inline-flex rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-medium text-teal-900">
                                    {formatThaiDateRangeFromIso(editForm.data.period_start, editForm.data.period_end)}
                                </div>
                            )}
                        </div>
                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-xs text-slate-600">หมายเหตุ</label>
                            <Textarea
                                value={editForm.data.notes}
                                onChange={(e) => editForm.setData('notes', e.target.value)}
                                className="rounded-xl"
                                rows={3}
                            />
                        </div>
                        <div className="flex gap-2 sm:col-span-2">
                            <Button type="submit" className="rounded-xl" disabled={editForm.processing}>
                                บันทึกการแก้ไข
                            </Button>
                            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setShowEdit(false)}>
                                ยกเลิก
                            </Button>
                        </div>
                    </form>
                </Panel>
            )}

            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:col-span-2 lg:col-span-1">
                    <div className="text-xs text-slate-500">สถานะ</div>
                    <div className="mt-1">
                        <StatusPill label={cycle.status_label} className={cn(statusStyle[cycle.status])} />
                    </div>
                    {cycle.fiscal_year && <div className="mt-1 text-xs text-slate-500">ปีงบ {cycle.fiscal_year}</div>}
                    {periodDisplay && (
                        <div className="mt-2 inline-flex rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-medium leading-snug text-teal-900">
                            {periodDisplay}
                        </div>
                    )}
                </div>
                <Kpi label="ในวงรอบ" value={cycle.items_count} />
                <Kpi label="ผ่าน" value={cycle.pass_count} tone="emerald" />
                <Kpi label="ไม่ผ่าน" value={cycle.fail_count} tone="rose" />
                <Kpi label="รอตรวจ" value={cycle.pending_count} tone="amber" />
            </div>

            <div className="mb-4 grid gap-2 sm:grid-cols-3">
                {tabs.map((t) => {
                    const Icon = t.icon;
                    const active = tab === t.key;
                    return (
                        <button
                            key={t.key}
                            type="button"
                            onClick={() => setTab(t.key)}
                            className={cn(
                                'flex items-center gap-2 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition',
                                active
                                    ? 'border-teal-600 bg-teal-600 text-white shadow-md shadow-teal-700/20'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50/50',
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {tab === 'register' && (
                <Panel
                    title="ลงทะเบียนครุภัณฑ์เข้าวงรอบ"
                    description={`ยังไม่อยู่ในวงรอบ ${availableTotal.toLocaleString('th-TH')} รายการ · แสดงสูงสุด 500 รายการ`}
                    action={
                        <div className="flex flex-wrap items-center gap-2">
                            <Input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                                placeholder="ค้นหา"
                                className="min-w-[180px] rounded-xl"
                            />
                            <Button variant="outline" className="rounded-xl" onClick={applySearch}>
                                ค้นหา
                            </Button>
                        </div>
                    }
                >
                    <div className="mb-3 flex flex-wrap items-end gap-3 rounded-xl border border-teal-100 bg-teal-50/40 p-3">
                        <Button className="rounded-xl" onClick={addSelected} disabled={selected.length === 0 || registerForm.processing}>
                            เพิ่มที่เลือก ({selected.length})
                        </Button>
                        <Button
                            variant="outline"
                            className="rounded-xl"
                            onClick={addAll}
                            disabled={availableTotal === 0 || registerForm.processing}
                        >
                            เพิ่มทั้งหมด ({availableTotal})
                        </Button>
                    </div>

                    {availableAssets.length === 0 ? (
                        <EmptyState text="ไม่มีรายการเหลือให้ลงทะเบียน หรือครบทุกชิ้นแล้ว" />
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-100">
                            <table className="w-full min-w-[900px] border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[11px] font-semibold text-slate-500 uppercase">
                                        <th className="px-3 py-2.5">
                                            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                                        </th>
                                        <th className="px-3 py-2.5">รายการ</th>
                                        <th className="px-3 py-2.5">หมายเลข สป.</th>
                                        <th className="px-3 py-2.5">ความเสี่ยง</th>
                                        <th className="px-3 py-2.5">ที่ตั้ง/แผนก</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {availableAssets.map((asset) => (
                                        <tr key={asset.id} className="border-b border-slate-50 hover:bg-teal-50/30">
                                            <td className="px-3 py-2.5">
                                                <input
                                                    type="checkbox"
                                                    checked={selected.includes(asset.id)}
                                                    onChange={() => toggleSelect(asset.id)}
                                                />
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="font-medium">{asset.name}</div>
                                                {asset.serial_number && (
                                                    <div className="font-mono text-[11px] text-slate-500">SN {asset.serial_number}</div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2.5 font-mono text-xs">{asset.stock_number || '-'}</td>
                                            <td className="px-3 py-2.5 text-xs">{asset.risk_level_label || '-'}</td>
                                            <td className="max-w-[220px] px-3 py-2.5 text-xs text-slate-600">
                                                <div className="line-clamp-2">{asset.issue_location || asset.location || '-'}</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Panel>
            )}

            {tab === 'schedule' && (
                <Panel
                    title="กำหนดวันตรวจ และแจ้งแผนก"
                    description="ตั้งวันทั้งชุด หรือแก้รายแถว แล้วพิมพ์ PDF แจ้งแผนกเตรียมอุปกรณ์"
                    action={
                        <Button asChild className="rounded-xl" disabled={items.length === 0}>
                            <a href={route('env.assets.inspection.cycles.prepare-pdf', cycle.id)} target="_blank" rel="noreferrer">
                                <FileDown className="mr-1 h-4 w-4" />
                                เปิด PDF แจ้งแผนก
                            </a>
                        </Button>
                    }
                >
                    <div className="mb-4 rounded-xl border border-teal-100 bg-teal-50/40 p-3">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-teal-950">ช่วงวันตรวจของวงรอบ</div>
                            {periodDisplay && (
                                <span className="rounded-full border border-teal-200 bg-white px-2.5 py-1 text-xs font-medium text-teal-900">
                                    {periodDisplay}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-end gap-3">
                            <ThaiDatePicker
                                label="วันเริ่มต้น"
                                value={periodStart}
                                onChange={(v) => {
                                    setPeriodStart(v);
                                    if (!periodEnd || (v && periodEnd < v)) setPeriodEnd(v);
                                }}
                                placeholder="เลือกวันเริ่ม"
                                className="min-w-[200px]"
                            />
                            <ThaiDatePicker
                                label="วันสิ้นสุด"
                                value={periodEnd}
                                onChange={setPeriodEnd}
                                placeholder="เลือกวันสิ้นสุด"
                                className="min-w-[200px]"
                            />
                            <Button
                                className="rounded-xl"
                                onClick={savePeriod}
                                disabled={isCancelled || (!periodStart && !periodEnd)}
                            >
                                บันทึกช่วงวันที่
                            </Button>
                        </div>
                    </div>

                    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-sky-100 bg-sky-50/50 p-3">
                        <ThaiDatePicker
                            label="ตั้งวันนัดทั้งชุด"
                            value={bulkDate}
                            onChange={setBulkDate}
                            placeholder="เลือกวันนัด"
                            className="min-w-[220px]"
                        />
                        <label className="flex items-center gap-2 text-xs text-slate-600">
                            <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
                            เขียนทับวันที่มีอยู่แล้ว
                        </label>
                        <Button className="rounded-xl" onClick={saveBulkDates} disabled={!bulkDate || isCancelled}>
                            ใช้กับทั้งชุด
                        </Button>
                        <Button variant="outline" className="rounded-xl" onClick={saveRowDates} disabled={isCancelled}>
                            บันทึกวันรายแถว
                        </Button>
                    </div>

                    {!isCancelled && (
                        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-rose-100 bg-rose-50/50 p-3">
                            <div className="flex items-center gap-2 text-rose-800">
                                <CalendarX2 className="h-4 w-4 shrink-0" />
                                <span className="text-sm font-semibold">ยกเลิกการตรวจในวันที่</span>
                            </div>
                            <ThaiDatePicker
                                label="เลือกวันนัดที่จะยกเลิก"
                                value={cancelDate}
                                onChange={setCancelDate}
                                placeholder="เลือกวันที่"
                                className="min-w-[220px]"
                            />
                            {cancelDate && (
                                <div className="text-xs text-slate-600">
                                    พบ <span className="font-semibold tabular-nums text-rose-700">{countOnCancelDate}</span> รายการ
                                    {cancelDate && (
                                        <span className="ml-1 text-slate-500">
                                            ({formatThaiDateFromIso(cancelDate)})
                                        </span>
                                    )}
                                    {cancelDateResultCounts.hadResults && (
                                        <span className="ml-2 text-rose-700">
                                            (ผ่าน {cancelDateResultCounts.pass} / ไม่ผ่าน {cancelDateResultCounts.fail})
                                        </span>
                                    )}
                                </div>
                            )}
                            <Button
                                variant="outline"
                                className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-100"
                                onClick={() => openDateCancel('clear_date')}
                                disabled={!cancelDate || countOnCancelDate === 0}
                            >
                                ยกเลิกวันนัด
                            </Button>
                            <Button
                                variant="outline"
                                className="rounded-xl border-rose-300 text-rose-800 hover:bg-rose-100"
                                onClick={() => openDateCancel('remove_items')}
                                disabled={!cancelDate || countOnCancelDate === 0}
                            >
                                ยกเลิกและนำออกจากวงรอบ
                            </Button>
                        </div>
                    )}

                    {items.length === 0 ? (
                        <EmptyState text="ยังไม่มีรายการในวงรอบ ไปขั้นตอนลงทะเบียนก่อน" />
                    ) : (
                        <ItemTable
                            items={items}
                            mode="schedule"
                            rowDates={rowDates}
                            setRowDates={setRowDates}
                            rowDept={rowDept}
                            setRowDept={setRowDept}
                            onRemove={isCancelled ? () => undefined : removeItem}
                            readOnly={isCancelled}
                            onSaveDept={
                                isCancelled
                                    ? undefined
                                    : (item) =>
                                          router.put(
                                              route('env.assets.inspection.cycles.items.update', [cycle.id, item.id]),
                                              { department_label: rowDept[item.id] || null },
                                              { preserveScroll: true },
                                          )
                            }
                        />
                    )}
                </Panel>
            )}

            {tab === 'results' && (
                <Panel
                    title="บันทึกผลการตรวจ"
                    description="ผ่าน / ไม่ผ่าน พร้อมหมายเหตุ และพิมพ์รายงานผล PDF"
                    action={
                        <div className="flex flex-wrap gap-2">
                            <div className="flex flex-wrap gap-1">
                                {[{ value: '', label: 'ทั้งหมด' }, ...results].map((r) => (
                                    <button
                                        key={r.value || 'all'}
                                        type="button"
                                        onClick={() =>
                                            router.get(
                                                route('env.assets.inspection.cycles.show', cycle.id),
                                                { tab: 'results', q: q || undefined, result: r.value || undefined },
                                                { preserveState: true, replace: true },
                                            )
                                        }
                                    >
                                        <StatusPill
                                            label={r.label}
                                            className={cn(
                                                r.value ? resultStyle[r.value] : 'border-slate-200 bg-white text-slate-700',
                                                (filters.result || '') === r.value && 'ring-2 ring-teal-400 ring-offset-1',
                                            )}
                                        />
                                    </button>
                                ))}
                            </div>
                            <Button asChild className="rounded-xl" disabled={items.length === 0}>
                                <a href={route('env.assets.inspection.cycles.result-pdf', cycle.id)} target="_blank" rel="noreferrer">
                                    <FileDown className="mr-1 h-4 w-4" />
                                    PDF รายงานผล
                                </a>
                            </Button>
                        </div>
                    }
                >
                    {items.length === 0 ? (
                        <EmptyState text="ยังไม่มีรายการในวงรอบ" />
                    ) : (
                        <ItemTable
                            items={items}
                            mode="results"
                            rowDates={rowDates}
                            setRowDates={setRowDates}
                            rowNotes={rowNotes}
                            setRowNotes={setRowNotes}
                            rowDept={rowDept}
                            setRowDept={setRowDept}
                            onSaveResult={isCancelled ? undefined : saveResult}
                            onRemove={isCancelled ? () => undefined : removeItem}
                            readOnly={isCancelled}
                        />
                    )}
                </Panel>
            )}

            <Panel
                title="ประวัติการยกเลิก"
                description="บันทึกการยกเลิกวงรอบ / ยกเลิกตามวันนัด / นำรายการออก"
                className="mt-4"
                action={
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                        <History className="h-3.5 w-3.5" />
                        {cancellations.length} รายการ
                    </div>
                }
            >
                {cancellations.length === 0 ? (
                    <EmptyState text="ยังไม่มีประวัติการยกเลิก" />
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full min-w-[860px] border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[11px] font-semibold text-slate-500 uppercase">
                                    <th className="px-3 py-2.5">วันเวลา</th>
                                    <th className="px-3 py-2.5">การดำเนินการ</th>
                                    <th className="px-3 py-2.5">วันที่นัด</th>
                                    <th className="px-3 py-2.5 text-right">จำนวน</th>
                                    <th className="px-3 py-2.5 text-right">ผ่าน</th>
                                    <th className="px-3 py-2.5 text-right">ไม่ผ่าน</th>
                                    <th className="px-3 py-2.5">ผู้ทำรายการ</th>
                                    <th className="px-3 py-2.5">เหตุผล</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cancellations.map((log) => (
                                    <tr key={log.id} className="border-b border-slate-50">
                                        <td className="px-3 py-2.5 whitespace-nowrap text-xs text-slate-600">
                                            {log.created_at || '-'}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <div className="font-medium text-slate-800">{log.action_label}</div>
                                            {log.had_results && (
                                                <div className="text-[11px] text-rose-600">
                                                    มีผลตรวจแล้ว{log.force_confirmed ? ' · ยืนยันแล้ว' : ''}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5 text-xs">
                                            {log.scheduled_date_label ||
                                                formatThaiDateFromIso(log.scheduled_date || undefined) ||
                                                '-'}
                                        </td>
                                        <td className="px-3 py-2.5 text-right tabular-nums">{log.items_count}</td>
                                        <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">{log.pass_count}</td>
                                        <td className="px-3 py-2.5 text-right tabular-nums text-rose-700">{log.fail_count}</td>
                                        <td className="px-3 py-2.5 text-xs">{log.canceller_name || '-'}</td>
                                        <td className="max-w-[220px] px-3 py-2.5 text-xs text-slate-500">
                                            <div className="line-clamp-2">{log.reason || '-'}</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>

            <AlertDialog open={cancelCycleOpen} onOpenChange={setCancelCycleOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ยืนยันยกเลิกวงรอบ</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2 text-sm text-slate-600">
                                <p>
                                    จะยกเลิกวงรอบ <span className="font-semibold text-slate-900">{cycle.name}</span>
                                </p>
                                <p>
                                    ในวงรอบมี {cycle.items_count} รายการ · ผ่าน {cycle.pass_count} · ไม่ผ่าน{' '}
                                    {cycle.fail_count} · รอตรวจ {cycle.pending_count}
                                </p>
                                {cycle.pass_count + cycle.fail_count > 0 && (
                                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                                        มีการบันทึกผลตรวจผ่าน/ไม่ผ่านแล้ว หากยกเลิก ข้อมูลผลตรวจจะถูกเก็บไว้ในวงรอบ
                                        แต่จะไม่สามารถแก้ไขหรือบันทึกเพิ่มได้อีก
                                    </p>
                                )}
                                <div>
                                    <label className="mb-1 block text-xs text-slate-600">เหตุผลการยกเลิก (ถ้ามี)</label>
                                    <Textarea
                                        value={cancelCycleReason}
                                        onChange={(e) => setCancelCycleReason(e.target.value)}
                                        className="rounded-xl"
                                        rows={3}
                                        placeholder="เช่น เลื่อนแผน / ผิดรอบ"
                                    />
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">ไม่ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction
                            className="rounded-xl bg-rose-600 hover:bg-rose-700"
                            onClick={(e) => {
                                e.preventDefault();
                                confirmCancelCycle();
                            }}
                        >
                            ยืนยันยกเลิกวงรอบ
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={dateCancelOpen} onOpenChange={setDateCancelOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {dateCancelMode === 'remove_items'
                                ? 'ยืนยันยกเลิกและนำออกจากวงรอบ'
                                : 'ยืนยันยกเลิกวันนัดตรวจ'}
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2 text-sm text-slate-600">
                                <p>
                                    วันที่นัด <span className="font-semibold text-slate-900">{cancelDate}</span> ·{' '}
                                    {countOnCancelDate} รายการ
                                </p>
                                <p>
                                    ผ่าน {cancelDateResultCounts.pass} · ไม่ผ่าน {cancelDateResultCounts.fail} · รอตรวจ{' '}
                                    {cancelDateResultCounts.pending}
                                </p>
                                {cancelDateResultCounts.hadResults && (
                                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                                        พบรายการที่บันทึกผลตรวจผ่าน/ไม่ผ่านแล้วในวันนี้
                                        {dateCancelMode === 'remove_items'
                                            ? ' — การนำออกจะลบรายการและผลตรวจออกจากวงรอบ'
                                            : ' — การยกเลิกวันนัดจะเคลียร์เฉพาะวันนัด ผลตรวจยังคงอยู่'}
                                    </p>
                                )}
                                <div>
                                    <label className="mb-1 block text-xs text-slate-600">เหตุผล (ถ้ามี)</label>
                                    <Textarea
                                        value={dateCancelReason}
                                        onChange={(e) => setDateCancelReason(e.target.value)}
                                        className="rounded-xl"
                                        rows={2}
                                    />
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">ไม่ทำรายการ</AlertDialogCancel>
                        <AlertDialogAction
                            className="rounded-xl bg-rose-600 hover:bg-rose-700"
                            onClick={(e) => {
                                e.preventDefault();
                                confirmDateCancel();
                            }}
                        >
                            ยืนยันยกเลิก
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </QualityPage>
    );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: 'emerald' | 'rose' | 'amber' }) {
    const toneClass =
        tone === 'emerald'
            ? 'border-emerald-100'
            : tone === 'rose'
              ? 'border-rose-100'
              : tone === 'amber'
                ? 'border-amber-100'
                : 'border-slate-200';
    return (
        <div className={cn('rounded-2xl border bg-white px-4 py-3 shadow-sm', toneClass)}>
            <div className="text-xs text-slate-500">{label}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value.toLocaleString('th-TH')}</div>
        </div>
    );
}

function ItemTable({
    items,
    mode,
    rowDates,
    setRowDates,
    rowNotes,
    setRowNotes,
    rowDept,
    setRowDept,
    onSaveResult,
    onSaveDept,
    onRemove,
    readOnly = false,
}: {
    items: Item[];
    mode: 'schedule' | 'results';
    rowDates: Record<number, string>;
    setRowDates: React.Dispatch<React.SetStateAction<Record<number, string>>>;
    rowNotes?: Record<number, string>;
    setRowNotes?: React.Dispatch<React.SetStateAction<Record<number, string>>>;
    rowDept: Record<number, string>;
    setRowDept: React.Dispatch<React.SetStateAction<Record<number, string>>>;
    onSaveResult?: (item: Item, result: string) => void;
    onSaveDept?: (item: Item) => void;
    onRemove: (item: Item) => void;
    readOnly?: boolean;
}) {
    return (
        <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full min-w-[1100px] border-collapse text-sm">
                <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[11px] font-semibold text-slate-500 uppercase">
                        <th className="px-3 py-2.5">รายการ</th>
                        <th className="px-3 py-2.5">หมายเลข สป.</th>
                        <th className="px-3 py-2.5">แผนก/ที่ตั้ง</th>
                        <th className="px-3 py-2.5">วันนัดตรวจ</th>
                        {mode === 'results' && <th className="px-3 py-2.5">ผลตรวจ</th>}
                        {mode === 'results' && <th className="px-3 py-2.5">หมายเหตุ</th>}
                        <th className="px-3 py-2.5"></th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item) => (
                        <tr key={item.id} className="border-b border-slate-50 hover:bg-teal-50/20">
                            <td className="px-3 py-2.5 align-top">
                                <div className="font-medium text-slate-900">{item.asset?.name || '-'}</div>
                                {item.asset?.serial_number && (
                                    <div className="font-mono text-[11px] text-slate-500">SN {item.asset.serial_number}</div>
                                )}
                            </td>
                            <td className="px-3 py-2.5 align-top font-mono text-xs">{item.asset?.stock_number || '-'}</td>
                            <td className="px-3 py-2.5 align-top">
                                <Input
                                    value={rowDept[item.id] ?? ''}
                                    onChange={(e) => setRowDept((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                    onBlur={() => onSaveDept?.(item)}
                                    className="min-w-[160px] rounded-lg text-xs"
                                    disabled={readOnly}
                                />
                            </td>
                            <td className="px-3 py-2.5 align-top">
                                {mode === 'schedule' && !readOnly ? (
                                    <ThaiDatePicker
                                        label="วันนัด"
                                        value={rowDates[item.id] ?? ''}
                                        onChange={(v) => setRowDates((prev) => ({ ...prev, [item.id]: v }))}
                                        placeholder="เลือกวัน"
                                        showQuickSelect={false}
                                        className="min-w-[180px]"
                                    />
                                ) : (
                                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                                        {item.scheduled_date_label ||
                                            formatThaiDateFromIso(rowDates[item.id] || item.scheduled_date || undefined) ||
                                            'ยังไม่กำหนด'}
                                    </span>
                                )}
                            </td>
                            {mode === 'results' && (
                                <td className="px-3 py-2.5 align-top">
                                    <div className="mb-1">
                                        <StatusPill label={item.result_label} className={cn(resultStyle[item.result])} />
                                    </div>
                                    {!readOnly && (
                                        <div className="flex flex-wrap gap-1">
                                            <Button size="sm" variant="outline" className="h-7 rounded-lg px-2 text-xs" onClick={() => onSaveResult?.(item, 'pass')}>
                                                ผ่าน
                                            </Button>
                                            <Button size="sm" variant="outline" className="h-7 rounded-lg px-2 text-xs text-rose-700" onClick={() => onSaveResult?.(item, 'fail')}>
                                                ไม่ผ่าน
                                            </Button>
                                            <Button size="sm" variant="ghost" className="h-7 rounded-lg px-2 text-xs" onClick={() => onSaveResult?.(item, 'pending')}>
                                                รอตรวจ
                                            </Button>
                                        </div>
                                    )}
                                </td>
                            )}
                            {mode === 'results' && setRowNotes && rowNotes && (
                                <td className="px-3 py-2.5 align-top">
                                    <Input
                                        value={rowNotes[item.id] ?? ''}
                                        onChange={(e) => setRowNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                        placeholder="หมายเหตุ"
                                        className="min-w-[160px] rounded-lg text-xs"
                                        disabled={readOnly}
                                    />
                                </td>
                            )}
                            <td className="px-3 py-2.5 align-top text-right">
                                {!readOnly && (
                                    <Button size="sm" variant="ghost" className="rounded-lg text-rose-600" onClick={() => onRemove(item)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
