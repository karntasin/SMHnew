import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { ArrowLeft, Download, FileCheck2, FileText, Search } from 'lucide-react';
import { QualityPage, Panel, StatusPill } from '@/components/quality/quality-ui';
import DataHubSubNav, { dataHubBreadcrumbs } from '../DataHub/DataHubSubNav';
import ClaimModuleSubNav from '../DataHub/ClaimModuleSubNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
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
    error_code: string | null;
    fund_codes: string | null;
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
    total_hosxp_unmatched_net?: number;
    only_hosxp_count?: number;
    total_claim: number;
    total_approved: number;
    total_shortfall: number;
    total_over: number;
}

interface Props {
    hosxpReady: boolean;
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
        total_hosxp_unmatched_net?: number;
        total_stm_claim: number;
        total_stm_approved: number;
        total_shortfall: number;
        created_at: string;
    };
    monthly: MonthSummary[];
    items: {
        data: Item[];
        total?: number;
        from?: number | null;
        to?: number | null;
        current_page?: number;
        last_page?: number;
        per_page?: number;
    } | null;
    filterTotals?: FilterTotals | null;
    statusCounts?: Record<string, number> | null;
    errorOptions?: ErrorOption[];
    amountOptions?: ErrorOption[];
    errorCodeMeanings?: Record<string, ErrorMeaning>;
    errorCodeSource?: string;
    batchCount?: number;
    importCount?: number;
    repErrors?: Array<{
        id: number;
        rep_no: string | null;
        hn: string | null;
        seq_no: string | null;
        patient_name: string | null;
        error_code: string | null;
        amount_claim: number;
        amount_approved: number;
        remark: string | null;
    }>;
    filters: {
        status?: string;
        q?: string;
        month?: string;
        error_code?: string;
        amount?: string;
        per_page?: number | string;
        page?: number;
    };
    statusOptions: Record<string, string>;
    amountLabels?: Record<string, string>;
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
                    ไม่พบคำอธิบายรหัสนี้ในระบบ
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

