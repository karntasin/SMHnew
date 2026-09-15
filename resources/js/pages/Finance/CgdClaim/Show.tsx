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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import DeleteBatchButton from './DeleteBatchButton';
import { claimRoute, resolveClaimModule, type ClaimModuleMeta } from './claimModule';

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
    error_code: string | null;
    fund_codes: string | null;
    tran_id: string | null;
    remark: string | null;
}

interface ZeroFundRow {
    id: number;
    row_no: number | null;
    tran_id: string | null;
    hn: string | null;
    pid: string | null;
    patient_name: string | null;
    visit_date: string | null;
    fund_code: string | null;
    claim_code: string | null;
    tmt: string | null;
    expense_category: string | null;
    qty_requested: number | null;
    qty_paid: number | null;
    amount_paid: number;
    remark: string | null;
}

interface ErrorOption {
    value: string;
    label: string;
    count: number;
}

interface ErrorMeaning {
    description: string;
    solution: string;
}

interface MonthSummary {
    month: string;
    label: string;
    item_count: number;
    total_hosxp: number;
    total_hosxp_paid: number;
    total_hosxp_net: number;
    total_hosxp_unmatched?: number;
    total_hosxp_unmatched_paid?: number;
    total_hosxp_unmatched_net?: number;
    total_stm_claim: number;
    total_stm_approved: number;
    total_stm_treat?: number;
    total_shortfall: number;
    matched_ok: number;
    matched_short: number;
    matched_over: number;
    only_hosxp: number;
    only_stm: number;
    stm_out_of_range: number;
}

interface FilterTotals {
    item_count: number;
    total_hosxp: number;
    total_hosxp_paid: number;
    total_hosxp_net: number;
    total_hosxp_unmatched?: number;
    total_hosxp_unmatched_paid?: number;
    total_hosxp_unmatched_net?: number;
    only_hosxp_count?: number;
    total_claim: number;
    total_approved: number;
    total_treat?: number;
    total_shortfall: number;
    total_over: number;
    total_diff: number;
}

