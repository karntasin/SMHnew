import React, { useMemo, useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import { Ban, CalendarRange, Plus, Search } from 'lucide-react';
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
    risk_level_label?: string | null;
    issue_location?: string | null;
    location?: string | null;
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
    creator_name?: string | null;
    items_count: number;
    pending_count: number;
    pass_count: number;
    fail_count: number;
    created_at?: string | null;
    is_cancelled?: boolean;
    cancelled_at?: string | null;
    cancelled_by_name?: string | null;
    cancel_reason?: string | null;
}

interface Props {
    cycles: Cycle[];
    catalogTotal: number;
    availableAssets: AssetBrief[];
    availableTotal: number;
    filters?: { q?: string | null };
    statuses: { value: string; label: string }[];
}

const statusStyle: Record<string, string> = {
    draft: 'border-slate-200 bg-slate-50 text-slate-700',
    scheduled: 'border-sky-200 bg-sky-50 text-sky-800',
    in_progress: 'border-amber-200 bg-amber-50 text-amber-800',
    completed: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    cancelled: 'border-rose-200 bg-rose-50 text-rose-800',
};

export default function Cycles({
    cycles,
    catalogTotal,
    availableAssets,
    availableTotal,
    filters = {},
}: Props) {
    const [showForm, setShowForm] = useState(false);
    const [q, setQ] = useState(filters.q || '');
    const [selected, setSelected] = useState<number[]>([]);
    const [cancelTarget, setCancelTarget] = useState<Cycle | null>(null);
    const [cancelReason, setCancelReason] = useState('');

    const form = useForm({
        name: '',
        fiscal_year: '',
        period_start: '',
        period_end: '',
        notes: '',
        select_all: false as boolean,
        asset_ids: [] as number[],
    });

    const allAvailableIds = useMemo(() => availableAssets.map((a) => a.id), [availableAssets]);
    const allSelected = selected.length > 0 && selected.length === allAvailableIds.length;
    const openCycles = cycles.filter((c) => c.status !== 'completed' && c.status !== 'cancelled').length;

    const applySearch = () => {
        router.get(
            route('env.assets.inspection.cycles'),
            { q: q || undefined },
            { preserveState: true, replace: true },
        );
    };

    const toggleSelect = (id: number) => {
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const toggleSelectAll = () => {
        setSelected(allSelected ? [] : allAvailableIds);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.transform((data) => ({
            name: data.name,
            fiscal_year: data.fiscal_year || null,
            period_start: data.period_start || null,
            period_end: data.period_end || data.period_start || null,
            notes: data.notes || null,
            select_all: data.select_all,
            asset_ids: data.select_all ? [] : selected,
            scheduled_date: null,
        }));
        form.post(route('env.assets.inspection.cycles.store'), {
            onSuccess: () => {
                form.reset();
                setSelected([]);
                setShowForm(false);
            },
        });
    };

    const confirmCancel = () => {
        if (!cancelTarget) return;
        const hadResults = cancelTarget.pass_count + cancelTarget.fail_count > 0;
        router.post(
            route('env.assets.inspection.cycles.cancel', cancelTarget.id),
            {
                reason: cancelReason || null,
                confirm_force: hadResults,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setCancelTarget(null);
                    setCancelReason('');
                },
            },
        );
    };

    return (
        <QualityPage
            tone="teal"
            icon={CalendarRange}
            badge="ศูนย์พัฒนาคุณภาพ · ENV"
            title="วงรอบการตรวจสภาพ"
            subtitle="สร้างวงรอบ เลือกลงทะเบียนครุภัณฑ์ กำหนดวันตรวจ และบันทึกผล"
            breadcrumbs={[
                { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
                { title: 'ENV', href: route('env.index') },
                { title: 'ทะเบียนครุภัณฑ์', href: route('env.assets.index') },
                { title: 'การสอบเทียบ', href: route('env.assets.inspection') },
                { title: 'วงรอบการสอบเทียบ', href: route('env.assets.inspection.cycles') },
            ]}
            headTitle="วงรอบการตรวจสภาพ ENV"
            subNav={<EnvSubNav active="env.assets.index" />}
        >
            <AssetsSubNav active="inspection" />
            <InspectionSubNav active="cycles" />

            <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-teal-100 bg-white px-4 py-3 shadow-sm">
                    <div className="text-xs text-slate-500">วงรอบทั้งหมด</div>
                    <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{cycles.length}</div>
                </div>
                <div className="rounded-2xl border border-violet-100 bg-white px-4 py-3 shadow-sm">
                    <div className="text-xs text-slate-500">รายการในแคตตาล็อกที่ต้องสอบเทียบ</div>
                    <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                        {catalogTotal.toLocaleString('th-TH')}
                    </div>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-white px-4 py-3 shadow-sm">
                    <div className="text-xs text-slate-500">วงรอบที่ยังไม่เสร็จ</div>
                    <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{openCycles}</div>
                </div>
            </div>

            <Panel
                title="วงรอบการตรวจ"
                description="สร้างวงรอบใหม่แล้วเลือกลงทะเบียนครุภัณฑ์เข้าวงรอบได้ทันที"
                action={
                    <Button className="rounded-xl" onClick={() => setShowForm((v) => !v)}>
                        <Plus className="mr-1 h-4 w-4" />
                        สร้างวงรอบ
                    </Button>
                }
                className="mb-4"
            >
                {showForm && (
                    <form onSubmit={submit} className="mb-4 space-y-4 rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-xs font-medium text-slate-600">ชื่อวงรอบ *</label>
                                <Input
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    placeholder="เช่น ตรวจประจำปี 2569"
                                    className="rounded-xl bg-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">ปีงบประมาณ</label>
                                <Input
                                    value={form.data.fiscal_year}
                                    onChange={(e) => form.setData('fiscal_year', e.target.value)}
                                    placeholder="2569"
                                    className="rounded-xl bg-white"
                                />
                            </div>
                            <div className="sm:col-span-2 rounded-xl border border-teal-100 bg-white/90 p-3">
                                <div className="mb-2 text-xs font-semibold text-teal-900">ช่วงวันตรวจของวงรอบ</div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <ThaiDatePicker
                                        label="วันเริ่มต้น"
                                        value={form.data.period_start}
                                        onChange={(v) => {
                                            form.setData('period_start', v);
                                            if (!form.data.period_end || (form.data.period_end && v && form.data.period_end < v)) {
                                                form.setData('period_end', v);
                                            }
                                        }}
                                        placeholder="เลือกวันเริ่ม"
                                        className="w-full"
                                    />
                                    <ThaiDatePicker
                                        label="วันสิ้นสุด"
                                        value={form.data.period_end}
                                        onChange={(v) => form.setData('period_end', v)}
                                        placeholder="เลือกวันสิ้นสุด"
                                        className="w-full"
                                    />
                                </div>
                                {(form.data.period_start || form.data.period_end) && (
                                    <div className="mt-2 inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-900">
                                        {formatThaiDateRangeFromIso(form.data.period_start, form.data.period_end) || '—'}
                                    </div>
                                )}
                            </div>
                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-xs font-medium text-slate-600">หมายเหตุ</label>
                                <Input
                                    value={form.data.notes}
                                    onChange={(e) => form.setData('notes', e.target.value)}
                                    placeholder="รายละเอียดเพิ่มเติม"
                                    className="rounded-xl bg-white"
                                />
                            </div>
                        </div>

                        <div className="rounded-xl border border-teal-100 bg-white/80 p-3">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <div className="text-sm font-semibold text-slate-800">ลงทะเบียนครุภัณฑ์เข้าวงรอบ</div>
                                    <div className="text-xs text-slate-500">
                                        เลือกได้ทันทีตอนสร้าง · ทั้งหมด {availableTotal.toLocaleString('th-TH')} รายการ · แสดงสูงสุด 500
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Input
                                        value={q}
                                        onChange={(e) => setQ(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applySearch())}
                                        placeholder="ค้นหาครุภัณฑ์"
                                        className="min-w-[180px] rounded-xl"
                                    />
                                    <Button type="button" variant="outline" className="rounded-xl" onClick={applySearch}>
                                        <Search className="mr-1 h-4 w-4" />
                                        ค้นหา
                                    </Button>
                                </div>
                            </div>

                            <div className="mb-3 flex flex-wrap items-end gap-3 rounded-xl border border-teal-50 bg-teal-50/50 p-3">
                                <label className="flex items-center gap-2 text-xs text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={form.data.select_all}
                                        onChange={(e) => {
                                            form.setData('select_all', e.target.checked);
                                            if (e.target.checked) setSelected([]);
                                        }}
                                    />
                                    ลงทะเบียนทั้งหมด {availableTotal.toLocaleString('th-TH')} รายการ
                                </label>
                                {!form.data.select_all && (
                                    <div className="text-xs text-slate-600">
                                        เลือกแล้ว{' '}
                                        <span className="font-semibold tabular-nums text-teal-800">{selected.length}</span> รายการ
                                    </div>
                                )}
                            </div>

                            {form.data.select_all ? (
                                <div className="rounded-xl border border-teal-100 bg-teal-50/60 px-3 py-3 text-sm text-teal-900">
                                    จะลงทะเบียนครุภัณฑ์ที่ต้องสอบเทียบทั้งหมด {availableTotal.toLocaleString('th-TH')} รายการเข้าวงรอบนี้
                                </div>
                            ) : availableAssets.length === 0 ? (
                                <EmptyState text="ไม่พบครุภัณฑ์ในแคตตาล็อกที่ต้องสอบเทียบ" />
                            ) : (
                                <div className="max-h-80 overflow-auto rounded-xl border border-slate-100">
                                    <table className="w-full min-w-[760px] border-collapse text-sm">
                                        <thead className="sticky top-0 bg-slate-50">
                                            <tr className="border-b border-slate-100 text-left text-[11px] font-semibold text-slate-500 uppercase">
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
                                                            <div className="font-mono text-[11px] text-slate-500">
                                                                SN {asset.serial_number}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2.5 font-mono text-xs">{asset.stock_number || '-'}</td>
                                                    <td className="px-3 py-2.5 text-xs">{asset.risk_level_label || '-'}</td>
                                                    <td className="max-w-[220px] px-3 py-2.5 text-xs text-slate-600">
                                                        <div className="line-clamp-2">
                                                            {asset.issue_location || asset.location || '-'}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button type="submit" className="rounded-xl" disabled={form.processing}>
                                สร้างวงรอบ
                                {!form.data.select_all && selected.length > 0
                                    ? ` + ลงทะเบียน ${selected.length} รายการ`
                                    : form.data.select_all
                                      ? ` + ลงทะเบียนทั้งหมด`
                                      : ''}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="rounded-xl"
                                onClick={() => {
                                    setShowForm(false);
                                    setSelected([]);
                                    form.setData('select_all', false);
                                }}
                            >
                                ปิดฟอร์ม
                            </Button>
                        </div>
                    </form>
                )}

                {cycles.length === 0 ? (
                    <EmptyState text="ยังไม่มีวงรอบการตรวจ กดสร้างวงรอบเพื่อเริ่มต้น" />
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full min-w-[980px] border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                    <th className="px-3 py-2.5">วงรอบ</th>
                                    <th className="px-3 py-2.5">สถานะ</th>
                                    <th className="px-3 py-2.5 text-right">รายการ</th>
                                    <th className="px-3 py-2.5 text-right">ผ่าน</th>
                                    <th className="px-3 py-2.5 text-right">ไม่ผ่าน</th>
                                    <th className="px-3 py-2.5 text-right">รอตรวจ</th>
                                    <th className="px-3 py-2.5">ช่วงวันตรวจ</th>
                                    <th className="px-3 py-2.5"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {cycles.map((cycle) => {
                                    const cancelled = !!cycle.is_cancelled || cycle.status === 'cancelled';
                                    return (
                                        <tr key={cycle.id} className="border-b border-slate-50 hover:bg-violet-50/30">
                                            <td className="px-3 py-2.5 align-top">
                                                <div className="font-medium text-slate-900">{cycle.name}</div>
                                                <div className="mt-0.5 text-xs text-slate-500">
                                                    {cycle.fiscal_year ? `ปีงบ ${cycle.fiscal_year} · ` : ''}
                                                    {cycle.created_at || ''}
                                                    {cycle.creator_name ? ` · ${cycle.creator_name}` : ''}
                                                </div>
                                                {cancelled && cycle.cancel_reason && (
                                                    <div className="mt-1 text-[11px] text-rose-600">
                                                        เหตุผลยกเลิก: {cycle.cancel_reason}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2.5 align-top">
                                                <StatusPill
                                                    label={cycle.status_label}
                                                    className={cn(statusStyle[cycle.status] || statusStyle.draft)}
                                                />
                                            </td>
                                            <td className="px-3 py-2.5 align-top text-right tabular-nums">{cycle.items_count}</td>
                                            <td className="px-3 py-2.5 align-top text-right tabular-nums text-emerald-700">
                                                {cycle.pass_count}
                                            </td>
                                            <td className="px-3 py-2.5 align-top text-right tabular-nums text-rose-700">
                                                {cycle.fail_count}
                                            </td>
                                            <td className="px-3 py-2.5 align-top text-right tabular-nums text-amber-700">
                                                {cycle.pending_count}
                                            </td>
                                            <td className="px-3 py-2.5 align-top">
                                                {cycle.period_label ||
                                                formatThaiDateRangeFromIso(cycle.period_start, cycle.period_end) ||
                                                formatThaiDateFromIso(cycle.default_scheduled_date || undefined) ? (
                                                    <span className="inline-flex max-w-[220px] items-center rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-medium leading-snug text-teal-900">
                                                        {cycle.period_label ||
                                                            formatThaiDateRangeFromIso(cycle.period_start, cycle.period_end) ||
                                                            formatThaiDateFromIso(cycle.default_scheduled_date || undefined)}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400">ยังไม่กำหนด</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2.5 align-top text-right">
                                                <div className="flex flex-wrap justify-end gap-1.5">
                                                    <Button asChild size="sm" className="rounded-xl">
                                                        <Link href={route('env.assets.inspection.cycles.show', cycle.id)}>
                                                            เปิดวงรอบ
                                                        </Link>
                                                    </Button>
                                                    {!cancelled && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50"
                                                            onClick={() => {
                                                                setCancelReason('');
                                                                setCancelTarget(cycle);
                                                            }}
                                                        >
                                                            <Ban className="mr-1 h-3.5 w-3.5" />
                                                            ยกเลิก
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>

            <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ยืนยันยกเลิกวงรอบ</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2 text-sm text-slate-600">
                                {cancelTarget && (
                                    <>
                                        <p>
                                            จะยกเลิกวงรอบ{' '}
                                            <span className="font-semibold text-slate-900">{cancelTarget.name}</span>
                                        </p>
                                        <p>
                                            ในวงรอบมี {cancelTarget.items_count} รายการ · ผ่าน {cancelTarget.pass_count} ·
                                            ไม่ผ่าน {cancelTarget.fail_count} · รอตรวจ {cancelTarget.pending_count}
                                        </p>
                                        {cancelTarget.pass_count + cancelTarget.fail_count > 0 && (
                                            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                                                มีการบันทึกผลตรวจผ่าน/ไม่ผ่านแล้ว หากยกเลิก จะไม่สามารถแก้ไขหรือบันทึกเพิ่มได้อีก
                                            </p>
                                        )}
                                        <div>
                                            <label className="mb-1 block text-xs text-slate-600">เหตุผลการยกเลิก (ถ้ามี)</label>
                                            <Textarea
                                                value={cancelReason}
                                                onChange={(e) => setCancelReason(e.target.value)}
                                                className="rounded-xl"
                                                rows={3}
                                                placeholder="เช่น เลื่อนแผน / สร้างผิดรอบ"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">ไม่ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction
                            className="rounded-xl bg-rose-600 hover:bg-rose-700"
                            onClick={(e) => {
                                e.preventDefault();
                                confirmCancel();
                            }}
                        >
                            ยืนยันยกเลิกวงรอบ
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </QualityPage>
    );
}