export default function CgdClaimSummary({
    reconciliation,
    monthly = [],
    items,
    filterTotals = null,
    statusCounts = null,
    errorOptions = [],
    amountOptions = [],
    errorCodeMeanings = {},
    errorCodeSource = 'https://www.uckkpho.com/uc/1313/',
    batchCount,
    importCount,
    repErrors = [],
    filters,
    statusOptions,
    module,
}: Props) {
    const mod = resolveClaimModule(module);
    const sourceLabel = mod.labels.source;
    const sourceAllLabel = mod.labels.source_all;
    const stmSetCount = importCount ?? batchCount ?? 0;
    const [q, setQ] = useState(filters.q || '');
    const visibleMonths = monthly.filter((m) => m.month !== 'unknown' && m.item_count > 0);
    const selectedMonth = visibleMonths.find((m) => m.month === filters.month) || null;
    const hasActiveFilter = Boolean(
        filters.status || filters.month || filters.error_code || filters.amount || filters.q,
    );

    const applyFilter = (next?: {
        status?: string | null;
        month?: string | null;
        error_code?: string | null;
        amount?: string | null;
        per_page?: number | string | null;
        page?: number | null;
    }) => {
        const status =
            next && 'status' in next ? next.status || undefined : filters.status || undefined;
        const month =
            next && 'month' in next ? next.month || undefined : filters.month || undefined;
        const errorCode =
            next && 'error_code' in next
                ? next.error_code || undefined
                : filters.error_code || undefined;
        const amount =
            next && 'amount' in next ? next.amount || undefined : filters.amount || undefined;
        const perPage =
            next && 'per_page' in next
                ? next.per_page || 'all'
                : filters.per_page || 'all';
        const page =
            next && 'page' in next ? next.page || 1 : next ? 1 : filters.page || 1;

        router.get(
            claimRoute(mod, 'summary'),
            {
                status: status || undefined,
                month: month || undefined,
                error_code: errorCode || undefined,
                amount: amount || undefined,
                q: q || undefined,
                per_page: perPage === 'all' ? 'all' : perPage || undefined,
                page: page && page > 1 ? page : undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const filteredTotal = items?.total ?? items?.data?.length ?? 0;
    const filteredFrom = items?.from ?? (filteredTotal > 0 ? 1 : 0);
    const filteredTo = items?.to ?? filteredTotal;
    const lastPage = items?.last_page ?? 1;

    const exportStatusLabel = filters.status ? statusOptions[filters.status] : null;
    const exportMonthLabel = selectedMonth?.label || null;
    const exportErrorLabel = filters.error_code
        ? errorOptions.find((o) => o.value === filters.error_code)?.label || filters.error_code
        : null;
    const exportAmountLabel = filters.amount
        ? amountOptions.find((o) => o.value === filters.amount)?.label || filters.amount
        : null;
    const exportHref = (exportKey: 'summary_export' | 'summary_export_pdf') => {
        const params = new URLSearchParams();
        if (filters.status) params.set('status', filters.status);
        if (filters.month) params.set('month', filters.month);
        if (filters.error_code) params.set('error_code', filters.error_code);
        if (filters.amount) params.set('amount', filters.amount);
        const query = (q || filters.q || '').trim();
        if (query) params.set('q', query);
        const qs = params.toString();
        const base = claimRoute(mod, exportKey);

        return qs ? `${base}?${qs}` : base;
    };
    const exportSuffix = [exportMonthLabel, exportStatusLabel, exportErrorLabel, exportAmountLabel]
        .filter(Boolean)
        .join(' · ');

    const chipCounts = statusCounts || {
        matched_ok: selectedMonth?.matched_ok ?? reconciliation.matched_ok,
        matched_short: selectedMonth?.matched_short ?? reconciliation.matched_short,
        matched_over: selectedMonth?.matched_over ?? reconciliation.matched_over,
        only_hosxp: selectedMonth?.only_hosxp ?? reconciliation.only_hosxp,
        only_stm: selectedMonth?.only_stm ?? reconciliation.only_stm,
        stm_out_of_range: selectedMonth?.stm_out_of_range ?? reconciliation.stm_out_of_range,
    };

    const summaryCards =
        hasActiveFilter && filterTotals
            ? [
                  {
                      label: 'รายการตามตัวกรอง',
                      value: filterTotals.item_count,
                      hint: filters.status
                          ? statusOptions[filters.status] || filters.status
                          : selectedMonth?.label || 'ตามตัวกรอง',
                      isCount: true as const,
                  },
                  {
                      label: 'HOSxP (SEQ ตรง)',
                      value: filterTotals.total_hosxp,
                      hint: `หลังหัก ${money(filterTotals.total_hosxp_net)}`,
                  },
                  {
                      label: `เรียกเก็บ ${sourceLabel}`,
                      value: filterTotals.total_claim,
                      hint: 'ตามตัวกรองปัจจุบัน',
                  },
                  {
                      label: 'ชดเชยสุทธิ',
                      value: filterTotals.total_approved,
                      hint: 'ค่ารักษา / กองทุนจ่าย',
                  },
                  {
                      label: filters.status === 'matched_over' ? 'ยอดเกิน' : 'ยอดขาด',
                      value:
                          filters.status === 'matched_over'
                              ? filterTotals.total_over
                              : filterTotals.total_shortfall,
                      hint: 'เรียกเก็บ − ชดเชยสุทธิ',
                      danger: true,
                  },
                  {
                      label: 'HOSxP ไม่มี SEQ ตรง',
                      value: filterTotals.total_hosxp_unmatched_net ?? filterTotals.total_hosxp_unmatched ?? 0,
                      hint: `${(filterTotals.only_hosxp_count ?? 0).toLocaleString('th-TH')} รายการ`,
                  },
              ]
            : [
                  {
                      label: 'HOSxP (SEQ ตรง)',
                      value: reconciliation.total_hosxp,
                      hint: `${(reconciliation.matched_hosxp_count ?? 0).toLocaleString('th-TH')} visits · หลังหัก ${money(reconciliation.total_hosxp_net)}`,
                  },
                  {
                      label: `เรียกเก็บ ${sourceLabel}`,
                      value: reconciliation.total_stm_claim,
                      hint: `จากทุกชุด ${sourceAllLabel}`,
                  },
                  {
                      label: 'ชดเชยสุทธิ',
                      value: reconciliation.total_stm_approved,
                      hint: `${reconciliation.stm_count.toLocaleString('th-TH')} รายการ`,
                  },
                  {
                      label: 'ยอดขาด',
                      value: reconciliation.total_shortfall,
                      hint: 'เรียกเก็บ − ชดเชยสุทธิ',
                      danger: true,
                  },
                  {
                      label: 'HOSxP ไม่มี SEQ ตรง',
                      value: reconciliation.total_hosxp_unmatched_net ?? reconciliation.total_hosxp_unmatched ?? 0,
                      hint: `${reconciliation.only_hosxp.toLocaleString('th-TH')} รายการ · หลังหัก Payment`,
                  },
              ];

    return (
        <TooltipProvider delayDuration={200}>
            <QualityPage
                tone="emerald"
                icon={FileCheck2}
                badge="Financial Data Hub"
                title="รายละเอียดผลการเปรียบเทียบ"
                subtitle={`ทุกชุด ${sourceAllLabel} (${stmSetCount.toLocaleString('th-TH')} ชุด) · HOSxP ${reconciliation.start_date} → ${reconciliation.end_date} · รันเมื่อ ${reconciliation.created_at}`}
                breadcrumbs={dataHubBreadcrumbs({
                    title: 'รายละเอียดเปรียบเทียบ',
                    href: claimRoute(mod, 'summary'),
                })}
                headTitle={`รายละเอียดเปรียบเทียบ ${sourceLabel}`}
                subNav={<DataHubSubNav active={mod.routes.dashboard} />}
                actions={
                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" className="rounded-xl">
                            <a href={exportHref('summary_export')}>
                                <Download className="mr-2 h-4 w-4" />
                                Excel สรุป
                                {exportSuffix ? ` · ${exportSuffix}` : ' · ตามตัวกรอง'}
                            </a>
                        </Button>
                        <Button asChild variant="outline" className="rounded-xl">
                            <a href={exportHref('summary_export_pdf')}>
                                <FileText className="mr-2 h-4 w-4" />
                                PDF สรุป
                                {exportSuffix ? ` · ${exportSuffix}` : ' · ตามตัวกรอง'}
                            </a>
                        </Button>
                        <Button asChild variant="outline" className="rounded-xl">
                            <Link href={claimRoute(mod, 'dashboard')}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                กลับหน้าตรวจสอบ
                            </Link>
                        </Button>
                    </div>
                }
            >
                <ClaimModuleSubNav
                    dashboardUrl={claimRoute(mod, 'dashboard')}
                    importUrl={claimRoute(mod, 'import')}
                    stmUrl={mod.has_stm ? claimRoute(mod, 'stm_index') : undefined}
                    precheckUrl={mod.key === 'cgd' ? claimRoute(mod, 'precheck') : undefined}
                    active="dashboard"
                />

                <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                    {summaryCards.map((card) => (
                        <div
                            key={card.label}
                            className={cn(
                                'rounded-2xl border px-4 py-3',
                                'danger' in card && card.danger
                                    ? 'border-rose-100 bg-rose-50/70'
                                    : 'border-slate-100 bg-white',
                            )}
                        >
                            <div className="text-xs text-slate-500">{card.label}</div>
                            {'isCount' in card && card.isCount ? (
                                <div
                                    className={cn(
                                        'mt-1 text-2xl font-bold tabular-nums',
                                        'danger' in card && card.danger ? 'text-rose-700' : 'text-slate-900',
                                    )}
                                >
                                    {Number(card.value).toLocaleString('th-TH')}
                                </div>
                            ) : (
                                <MoneyText
                                    value={card.value}
                                    size="lg"
                                    className={cn(
                                        'mt-1',
                                        'danger' in card && card.danger ? 'text-rose-700' : 'text-slate-900',
                                    )}
                                />
                            )}
                            <div className="mt-1 text-[11px] text-slate-400">{card.hint}</div>
                        </div>
                    ))}
                </div>

                <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3">
                    <div className="mr-auto text-sm font-semibold text-emerald-950">
                        ดาวน์โหลดรายงานตามตัวกรองปัจจุบัน
                        {exportSuffix ? ` · ${exportSuffix}` : ''}
                    </div>
                    <Button asChild className="rounded-xl bg-emerald-700 hover:bg-emerald-800">
                        <a href={exportHref('summary_export')}>
                            <Download className="mr-2 h-4 w-4" />
                            Excel
                        </a>
                    </Button>
                    <Button asChild variant="outline" className="rounded-xl border-emerald-300 bg-white">
                        <a href={exportHref('summary_export_pdf')}>
                            <FileText className="mr-2 h-4 w-4" />
                            PDF
                        </a>
                    </Button>
                </div>

                <Panel title="สถานะรายการ" description="กดเพื่อกรองตารางด้านล่าง" className="mb-4">
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(chipCounts).map(([key, count]) => (
                            <button key={key} type="button" onClick={() => applyFilter({ status: key })}>
                                <StatusPill
                                    label={`${statusOptions[key]} ${Number(count).toLocaleString('th-TH')}`}
                                    className={cn(
                                        statusClass[key],
                                        filters.status === key && 'ring-2 ring-offset-1 ring-emerald-400',
                                    )}
                                />
                            </button>
                        ))}
                        {filters.status && (
                            <button type="button" onClick={() => applyFilter({ status: null })}>
                                <StatusPill label="ล้างสถานะ" className="border-slate-200 bg-white text-slate-600" />
                            </button>
                        )}
                    </div>

                    {visibleMonths.length > 0 && (
                        <div className="mt-4 border-t border-slate-100 pt-3">
                            <div className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                กรองตามเดือน
                            </div>
                            <div className="flex flex-wrap gap-2">
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
                                    <button
                                        key={m.month}
                                        type="button"
                                        onClick={() => applyFilter({ month: m.month })}
                                    >
                                        <StatusPill
                                            label={`${m.label} · ${m.item_count.toLocaleString('th-TH')}`}
                                            className={cn(
                                                'border-emerald-200 bg-emerald-50 text-emerald-800',
                                                filters.month === m.month &&
                                                    'ring-2 ring-offset-1 ring-emerald-400',
                                            )}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
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
                                {errorOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => applyFilter({ error_code: opt.value })}
                                    >
                                        <StatusPill
                                            label={`${opt.label} · ${opt.count.toLocaleString()}`}
                                            className={cn(
                                                opt.value === '__none__'
                                                    ? 'border-slate-200 bg-slate-50 text-slate-700'
                                                    : 'border-rose-200 bg-rose-50 text-rose-800',
                                                filters.error_code === opt.value &&
                                                    'ring-2 ring-offset-1 ring-rose-400',
                                            )}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </Panel>

                <Panel
                    title={`ตัวกรองยอดไม่ตรง HOSxP vs ${sourceLabel}`}
                    description="รายการที่จับคู่ SEQ แล้ว แต่ยอด HOSxP สุทธิไม่ตรงเรียกเก็บ/ชดเชย หรือส่วนต่างตามสาเหตุ"
                    className="mb-4 border-amber-200 bg-amber-50/40"
                >
                    <div className="mb-2 flex flex-wrap gap-2">
                        <button type="button" onClick={() => applyFilter({ amount: null })}>
                            <StatusPill
                                label="ทุกยอดเงิน"
                                className={cn(
                                    'border-slate-200 bg-white text-slate-700',
                                    !filters.amount && 'ring-2 ring-offset-1 ring-amber-400',
                                )}
                            />
                        </button>
                        {amountOptions
                            .filter((opt) => opt.count > 0)
                            .map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() =>
                                        applyFilter({
                                            amount: filters.amount === opt.value ? null : opt.value,
                                        })
                                    }
                                >
                                    <StatusPill
                                        label={`${opt.label} · ${opt.count.toLocaleString()}`}
                                        className={cn(
                                            'border-amber-300 bg-amber-100 text-amber-900',
                                            filters.amount === opt.value &&
                                                'ring-2 ring-offset-1 ring-amber-500',
                                        )}
                                    />
                                </button>
                            ))}
                    </div>
                    {filters.amount && (
                        <div className="text-xs text-amber-900">
                            กำลังกรอง: {exportAmountLabel}
                            {' · '}
                            <button
                                type="button"
                                className="underline"
                                onClick={() => applyFilter({ amount: null })}
                            >
                                ล้างตัวกรองยอด
                            </button>
                        </div>
                    )}
                    {amountOptions.length === 0 && (
                        <div className="text-xs text-slate-500">ยังไม่มีข้อมูลเปรียบเทียบสำหรับตัวกรองยอด</div>
                    )}
                </Panel>

                <div id="cgd-reconcile-items">
                <Panel
                    title="รายการเปรียบเทียบ"
                    description={`ผลรวมจากทุกชุด ${sourceAllLabel} เทียบ Visit HOSxP ด้วย SEQ`}
                >
                    <div className="mb-3 flex flex-wrap items-end gap-2">
                        <div className="min-w-[200px] flex-1">
                            <div className="relative">
                                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') applyFilter({ page: 1 });
                                    }}
                                    placeholder="ค้นหา HN / PID / SEQ / ชื่อ"
                                    className="rounded-xl pl-9"
                                />
                            </div>
                        </div>
                        <select
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
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
                        <Button variant="outline" className="rounded-xl" onClick={() => applyFilter({ page: 1 })}>
                            ค้นหา
                        </Button>
                    </div>

                    {(filters.status || filters.month || filters.error_code || (q || filters.q)) &&
                        filterTotals && (
                            <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3">
                                <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-emerald-950">
                                    <span className="font-semibold">รายละเอียดตามตัวกรอง</span>
                                    {filters.status && (
                                        <StatusPill
                                            label={statusOptions[filters.status] || filters.status}
                                            className={
                                                statusClass[filters.status] ||
                                                'border-slate-200 bg-white text-slate-700'
                                            }
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
                                        { label: `เรียกเก็บ ${sourceLabel}`, value: filterTotals.total_claim },
                                        { label: 'ชดเชยสุทธิ', value: filterTotals.total_approved },
                                        {
                                            label:
                                                filters.status === 'matched_over' ? 'ยอดเกิน' : 'ยอดขาด',
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
                                                card.danger
                                                    ? 'border-rose-200 bg-rose-50/80'
                                                    : 'border-white/80 bg-white/80',
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
                            </div>
                        )}

                    <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-sm text-emerald-900">
                        ตามตัวกรองปัจจุบัน:{' '}
                        <span className="font-semibold tabular-nums">
                            {filteredTotal.toLocaleString('th-TH')}
                        </span>{' '}
                        รายการ
                        {filteredTotal > 0 && (
                            <>
                                {' '}
                                · แสดง {filteredFrom.toLocaleString('th-TH')}–
                                {filteredTo.toLocaleString('th-TH')}
                            </>
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
                                    <th className="px-2 py-2.5 text-right whitespace-nowrap">ชดเชยสุทธิ</th>
                                    <th className="px-2 py-2.5 text-right whitespace-nowrap">ผลต่าง</th>
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
                                                <StatusPill
                                                    label={item.status_label}
                                                    className={statusClass[item.status]}
                                                />
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
                                        <td className="px-2 py-2 align-top font-medium whitespace-nowrap">
                                            {item.hn}
                                        </td>
                                        <td className="px-2 py-2 align-top text-xs whitespace-nowrap">
                                            {item.pid}
                                        </td>
                                        <td className="px-2 py-2 align-top font-mono text-[11px] whitespace-nowrap">
                                            {item.seq_no}
                                        </td>
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
                                                    <div className="line-clamp-2 text-xs font-medium text-slate-800">
                                                        {item.pttype}
                                                    </div>
                                                    {(item.pttype_code || item.hipdata_code) && (
                                                        <div className="text-[10px] text-slate-400">
                                                            {[item.pttype_code, item.hipdata_code]
                                                                .filter(Boolean)
                                                                .join(' · ')}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-2 py-2 align-top text-xs whitespace-nowrap">
                                            {item.visit_date}
                                        </td>
                                        <td className="px-2 py-2 align-top text-right">
                                            <MoneyText
                                                value={item.hosxp_total}
                                                size="sm"
                                                className="text-slate-700"
                                            />
                                        </td>
                                        <td className="px-2 py-2 align-top text-right">
                                            <MoneyText
                                                value={item.hosxp_paid}
                                                size="sm"
                                                className={
                                                    item.payment_adjusted
                                                        ? 'font-semibold text-amber-700'
                                                        : 'text-slate-600'
                                                }
                                            />
                                        </td>
                                        <td className="px-2 py-2 align-top text-right">
                                            <MoneyText
                                                value={item.hosxp_net}
                                                size="sm"
                                                className="font-medium text-slate-800"
                                            />
                                        </td>
                                        <td className="px-2 py-2 align-top text-right">
                                            <MoneyText
                                                value={item.stm_claim}
                                                size="sm"
                                                className="text-slate-700"
                                            />
                                        </td>
                                        <td className="px-2 py-2 align-top text-right">
                                            <MoneyText
                                                value={item.stm_approved}
                                                size="sm"
                                                className="text-slate-700"
                                            />
                                        </td>
                                        <td className="px-2 py-2 align-top text-right">
                                            <MoneyText
                                                value={item.diff_approved}
                                                size="sm"
                                                className={cn(
                                                    'font-semibold',
                                                    item.diff_approved > 0.009 && 'text-rose-600',
                                                    item.diff_approved < -0.009 && 'text-amber-700',
                                                    Math.abs(item.diff_approved) <= 0.009 &&
                                                        'text-emerald-700',
                                                )}
                                            />
                                        </td>
                                        <td className="px-2 py-2 align-top text-right">
                                            <MoneyText
                                                value={item.shortfall}
                                                size="sm"
                                                className="font-semibold text-rose-600"
                                            />
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
                                                variant={
                                                    page === (items?.current_page || 1)
                                                        ? 'default'
                                                        : 'outline'
                                                }
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

                {repErrors.length > 0 && (
                    <div className="mt-6">
                        <Panel
                            title={`REP ที่มี Error code (${repErrors.length.toLocaleString()})`}
                            description="เฉพาะแถวจากไฟล์ REP ที่เลข REP ตรงกับชุด STM และมี Error code"
                        >
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                            <th className="px-3 py-2">REP</th>
                                            <th className="px-3 py-2">Error</th>
                                            <th className="px-3 py-2">HN / SEQ</th>
                                            <th className="px-3 py-2">ชื่อ</th>
                                            <th className="px-3 py-2 text-right">เรียกเก็บ</th>
                                            <th className="px-3 py-2">หมายเหตุ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {repErrors.slice(0, 100).map((row) => (
                                            <tr key={row.id} className="border-b border-slate-50">
                                                <td className="px-3 py-2 whitespace-nowrap">{row.rep_no || '-'}</td>
                                                <td className="px-3 py-2 font-mono text-xs text-rose-700">
                                                    {row.error_code || '-'}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <div>{row.hn || '-'}</div>
                                                    <div className="font-mono text-xs text-slate-500">{row.seq_no || '-'}</div>
                                                </td>
                                                <td className="px-3 py-2">{row.patient_name || '-'}</td>
                                                <td className="px-3 py-2 text-right">{money(row.amount_claim)}</td>
                                                <td className="px-3 py-2 text-xs text-slate-600">{row.remark || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {repErrors.length > 100 && (
                                <div className="mt-2 text-xs text-slate-500">
                                    แสดง 100 จาก {repErrors.length.toLocaleString()} รายการ — เปิดรายละเอียดตามเลขที่นำเบิกเพื่อดูครบ
                                </div>
                            )}
                        </Panel>
                    </div>
                )}
            </QualityPage>
        </TooltipProvider>
    );
}
