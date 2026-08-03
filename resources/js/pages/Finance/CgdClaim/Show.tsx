import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Download,
    FileCheck2,
    FileText,
    RefreshCw,
    Search,
} from 'lucide-react';
import { QualityPage, Panel, StatusPill } from '@/components/quality/quality-ui';
import DataHubSubNav, { dataHubBreadcrumbs } from '../DataHub/DataHubSubNav';
import ClaimModuleSubNav from '../DataHub/ClaimModuleSubNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThaiDatePicker } from '@/components/ui/thai-date-picker';
import { cn } from '@/lib/utils';
import DeleteBatchButton from './DeleteBatchButton';

interface Item {
    id: number;
    status: string;
    status_label: string;
    hn: string | null;
    pid: string | null;
    seq_no: string | null;
    patient_name: string | null;
    visit_date: string | null;
    department: string | null;
    pttype: string | null;
    pttype_code: string | null;
    hipdata_code: string | null;
    hosxp_total: number | null;
    hosxp_paid: number | null;
    hosxp_net: number | null;
    payment_adjusted: boolean;
    stm_claim: number | null;
    stm_approved: number | null;
    diff_approved: number;
    shortfall: number;
    rep_no: string | null;
}

interface MonthSummary {
    month: string;
    label: string;
    item_count: number;
    total_hosxp: number;
    total_hosxp_paid: number;
    total_hosxp_net: number;
    total_stm_claim: number;
    total_stm_approved: number;
    total_shortfall: number;
    matched_ok: number;
    matched_short: number;
    matched_over: number;
    only_hosxp: number;
    only_stm: number;
    stm_out_of_range: number;
}

interface Props {
    hosxpReady: boolean;
    batch: {
        id: number;
        filename: string;
        document_no: string | null;
        row_count: number;
        total_claim: number;
        total_approved: number;
        visit_date_min: string | null;
        visit_date_max: string | null;
        status: string;
        created_at: string;
    };
    reconciliation: {
        id: number;
        start_date: string;
        end_date: string;
        hosxp_count: number;
        stm_count: number;
        matched_ok: number;
        matched_short: number;
        matched_over: number;
        only_hosxp: number;
        only_stm: number;
        stm_out_of_range: number;
        total_hosxp: number;
        total_hosxp_paid: number;
        total_hosxp_net: number;
        total_stm_claim: number;
        total_stm_approved: number;
        total_shortfall: number;
        created_at: string;
    } | null;
    monthly: MonthSummary[];
    items: {
        data: Item[];
        links: { url: string | null; label: string; active: boolean }[];
        total?: number;
    } | null;
    filters: { status?: string; q?: string; month?: string };
    statusOptions: Record<string, string>;
}

const money = (n: number | null | undefined) =>
    n == null
        ? '-'
        : new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const statusClass: Record<string, string> = {
    matched_ok: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    matched_short: 'border-rose-200 bg-rose-50 text-rose-700',
    matched_over: 'border-amber-200 bg-amber-50 text-amber-700',
    only_hosxp: 'border-sky-200 bg-sky-50 text-sky-700',
    only_stm: 'border-violet-200 bg-violet-50 text-violet-700',
    stm_out_of_range: 'border-orange-200 bg-orange-50 text-orange-700',
};

function MoneyText({
    value,
    className,
    size = 'md',
}: {
    value: number | null | undefined;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}) {
    const text = money(value);
    return (
        <span
            title={text === '-' ? undefined : text}
            className={cn(
                'block max-w-full tabular-nums tracking-tight',
                size === 'sm' && 'text-[11px] leading-4 whitespace-nowrap',
                size === 'md' && 'text-sm leading-5 break-all sm:text-[15px]',
                size === 'lg' && 'text-base leading-6 break-all font-semibold sm:text-lg',
                className,
            )}
        >
            {text}
        </span>
    );
}