interface Props {
    hosxpReady: boolean;
    batch: {
        id: number;
        filename: string;
        document_no: string | null;
        source_format?: string;
        row_count: number;
        error_row_count?: number;
        zero_fund_count?: number;
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
        matched_hosxp_count?: number;
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
        total_hosxp_unmatched?: number;
        total_hosxp_unmatched_paid?: number;
        total_hosxp_unmatched_net?: number;
        total_stm_claim: number;
        total_stm_approved: number;
        total_stm_treat?: number;
        total_shortfall: number;
        created_at: string;
    } | null;
    monthly: MonthSummary[];
    items: {
        data: Item[];
        links: { url: string | null; label: string; active: boolean }[];
        total?: number;
        from?: number | null;
        to?: number | null;
        current_page?: number;
        last_page?: number;
        per_page?: number;
    } | null;
    filterTotals?: FilterTotals | null;
    statusCounts?: Record<string, number> | null;
    zeroFundRows?: ZeroFundRow[];
    errorOptions?: ErrorOption[];
    errorCodeMeanings?: Record<string, ErrorMeaning>;
    errorCodeSource?: string;
    filters: {
        status?: string;
        q?: string;
        month?: string;
        error_code?: string;
        per_page?: number | string;
        page?: number;
    };
    statusOptions: Record<string, string>;
    module?: ClaimModuleMeta;
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

function ErrorCodeBadge({
    code,
    meaning,
    sourceUrl,
}: {
    code: string;
    meaning?: ErrorMeaning;
    sourceUrl: string;
}) {
    const badge = (
        <StatusPill label={code} className="cursor-help border-rose-200 bg-rose-50 text-rose-800" />
    );

    if (!meaning) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="inline-flex">{badge}</span>
                </TooltipTrigger>
                <TooltipContent
                    side="top"
                    className="max-w-sm border-slate-200 bg-white p-3 text-xs text-slate-900 shadow-lg"
                >
                    <div className="font-semibold text-rose-700">Error {code}</div>
                    <div className="mt-1 text-slate-600">ยังไม่มีคำอธิบายในฐานข้อมูลอ้างอิง</div>
                    <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 block font-medium text-emerald-700 underline"
                    >
                        ดูที่ uckkpho.com
                    </a>
                </TooltipContent>
            </Tooltip>
        );
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className="inline-flex">{badge}</span>
            </TooltipTrigger>
            <TooltipContent
                side="top"
                className="max-w-md space-y-2 border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-900 shadow-lg"
            >
                <div className="font-semibold tracking-wide text-rose-700">Error {code}</div>
                <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">รายละเอียด</div>
                    <div className="mt-0.5 font-medium text-slate-800">{meaning.description}</div>
                </div>
                {meaning.solution && (
                    <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            วิธีปฏิบัติ / แนวทางแก้ไข
                        </div>
                        <div className="mt-0.5 text-slate-700">{meaning.solution}</div>
                    </div>
                )}
                <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block font-medium text-emerald-700 underline"
                >
                    แหล่งอ้างอิง UC@KKPHO
                </a>
            </TooltipContent>
        </Tooltip>
    );
}

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
    filterTotals = null,
    statusCounts = null,
    zeroFundRows = [],
    errorOptions = [],
    errorCodeMeanings = {},
    errorCodeSource = 'https://www.uckkpho.com/uc/1313/',
    filters,
    statusOptions,
    module,
}: Props) {
    const mod = resolveClaimModule(module);
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
    const isEclaim = batch.source_format === 'eclaim';
    const fileLabel = isEclaim ? 'e-Claim' : 'REP';
    const approvedLabel = isEclaim ? 'ชดเชยสุทธิ' : 'พึงรับ';
    const shortfallHint = `เรียกเก็บ − ${approvedLabel}`;
    const hasActiveFilter = Boolean(
        filters.status || filters.month || filters.error_code || filters.q,
    );
    const chipCounts = statusCounts || {
        matched_ok: selectedMonth?.matched_ok ?? reconciliation?.matched_ok ?? 0,
        matched_short: selectedMonth?.matched_short ?? reconciliation?.matched_short ?? 0,
        matched_over: selectedMonth?.matched_over ?? reconciliation?.matched_over ?? 0,
        only_hosxp: selectedMonth?.only_hosxp ?? reconciliation?.only_hosxp ?? 0,
        only_stm: selectedMonth?.only_stm ?? reconciliation?.only_stm ?? 0,
        stm_out_of_range: selectedMonth?.stm_out_of_range ?? reconciliation?.stm_out_of_range ?? 0,
    };

    const applyFilter = (next?: {
        status?: string | null;
        month?: string | null;
        error_code?: string | null;
        per_page?: number | string | null;
        page?: number | null;
    }) => {
        const status =
            next && 'status' in next
                ? next.status || undefined
                : filters.status || undefined;
        const month =
            next && 'month' in next
                ? next.month || undefined
                : filters.month || undefined;
        const errorCode =
            next && 'error_code' in next
                ? next.error_code || undefined
                : filters.error_code || undefined;
        const perPage =
            next && 'per_page' in next
                ? next.per_page || 'all'
                : filters.per_page || 'all';
        // เปลี่ยนตัวกรองแล้วกลับหน้า 1 เสมอ ยกเว้นกดเลขหน้าเอง
        const page =
            next && 'page' in next
                ? next.page || 1
                : next
                  ? 1
                  : filters.page || 1;
        const jumpToTable = Boolean(next && ('status' in next || 'month' in next || 'error_code' in next));

        router.get(
            claimRoute(mod, 'show', batch.id),
            {
                status: status || undefined,
                month: month || undefined,
                error_code: errorCode || undefined,
                q: q || undefined,
                per_page: perPage === 'all' ? 'all' : perPage || undefined,
                page: page && page > 1 ? page : undefined,
            },
            {
                preserveState: true,
                preserveScroll: !jumpToTable,
                replace: true,
                onSuccess: () => {
                    if (!jumpToTable) return;
                    requestAnimationFrame(() => {
                        document.getElementById('cgd-reconcile-items')?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                        });
                    });
                },
            },
        );
    };

    const filteredTotal = items?.total ?? items?.data?.length ?? 0;
    const filteredFrom = items?.from ?? (filteredTotal > 0 ? 1 : 0);
    const filteredTo = items?.to ?? filteredTotal;
    const lastPage = items?.last_page ?? 1;

    const runReconcile = () => {
        router.post(claimRoute(mod, 'reconcile', batch.id), {
            start_date: startDate,
            end_date: endDate,
        });
    };

    const exportStatusLabel = filters.status ? statusOptions[filters.status] : null;
    const exportMonthLabel = selectedMonth?.label || null;
    const exportErrorLabel = filters.error_code
        ? errorOptions.find((o) => o.value === filters.error_code)?.label || filters.error_code
        : null;
    const exportHref = (exportKey: 'export' | 'export_pdf') => {
        const base = claimRoute(mod, exportKey, batch.id);
        const params = new URLSearchParams();
        if (filters.status) params.set('status', filters.status);
        if (filters.month) params.set('month', filters.month);
        if (filters.error_code) params.set('error_code', filters.error_code);
        const query = (q || filters.q || '').trim();
        if (query) params.set('q', query);
        const qs = params.toString();

        return qs ? `${base}?${qs}` : base;
    };
    const exportSuffix = [
        exportMonthLabel,
        exportStatusLabel,
        exportErrorLabel,
    ]
        .filter(Boolean)
        .join(' · ');

    const summaryCards =
        hasActiveFilter && filterTotals
            ? [
                  {
                      label: 'รายการตามตัวกรอง',
                      value: filterTotals.item_count,
                      hint: filters.status
                          ? statusOptions[filters.status] || filters.status
                          : selectedMonth?.label || 'ตามตัวกรอง',
                      isCount: true,
                  },
                  { label: 'HOSxP (SEQ ตรง)', value: filterTotals.total_hosxp, hint: 'เฉพาะ SEQ ตรงกับ REP' },
                  { label: 'Payment', value: filterTotals.total_hosxp_paid, hint: 'SEQ ตรง' },
                  { label: 'หลังหัก Payment', value: filterTotals.total_hosxp_net, hint: 'SEQ ตรง' },
                  { label: 'เรียกเก็บ', value: filterTotals.total_claim, hint: fileLabel },
                  { label: approvedLabel, value: filterTotals.total_approved, hint: 'ค่ารักษา / กองทุนจ่าย' },
                  {
                      label: filters.status === 'matched_over' ? 'ยอดเกิน' : 'ยอดขาด',
                      value:
                          filters.status === 'matched_over'
                              ? filterTotals.total_over
                              : filterTotals.total_shortfall,
                      hint: shortfallHint,
                      danger: true,
                  },
                  {
                      label: 'HOSxP ไม่มี SEQ ตรง',
                      value: filterTotals.total_hosxp_unmatched_net ?? filterTotals.total_hosxp_unmatched ?? 0,
                      hint: `${(filterTotals.only_hosxp_count ?? 0).toLocaleString()} รายการ · หลังหัก Payment`,
                  },
              ]
            : selectedMonth
              ? [
                    {
                        label: 'รายการเดือนนี้',
                        value: selectedMonth.item_count,
                        hint: selectedMonth.label,
                        isCount: true,
                    },
                    { label: 'HOSxP (SEQ ตรง)', value: selectedMonth.total_hosxp, hint: selectedMonth.label },
                    { label: 'Payment', value: selectedMonth.total_hosxp_paid, hint: 'SEQ ตรง' },
                    {
                        label: 'หลังหัก Payment',
                        value: selectedMonth.total_hosxp_net,
                        hint: 'SEQ ตรง',
                    },
                    { label: 'เรียกเก็บ', value: selectedMonth.total_stm_claim, hint: fileLabel },
                    { label: approvedLabel, value: selectedMonth.total_stm_approved, hint: 'ค่ารักษา / กองทุนจ่าย' },
                    { label: 'ยอดขาด', value: selectedMonth.total_shortfall, hint: shortfallHint, danger: true },
                    {
                        label: 'HOSxP ไม่มี SEQ ตรง',
                        value: selectedMonth.total_hosxp_unmatched_net ?? selectedMonth.total_hosxp_unmatched ?? 0,
                        hint: `${selectedMonth.only_hosxp.toLocaleString()} รายการ · หลังหัก Payment`,
                    },
                ]
              : reconciliation
                ? [
                      {
                          label: 'HOSxP (SEQ ตรง)',
                          value: reconciliation.total_hosxp,
                          hint: `${(reconciliation.matched_hosxp_count ?? 0).toLocaleString()} visits`,
                      },
                      { label: 'Payment', value: reconciliation.total_hosxp_paid, hint: 'SEQ ตรง' },
                      {
                          label: 'หลังหัก Payment',
                          value: reconciliation.total_hosxp_net,
                          hint: 'SEQ ตรง',
                      },
                      {
                          label: 'เรียกเก็บ',
                          value: reconciliation.total_stm_claim,
                          hint: `${reconciliation.stm_count.toLocaleString()} รายการ`,
                      },
                      { label: approvedLabel, value: reconciliation.total_stm_approved, hint: 'ค่ารักษา / กองทุนจ่าย' },
                      { label: 'ยอดขาด', value: reconciliation.total_shortfall, hint: shortfallHint, danger: true },
                      {
                          label: 'HOSxP ไม่มี SEQ ตรง',
                          value: reconciliation.total_hosxp_unmatched_net ?? reconciliation.total_hosxp_unmatched ?? 0,
                          hint: `${reconciliation.only_hosxp.toLocaleString()} รายการ · หลังหัก Payment`,
                      },
                  ]
                : [];

    return (
        <TooltipProvider delayDuration={200}>
        <QualityPage
            tone="emerald"
            icon={FileCheck2}
            badge="Financial Data Hub"
            title={batch.document_no || batch.filename}
            subtitle={`นำเข้า ${batch.created_at} · ${batch.row_count.toLocaleString()} รายการ${isEclaim ? ' e-Claim' : ' REP'}${(batch.error_row_count || 0) > 0 ? ` · Error ${batch.error_row_count}` : ''}${(batch.zero_fund_count || 0) > 0 ? ` · จ่าย 0 บาท ${batch.zero_fund_count}` : ''}`}
            breadcrumbs={dataHubBreadcrumbs({ title: 'รายละเอียดชุดข้อมูล', href: claimRoute(mod, 'show', batch.id) })}
            headTitle="รายละเอียด REP"
            subNav={<DataHubSubNav active={mod.routes.dashboard} />}
            actions={
                <div className="flex flex-wrap gap-2">
                    {reconciliation && (
                        <>
                            <Button asChild variant="outline" className="rounded-xl">
                                <a href={exportHref('export')}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Excel สรุป
                                    {exportSuffix ? ` · ${exportSuffix}` : ' · ตามตัวกรอง'}
                                </a>
                            </Button>
                            <Button asChild variant="outline" className="rounded-xl">
                                <a href={exportHref('export_pdf')}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    PDF สรุป
                                    {exportSuffix ? ` · ${exportSuffix}` : ' · ตามตัวกรอง'}
                                </a>
                            </Button>
                        </>
                    )}
                    <DeleteBatchButton
                        batchId={batch.id}
                        module={mod}
                        documentNo={batch.document_no}
                        filename={batch.filename}
                        rowCount={batch.row_count}
                        size="default"
                    />
                </div>
            }
        >
            <ClaimModuleSubNav
                dashboardUrl={claimRoute(mod, 'dashboard')}
                importUrl={claimRoute(mod, 'import')}
                stmUrl={mod.has_stm ? claimRoute(mod, 'stm_index') : undefined}
                precheckUrl={mod.key === 'cgd' ? claimRoute(mod, 'precheck') : undefined}
                importLabel={mod.labels.import_rep}
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
                                        <th className="px-3 py-2 text-right">HOSxP (SEQ)</th>
                                        <th className="px-3 py-2 text-right">Payment</th>
                                        <th className="px-3 py-2 text-right">หลังหัก</th>
                                        <th className="px-3 py-2 text-right">เรียกเก็บ</th>
                                        <th className="px-3 py-2 text-right">{approvedLabel}</th>
                                        <th className="px-3 py-2 text-right">ขาด</th>
                                        <th className="px-3 py-2 text-right">HOSxP ไม่มี SEQ</th>
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
                                                <MoneyText value={m.total_stm_claim} size="sm" />
                                            </td>
                                            <td className="px-3 py-2.5 text-right">
                                                <MoneyText value={m.total_stm_approved} size="sm" />
                                            </td>
                                            <td className="px-3 py-2.5 text-right">
                                                <MoneyText value={m.total_shortfall} size="sm" className="font-semibold text-rose-600" />
                                            </td>
                                            <td className="px-3 py-2.5 text-right">
                                                <MoneyText
                                                    value={m.total_hosxp_unmatched_net ?? m.total_hosxp_unmatched ?? 0}
                                                    size="sm"
                                                    className="text-sky-700"
                                                />
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
                                : `HOSxP นับเฉพาะ SEQ ตรงกับ REP · ยอดขาด = เรียกเก็บ − ${approvedLabel}`
                        }
                    >
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3">
                            <div className="mr-auto text-sm font-semibold text-emerald-950">
                                ดาวน์โหลดรายงานตามตัวกรองปัจจุบัน
                                {exportSuffix ? ` · ${exportSuffix}` : ''}
                            </div>
                            <Button asChild className="rounded-xl bg-emerald-700 hover:bg-emerald-800">
                                <a href={exportHref('export')}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Excel
                                </a>
                            </Button>
                            <Button asChild variant="outline" className="rounded-xl border-emerald-300 bg-white">
                                <a href={exportHref('export_pdf')}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    PDF
                                </a>
                            </Button>
                        </div>
                    </Panel>
                )}

                <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
                    <Panel title="สถานะรายการ" description="กดเพื่อกรองตารางด้านล่าง">
                        {reconciliation ? (
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(chipCounts).map(([key, count]) => (
                                    <button key={key} type="button" onClick={() => applyFilter({ status: key })}>
                                        <StatusPill
                                            label={`${statusOptions[key]} ${Number(count).toLocaleString('th-TH')}`}
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

                        {errorOptions.length > 0 && (
                            <div className="mt-4 border-t border-slate-100 pt-3">
                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                    <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                        กรอง Error Code
                                    </div>
                                    <a
                                        href={errorCodeSource}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[11px] text-emerald-700 underline"
                                    >
                                        ความหมายอ้างอิง UC@KKPHO
                                    </a>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button type="button" onClick={() => applyFilter({ error_code: null })}>
                                        <StatusPill
                                            label="ทุก Error Code"
                                            className={cn(
                                                'border-slate-200 bg-white text-slate-700',
                                                !filters.error_code && 'ring-2 ring-offset-1 ring-rose-400',
                                            )}
                                        />
                                    </button>
                                    {errorOptions.map((opt) => {
                                        const meaning =
                                            !['__has_error__', '__none__'].includes(opt.value)
                                                ? errorCodeMeanings[opt.value]
                                                : undefined;
                                        const pill = (
                                            <StatusPill
                                                label={`${opt.label} · ${opt.count.toLocaleString()}`}
                                                className={cn(
                                                    opt.value === '__none__'
                                                        ? 'border-slate-200 bg-slate-50 text-slate-700'
                                                        : 'border-rose-200 bg-rose-50 text-rose-800',
                                                    filters.error_code === opt.value && 'ring-2 ring-offset-1 ring-rose-400',
                                                    meaning && 'cursor-help',
                                                )}
                                            />
                                        );

                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => applyFilter({ error_code: opt.value })}
                                            >
                                                {meaning ? (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="inline-flex">{pill}</span>
                                                        </TooltipTrigger>
                                                        <TooltipContent
                                                            side="top"
                                                            className="max-w-md space-y-1.5 border-slate-200 bg-white p-3 text-xs text-slate-900 shadow-lg"
                                                        >
                                                            <div className="font-semibold text-rose-700">Error {opt.value}</div>
                                                            <div className="font-medium text-slate-800">{meaning.description}</div>
                                                            {meaning.solution && (
                                                                <div className="text-slate-700">
                                                                    <span className="font-semibold text-slate-800">แก้ไข: </span>
                                                                    {meaning.solution}
                                                                </div>
                                                            )}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                ) : (
                                                    pill
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </Panel>

                    <Panel title="รันเปรียบเทียบใหม่" description="เลือกช่วงวันที่ดึง Visit จาก HOSxP">
                        <div className="space-y-3">
                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-3 text-sm">
                                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">วันเข้ารักษาในไฟล์ REP</div>
                                <div className="mt-1 font-semibold text-emerald-900">{fileRange}</div>
                                <div className="mt-1 text-xs text-emerald-800/80">
                                    REP นอกช่วง HOSxP ที่เลือกจะยังแสดง (สถานะ “REP นอกช่วงวันที่ HOSxP”)
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
                                <Link href={claimRoute(mod, 'import')}>กลับหน้านำเข้า</Link>
                            </Button>
                            <DeleteBatchButton
                                batchId={batch.id}
                                module={mod}
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

            {zeroFundRows.length > 0 && (
                <div className="mt-6">
                    <Panel
                        title="รายงานข้อมูลกองทุน จ่าย 0 บาท"
                        description={`${zeroFundRows.length.toLocaleString()} รายการ · แสดงรหัสเบิกและเหตุผลจากแท็บ Data Sheet ของ e-Claim`}
                    >
                        <div className="overflow-x-auto rounded-xl border border-amber-100">
                            <table className="w-full min-w-[980px] text-sm">
                                <thead>
                                    <tr className="border-b border-amber-100 bg-amber-50/70 text-left text-[11px] font-semibold tracking-wide text-amber-900/70 uppercase">
                                        <th className="px-2 py-2.5">HN</th>
                                        <th className="px-2 py-2.5">PID</th>
                                        <th className="px-2 py-2.5">ชื่อ</th>
                                        <th className="px-2 py-2.5">วันที่</th>
                                        <th className="px-2 py-2.5">กองทุน</th>
                                        <th className="px-2 py-2.5">รหัสเบิก</th>
                                        <th className="px-2 py-2.5 text-right">เงินที่จ่าย</th>
                                        <th className="px-2 py-2.5">หมายเหตุ / เหตุผล</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {zeroFundRows.map((row) => (
                                        <tr key={row.id} className="border-b border-amber-50 hover:bg-amber-50/40">
                                            <td className="px-2 py-2 font-medium whitespace-nowrap">{row.hn || '-'}</td>
                                            <td className="px-2 py-2 text-xs whitespace-nowrap">{row.pid || '-'}</td>
                                            <td className="max-w-[160px] px-2 py-2">
                                                <span className="line-clamp-2">{row.patient_name || '-'}</span>
                                            </td>
                                            <td className="px-2 py-2 text-xs whitespace-nowrap">{row.visit_date || '-'}</td>
                                            <td className="px-2 py-2 whitespace-nowrap">{row.fund_code || '-'}</td>
                                            <td className="px-2 py-2 font-mono text-xs whitespace-nowrap">
                                                {[row.claim_code, row.tmt].filter(Boolean).join(' / ') || '-'}
                                            </td>
                                            <td className="px-2 py-2 text-right">
                                                <MoneyText value={row.amount_paid} size="sm" className="font-semibold text-amber-800" />
                                            </td>
                                            <td className="min-w-[260px] px-2 py-2 text-xs text-slate-700">
                                                {row.remark || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Panel>
                </div>
            )}

            <div className="mt-6" id="cgd-reconcile-items">
                <Panel
                    title="รายการเปรียบเทียบ"
                    description={`จับคู่ด้วย SEQ · ★P = มี Payment · ยอดขาด = เรียกเก็บ − ${approvedLabel} · กรองสถานะ “HOSxP ไม่มี SEQ ตรง” เพื่อดูส่วนต่าง`}
                >
                    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                className="pl-9"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') applyFilter({ page: 1 });
                                }}
                                placeholder="ค้นหา HN, PID, SEQ, ชื่อ, Error Code..."
                            />
                        </div>
                        <div className="w-full sm:w-40">
                            <Label className="text-xs text-slate-500">แสดงต่อหน้า</Label>
                            <select
                                className="mt-1 flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                                value={String(filters.per_page ?? 'all')}
                                onChange={(e) =>
                                    applyFilter({
                                        per_page: e.target.value === 'all' ? 'all' : Number(e.target.value),
                                        page: 1,
                                    })
                                }
                            >
                                <option value="all">ทั้งหมดตามตัวกรอง</option>
                                <option value="50">50 รายการ</option>
                                <option value="100">100 รายการ</option>
                                <option value="200">200 รายการ</option>
                                <option value="500">500 รายการ</option>
                            </select>
                        </div>
                        <Button variant="outline" className="rounded-xl" onClick={() => applyFilter({ page: 1 })}>
                            ค้นหา
                        </Button>
                    </div>

                    {(filters.status || filters.month || filters.error_code || (q || filters.q)) && filterTotals && (
                        <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3">
                            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-emerald-950">
                                <span className="font-semibold">รายละเอียดการเปรียบเทียบตามตัวกรอง</span>
                                {filters.status && (
                                    <StatusPill
                                        label={statusOptions[filters.status] || filters.status}
                                        className={statusClass[filters.status] || 'border-slate-200 bg-white text-slate-700'}
                                    />
                                )}
                                {selectedMonth && (
                                    <StatusPill
                                        label={selectedMonth.label}
                                        className="border-emerald-200 bg-white text-emerald-800"
                                    />
                                )}
                                <span className="tabular-nums text-emerald-900">
                                    {filterTotals.item_count.toLocaleString('th-TH')} รายการ
                                </span>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {[
                                    { label: 'HOSxP (SEQ ตรง)', value: filterTotals.total_hosxp },
                                    { label: 'Payment', value: filterTotals.total_hosxp_paid },
                                    { label: 'หลังหัก', value: filterTotals.total_hosxp_net },
                                    { label: 'เรียกเก็บ REP', value: filterTotals.total_claim },
                                    { label: approvedLabel, value: filterTotals.total_approved },
                                    {
                                        label: filters.status === 'matched_over' ? 'ยอดเกิน' : 'ยอดขาด',
                                        value:
                                            filters.status === 'matched_over'
                                                ? filterTotals.total_over
                                                : filterTotals.total_shortfall,
                                        danger: true,
                                    },
                                    {
                                        label: 'HOSxP ไม่มี SEQ ตรง',
                                        value:
                                            filterTotals.total_hosxp_unmatched_net ??
                                            filterTotals.total_hosxp_unmatched ??
                                            0,
                                    },
                                ].map((card) => (
                                    <div
                                        key={card.label}
                                        className={cn(
                                            'rounded-xl border px-3 py-2',
                                            card.danger ? 'border-rose-200 bg-rose-50/80' : 'border-white/80 bg-white/80',
                                        )}
                                    >
                                        <div className="text-[11px] text-slate-500">{card.label}</div>
                                        <MoneyText
                                            value={card.value}
                                            size="sm"
                                            className={cn(
                                                'mt-0.5 font-semibold',
                                                card.danger ? 'text-rose-700' : 'text-slate-900',
                                            )}
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="mt-2 text-[11px] text-emerald-900/80">
                                สูตร: ยอดขาด = เรียกเก็บ − {approvedLabel} · HOSxP นับเฉพาะ SEQ ตรงกับ REP · ส่วนต่าง = visit HOSxP ที่ไม่มี SEQ ตรง
                            </div>
                        </div>
                    )}

                    <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-sm text-emerald-900">
                        ตามตัวกรองปัจจุบัน:{' '}
                        <span className="font-semibold tabular-nums">{filteredTotal.toLocaleString('th-TH')}</span> รายการ
                        {filteredTotal > 0 && (
                            <>
                                {' '}
                                · แสดง {filteredFrom.toLocaleString('th-TH')}–{filteredTo.toLocaleString('th-TH')}
                            </>
                        )}
                        {(filters.status || filters.month || filters.error_code || (q || filters.q)) && (
                            <span className="text-emerald-800/80"> (ถูกกรองแล้ว)</span>
                        )}
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full min-w-[1360px] border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                    <th className="px-2 py-2.5 whitespace-nowrap">สถานะ</th>
                                    <th className="px-2 py-2.5 whitespace-nowrap">Error</th>
                                    <th className="px-2 py-2.5 whitespace-nowrap">กองทุน</th>
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
                                    <th className="px-2 py-2.5 text-right whitespace-nowrap">{approvedLabel}</th>
                                    <th className="px-2 py-2.5 text-right whitespace-nowrap">ผลต่างเรียกเก็บ−ชดเชย</th>
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
                                            item.error_code && 'bg-rose-50/30',
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
                                        <td className="px-2 py-2 align-top whitespace-nowrap">
                                            {item.error_code ? (
                                                <ErrorCodeBadge
                                                    code={item.error_code}
                                                    meaning={errorCodeMeanings[item.error_code]}
                                                    sourceUrl={errorCodeSource}
                                                />
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </td>
                                        <td className="px-2 py-2 align-top text-[11px] whitespace-nowrap text-slate-600">
                                            {item.fund_codes || '-'}
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
                                            <MoneyText
                                                value={item.diff_approved}
                                                size="sm"
                                                className={cn(
                                                    'font-semibold',
                                                    item.diff_approved > 0.009 && 'text-rose-600',
                                                    item.diff_approved < -0.009 && 'text-amber-700',
                                                    Math.abs(item.diff_approved) <= 0.009 && 'text-emerald-700',
                                                )}
                                            />
                                        </td>
                                        <td className="px-2 py-2 align-top text-right">
                                            <MoneyText value={item.shortfall} size="sm" className="font-semibold text-rose-600" />
                                        </td>
                                    </tr>
                                ))}
                                {(!items || items.data.length === 0) && (
                                    <tr>
                                        <td colSpan={16} className="px-3 py-10 text-center text-slate-400">
                                            {filters.status
                                                ? `ไม่พบรายการสถานะ “${statusOptions[filters.status] || filters.status}” ตามตัวกรองนี้`
                                                : 'ไม่พบรายการ'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {lastPage > 1 && (
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                className="rounded-lg"
                                disabled={(items?.current_page || 1) <= 1}
                                onClick={() => applyFilter({ page: (items?.current_page || 1) - 1 })}
                            >
                                ก่อนหน้า
                            </Button>
                            {Array.from({ length: lastPage }, (_, i) => i + 1)
                                .filter((page) => {
                                    const current = items?.current_page || 1;
                                    return page === 1 || page === lastPage || Math.abs(page - current) <= 2;
                                })
                                .map((page, idx, arr) => {
                                    const prev = arr[idx - 1];
                                    const showEllipsis = prev !== undefined && page - prev > 1;
                                    return (
                                        <span key={page} className="contents">
                                            {showEllipsis && <span className="px-1 text-slate-400">…</span>}
                                            <Button
                                                size="sm"
                                                variant={page === (items?.current_page || 1) ? 'default' : 'outline'}
                                                className="rounded-lg"
                                                onClick={() => applyFilter({ page })}
                                            >
                                                {page}
                                            </Button>
                                        </span>
                                    );
                                })}
                            <Button
                                size="sm"
                                variant="outline"
                                className="rounded-lg"
                                disabled={(items?.current_page || 1) >= lastPage}
                                onClick={() => applyFilter({ page: (items?.current_page || 1) + 1 })}
                            >
                                ถัดไป
                            </Button>
                        </div>
                    )}
                </Panel>
            </div>
        </QualityPage>
        </TooltipProvider>
    );
}