export default function CgdClaimShow({
    hosxpReady,
    batch,
    reconciliation,
    monthly = [],
    items,
    filters,
    statusOptions,
}: Props) {
    const [q, setQ] = useState(filters.q || '');
    const [startDate, setStartDate] = useState(
        reconciliation?.start_date || batch.visit_date_min || '',
    );
    const [endDate, setEndDate] = useState(
        reconciliation?.end_date || batch.visit_date_max || '',
    );
    const fileRange = `${batch.visit_date_min || '-'} → ${batch.visit_date_max || '-'}`;
    const visibleMonths = monthly.filter((m) => m.month !== 'unknown' && m.item_count > 0);
    const selectedMonth = visibleMonths.find((m) => m.month === filters.month) || null;

    const applyFilter = (next?: { status?: string | null; month?: string | null }) => {
        const status =
            next && 'status' in next
                ? next.status || undefined
                : filters.status || undefined;
        const month =
            next && 'month' in next
                ? next.month || undefined
                : filters.month || undefined;

        router.get(
            route('finance.cgd.show', batch.id),
            {
                status: status || undefined,
                month: month || undefined,
                q: q || undefined,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const runReconcile = () => {
        router.post(route('finance.cgd.reconcile', batch.id), {
            start_date: startDate,
            end_date: endDate,
        });
    };

    const exportStatusLabel = filters.status ? statusOptions[filters.status] : null;
    const exportMonthLabel = selectedMonth?.label || null;
    const exportHref = (routeName: string) => {
        const base = route(routeName, batch.id);
        const params = new URLSearchParams();
        if (filters.status) params.set('status', filters.status);
        if (filters.month) params.set('month', filters.month);
        const query = (q || filters.q || '').trim();
        if (query) params.set('q', query);
        const qs = params.toString();

        return qs ? `${base}?${qs}` : base;
    };

    const summaryCards = selectedMonth
        ? [
              { label: 'รายการเดือนนี้', value: selectedMonth.item_count, hint: selectedMonth.label, isCount: true },
              { label: 'HOSxP รวม', value: selectedMonth.total_hosxp, hint: selectedMonth.label },
              { label: 'Payment', value: selectedMonth.total_hosxp_paid, hint: 'หักก่อนเทียบ' },
              { label: 'หลังหัก Payment', value: selectedMonth.total_hosxp_net, hint: 'ใช้เทียบ STM' },
              { label: 'STM พึงรับ', value: selectedMonth.total_stm_approved, hint: 'อนุมัติ' },
              { label: 'ยอดขาด', value: selectedMonth.total_shortfall, hint: 'ต้องติดตาม', danger: true },
          ]
        : reconciliation
          ? [
                {
                    label: 'HOSxP รวม',
                    value: reconciliation.total_hosxp,
                    hint: `${reconciliation.hosxp_count.toLocaleString()} visits`,
                },
                { label: 'Payment', value: reconciliation.total_hosxp_paid, hint: 'หักก่อนเทียบ' },
                { label: 'หลังหัก Payment', value: reconciliation.total_hosxp_net, hint: 'ใช้เทียบ STM' },
                {
                    label: 'STM เรียกเก็บ',
                    value: reconciliation.total_stm_claim,
                    hint: `${reconciliation.stm_count.toLocaleString()} รายการ`,
                },
                { label: 'STM พึงรับ', value: reconciliation.total_stm_approved, hint: 'อนุมัติ' },
                { label: 'ยอดขาด', value: reconciliation.total_shortfall, hint: 'ต้องติดตาม', danger: true },
            ]
          : [];

    return (
        <QualityPage
            tone="emerald"
            icon={FileCheck2}
            badge="Financial Data Hub"
            title={batch.document_no || batch.filename}
            subtitle={`นำเข้า ${batch.created_at} · ${batch.row_count.toLocaleString()} รายการ STM`}
            breadcrumbs={dataHubBreadcrumbs({ title: 'รายละเอียด STM', href: route('finance.cgd.show', batch.id) })}
            headTitle="รายละเอียด STM"
            subNav={<DataHubSubNav active="finance.cgd.dashboard" />}
            actions={
                <div className="flex flex-wrap gap-2">
                    {reconciliation && (
                        <>
                            <Button asChild variant="outline" className="rounded-xl">
                                <a href={exportHref('finance.cgd.export')}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Excel
                                    {exportMonthLabel ? ` · ${exportMonthLabel}` : ''}
                                    {exportStatusLabel ? ` · ${exportStatusLabel}` : ''}
                                </a>
                            </Button>
                            <Button asChild variant="outline" className="rounded-xl">
                                <a href={exportHref('finance.cgd.export-pdf')}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    PDF
                                    {exportMonthLabel ? ` · ${exportMonthLabel}` : ''}
                                    {exportStatusLabel ? ` · ${exportStatusLabel}` : ''}
                                </a>
                            </Button>
                        </>
                    )}
                    <DeleteBatchButton
                        batchId={batch.id}
                        documentNo={batch.document_no}
                        filename={batch.filename}
                        rowCount={batch.row_count}
                        size="default"
                    />
                </div>
            }
        >
            <ClaimModuleSubNav
                dashboardUrl={route('finance.cgd.dashboard')}
                importUrl={route('finance.cgd.import')}
                importLabel="นำเข้า STM"
                active="dashboard"
            />

            {!hosxpReady && (
                <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    HOSxP ยังไม่พร้อมสำหรับการเปรียบเทียบ
                </div>
            )}

            <div className="space-y-4">
                {reconciliation && visibleMonths.length > 0 && (
                    <Panel
                        title="แยกตามเดือน"
                        description="กดเดือนเพื่อดูสรุปและรายการเฉพาะเดือนนั้น · ยอดตามวันเข้ารักษา"
                    >
                        <div className="mb-3 flex flex-wrap gap-2">
                            <button type="button" onClick={() => applyFilter({ month: null })}>
                                <StatusPill
                                    label="ทุกเดือน"
                                    className={cn(
                                        'border-slate-200 bg-white text-slate-700',
                                        !filters.month && 'ring-2 ring-offset-1 ring-emerald-400',
                                    )}
                                />
                            </button>
                            {visibleMonths.map((m) => (
                                <button key={m.month} type="button" onClick={() => applyFilter({ month: m.month })}>
                                    <StatusPill
                                        label={`${m.label} · ${m.item_count.toLocaleString()} รายการ`}
                                        className={cn(
                                            'border-emerald-200 bg-emerald-50 text-emerald-800',
                                            filters.month === m.month && 'ring-2 ring-offset-1 ring-emerald-400',
                                        )}
                                    />
                                </button>
                            ))}
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-slate-100">
                            <table className="w-full min-w-[900px] text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                        <th className="px-3 py-2">เดือน</th>
                                        <th className="px-3 py-2 text-right">รายการ</th>
                                        <th className="px-3 py-2 text-right">HOSxP</th>
                                        <th className="px-3 py-2 text-right">Payment</th>
                                        <th className="px-3 py-2 text-right">หลังหัก</th>
                                        <th className="px-3 py-2 text-right">พึงรับ</th>
                                        <th className="px-3 py-2 text-right">ขาด</th>
                                        <th className="px-3 py-2 text-right">ขาดเงิน</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleMonths.map((m) => (
                                        <tr
                                            key={m.month}
                                            className={cn(
                                                'cursor-pointer border-b border-slate-50 hover:bg-emerald-50/40',
                                                filters.month === m.month && 'bg-emerald-50/70',
                                            )}
                                            onClick={() => applyFilter({ month: m.month })}
                                        >
                                            <td className="px-3 py-2.5 font-semibold text-slate-800">{m.label}</td>
                                            <td className="px-3 py-2.5 text-right tabular-nums">{m.item_count.toLocaleString()}</td>
                                            <td className="px-3 py-2.5 text-right">
                                                <MoneyText value={m.total_hosxp} size="sm" />
                                            </td>
                                            <td className="px-3 py-2.5 text-right">
                                                <MoneyText value={m.total_hosxp_paid} size="sm" className="text-amber-700" />
                                            </td>
                                            <td className="px-3 py-2.5 text-right">
                                                <MoneyText value={m.total_hosxp_net} size="sm" className="font-medium" />
                                            </td>
                                            <td className="px-3 py-2.5 text-right">
                                                <MoneyText value={m.total_stm_approved} size="sm" />
                                            </td>
                                            <td className="px-3 py-2.5 text-right">
                                                <MoneyText value={m.total_shortfall} size="sm" className="font-semibold text-rose-600" />
                                            </td>
                                            <td className="px-3 py-2.5 text-right tabular-nums text-rose-600">
                                                {m.matched_short.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Panel>
                )}

                {reconciliation && (
                    <Panel
                        title={selectedMonth ? `สรุปเดือน ${selectedMonth.label}` : 'สรุปผลการตรวจสอบ'}
                        description={
                            selectedMonth
                                ? 'สรุปเฉพาะเดือนที่เลือก · กด “ทุกเดือน” เพื่อดูภาพรวม'
                                : 'ยอดเทียบ = (HOSxP รวม − Payment) แล้วเทียบกับ STM พึงรับ'
                        }
                    >
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                            {summaryCards.map((card) => (
                                <div
                                    key={card.label}
                                    className={cn(
                                        'min-w-0 overflow-hidden rounded-2xl border px-3 py-3',
                                        card.danger ? 'border-rose-100 bg-rose-50/70' : 'border-slate-100 bg-slate-50/70',
                                    )}
                                >
                                    <div className="truncate text-[11px] font-medium text-slate-500">{card.label}</div>
                                    {'isCount' in card && card.isCount ? (
                                        <div className={cn('mt-1 text-base font-semibold tabular-nums sm:text-lg', card.danger ? 'text-rose-700' : 'text-slate-900')}>
                                            {Number(card.value).toLocaleString('th-TH')}
                                        </div>
                                    ) : (
                                        <MoneyText
                                            value={card.value as number}
                                            size="lg"
                                            className={cn('mt-1', card.danger ? 'text-rose-700' : 'text-slate-900')}
                                        />
                                    )}
                                    <div className="mt-1 truncate text-[11px] text-slate-400">{card.hint}</div>
                                </div>
                            ))}
                        </div>
                    </Panel>
                )}

                <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
                    <Panel title="สถานะรายการ" description="กดเพื่อกรองตารางด้านล่าง">
                        {reconciliation ? (
                            <div className="flex flex-wrap gap-2">
                                {Object.entries({
                                    matched_ok: selectedMonth?.matched_ok ?? reconciliation.matched_ok,
                                    matched_short: selectedMonth?.matched_short ?? reconciliation.matched_short,
                                    matched_over: selectedMonth?.matched_over ?? reconciliation.matched_over,
                                    only_hosxp: selectedMonth?.only_hosxp ?? reconciliation.only_hosxp,
                                    only_stm: selectedMonth?.only_stm ?? reconciliation.only_stm,
                                    stm_out_of_range: selectedMonth?.stm_out_of_range ?? reconciliation.stm_out_of_range,
                                }).map(([key, count]) => (
                                    <button key={key} type="button" onClick={() => applyFilter({ status: key })}>
                                        <StatusPill
                                            label={`${statusOptions[key]} ${count}`}
                                            className={cn(statusClass[key], filters.status === key && 'ring-2 ring-offset-1 ring-emerald-400')}
                                        />
                                    </button>
                                ))}
                                {filters.status && (
                                    <button type="button" onClick={() => applyFilter({ status: null })}>
                                        <StatusPill label="ล้างสถานะ" className="border-slate-200 bg-white text-slate-600" />
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="text-sm text-slate-500">ยังไม่มีการเปรียบเทียบ — กดปุ่มด้านขวาเพื่อรัน</div>
                        )}
                    </Panel>

                    <Panel title="รันเปรียบเทียบใหม่" description="เลือกช่วงวันที่ดึง Visit จาก HOSxP">
                        <div className="space-y-3">
                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-3 text-sm">
                                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">วันเข้ารักษาในไฟล์ STM</div>
                                <div className="mt-1 font-semibold text-emerald-900">{fileRange}</div>
                                <div className="mt-1 text-xs text-emerald-800/80">
                                    STM นอกช่วง HOSxP ที่เลือกจะยังแสดง (สถานะ “STM นอกช่วงวันที่ HOSxP”)
                                </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="min-w-0">
                                    <Label className="text-xs text-slate-500">วันเริ่มต้น HOSxP</Label>
                                    <ThaiDatePicker
                                        value={startDate}
                                        onChange={setStartDate}
                                        placeholder="เลือกวันเริ่มต้น"
                                        className="mt-1 w-full max-w-none"
                                    />
                                </div>
                                <div className="min-w-0">
                                    <Label className="text-xs text-slate-500">วันสิ้นสุด HOSxP</Label>
                                    <ThaiDatePicker
                                        value={endDate}
                                        onChange={setEndDate}
                                        placeholder="เลือกวันสิ้นสุด"
                                        className="mt-1 w-full max-w-none"
                                    />
                                </div>
                            </div>
                            {reconciliation && (
                                <div className="text-xs text-slate-500">
                                    รอบล่าสุดใช้ช่วง {reconciliation.start_date} → {reconciliation.end_date}
                                </div>
                            )}
                            <Button
                                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700"
                                disabled={!hosxpReady || !startDate || !endDate}
                                onClick={runReconcile}
                            >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                เปรียบเทียบกับ HOSxP
                            </Button>
                            <Button asChild variant="outline" className="w-full rounded-xl">
                                <Link href={route('finance.cgd.import')}>กลับหน้านำเข้า</Link>
                            </Button>
                            <DeleteBatchButton
                                batchId={batch.id}
                                documentNo={batch.document_no}
                                filename={batch.filename}
                                rowCount={batch.row_count}
                                size="default"
                                className="w-full"
                            />
                        </div>
                    </Panel>
                </div>
            </div>

            <div className="mt-6">
                <Panel
                    title="รายการเปรียบเทียบ"
                    description="★P = หัก Payment ก่อนเทียบ · ค้นหาด้วย HN / PID / SEQ / ชื่อ"
                >
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                className="pl-9"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') applyFilter();
                                }}
                                placeholder="ค้นหา HN, PID, SEQ, ชื่อ..."
                            />
                        </div>
                        <Button variant="outline" className="rounded-xl" onClick={() => applyFilter()}>
                            ค้นหา
                        </Button>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full min-w-[1100px] border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                    <th className="px-2 py-2.5 whitespace-nowrap">สถานะ</th>
                                    <th className="px-2 py-2.5 whitespace-nowrap">HN</th>
                                    <th className="px-2 py-2.5 whitespace-nowrap">PID</th>
                                    <th className="px-2 py-2.5 whitespace-nowrap">SEQ</th>
                                    <th className="min-w-[120px] px-2 py-2.5">ชื่อ</th>
                                    <th className="min-w-[110px] px-2 py-2.5">สิทธิ</th>
                                    <th className="px-2 py-2.5 whitespace-nowrap">วันที่</th>
                                    <th className="px-2 py-2.5 text-right whitespace-nowrap">HOSxP</th>
                                    <th className="px-2 py-2.5 text-right whitespace-nowrap">Payment</th>
                                    <th className="px-2 py-2.5 text-right whitespace-nowrap">หลังหัก</th>
                                    <th className="px-2 py-2.5 text-right whitespace-nowrap">เรียกเก็บ</th>
                                    <th className="px-2 py-2.5 text-right whitespace-nowrap">พึงรับ</th>
                                    <th className="px-2 py-2.5 text-right whitespace-nowrap">ขาด</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(items?.data || []).map((item) => (
                                    <tr
                                        key={item.id}
                                        className={cn(
                                            'border-b border-slate-50 hover:bg-emerald-50/30',
                                            item.payment_adjusted && 'bg-amber-50/40',
                                        )}
                                    >
                                        <td className="px-2 py-2 align-top">
                                            <div className="flex max-w-[140px] flex-col gap-1">
                                                <StatusPill label={item.status_label} className={statusClass[item.status]} />
                                                {item.payment_adjusted && (
                                                    <StatusPill
                                                        label="★P"
                                                        className="w-fit border-amber-300 bg-amber-100 text-amber-800"
                                                    />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-2 py-2 align-top font-medium whitespace-nowrap">{item.hn}</td>
                                        <td className="px-2 py-2 align-top text-xs whitespace-nowrap">{item.pid}</td>
                                        <td className="px-2 py-2 align-top font-mono text-[11px] whitespace-nowrap">{item.seq_no}</td>
                                        <td className="max-w-[160px] px-2 py-2 align-top">
                                            {item.patient_name ? (
                                                <span className="line-clamp-2">{item.patient_name}</span>
                                            ) : (
                                                <span className="text-slate-400">ไม่พบชื่อ</span>
                                            )}
                                        </td>
                                        <td className="max-w-[140px] px-2 py-2 align-top">
                                            {item.pttype ? (
                                                <div>
                                                    <div className="line-clamp-2 text-xs font-medium text-slate-800">{item.pttype}</div>
                                                    {(item.pttype_code || item.hipdata_code) && (
                                                        <div className="text-[10px] text-slate-400">
                                                            {[item.pttype_code, item.hipdata_code].filter(Boolean).join(' · ')}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-2 py-2 align-top text-xs whitespace-nowrap">{item.visit_date}</td>
                                        <td className="px-2 py-2 align-top text-right">
                                            <MoneyText value={item.hosxp_total} size="sm" className="text-slate-700" />
                                        </td>
                                        <td className="px-2 py-2 align-top text-right">
                                            <MoneyText
                                                value={item.hosxp_paid}
                                                size="sm"
                                                className={item.payment_adjusted ? 'font-semibold text-amber-700' : 'text-slate-600'}
                                            />
                                        </td>
                                        <td className="px-2 py-2 align-top text-right">
                                            <MoneyText value={item.hosxp_net} size="sm" className="font-medium text-slate-800" />
                                        </td>
                                        <td className="px-2 py-2 align-top text-right">
                                            <MoneyText value={item.stm_claim} size="sm" className="text-slate-700" />
                                        </td>
                                        <td className="px-2 py-2 align-top text-right">
                                            <MoneyText value={item.stm_approved} size="sm" className="text-slate-700" />
                                        </td>
                                        <td className="px-2 py-2 align-top text-right">
                                            <MoneyText value={item.shortfall} size="sm" className="font-semibold text-rose-600" />
                                        </td>
                                    </tr>
                                ))}
                                {(!items || items.data.length === 0) && (
                                    <tr>
                                        <td colSpan={13} className="px-3 py-10 text-center text-slate-400">
                                            ไม่พบรายการ
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {items?.links && items.links.length > 3 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {items.links.map((link, idx) => (
                                <Button
                                    key={`${link.label}-${idx}`}
                                    size="sm"
                                    variant={link.active ? 'default' : 'outline'}
                                    className="rounded-lg"
                                    disabled={!link.url}
                                    onClick={() => link.url && router.get(link.url, {}, { preserveScroll: true })}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    )}
                </Panel>
            </div>
        </QualityPage>
    );
}
