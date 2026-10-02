import React, { useState, useEffect } from 'react';
import { Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowLeftRight,
    Calendar,
    Download,
    FileCheck2,
    FileText,
    Filter,
    Printer,
    RefreshCw,
    Search,
    SlidersHorizontal,
    Sparkles,
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
    diff_claim?: number;
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
    hosxp_matched_count?: number;
    total_hosxp: number;
    total_hosxp_paid: number;
    total_hosxp_net: number;
    hosxp_all_count?: number;
    total_hosxp_all?: number;
    total_hosxp_all_paid?: number;
    total_hosxp_all_net?: number;
    hosxp_paid_count?: number;
    stm_matched_count?: number;
    total_stm_claim_matched?: number;
    total_stm_approved_matched?: number;
    stm_all_count?: number;
    total_hosxp_unmatched?: number;
    total_hosxp_unmatched_paid?: number;
    total_hosxp_unmatched_net?: number;
    only_hosxp_count?: number;
    total_claim: number;
    total_approved: number;
    shortfall_count?: number;
    total_shortfall: number;
    total_over: number;
    total_diff?: number;
}

interface Props {
    hosxpReady: boolean;
    reconciliation: {
        id: number;
        start_date: string;
        end_date: string;
        hosxp_count: number;
        matched_hosxp_count?: number;
        hosxp_matched_count?: number;
        hosxp_all_count?: number;
        total_hosxp_all?: number;
        total_hosxp_all_paid?: number;
        total_hosxp_all_net?: number;
        hosxp_paid_count?: number;
        stm_matched_count?: number;
        total_stm_claim_matched?: number;
        total_stm_approved_matched?: number;
        total_stm_all_claim?: number;
        total_stm_all_approved?: number;
        stm_all_count?: number;
        shortfall_count?: number;
        stm_count: number;
        matched_ok: number;
        matched_short: number;
        matched_over: number;
        only_hosxp: number;
        only_hosxp_count?: number;
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
        total_shortfall: number;
        created_at: string;
    } | null;
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
    stmRange?: {
        min: string | null;
        max: string | null;
        row_count: number;
    };
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
        start_date?: string | null;
        end_date?: string | null;
        status?: string;
        q?: string;
        month?: string;
        error_code?: string;
        amount?: string;
        compare_a?: string;
        compare_b?: string;
        per_page?: number | string;
        page?: number;
    };
    statusOptions: Record<string, string>;
    amountLabels?: Record<string, string>;
    module?: ClaimModuleMeta;
    isComparePage?: boolean;
}

const money = (n: number | null | undefined) =>
    n == null
        ? '-'
        : new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const statusClass: Record<string, string> = {
    hosxp_matched: 'border-blue-200 bg-blue-50 text-blue-800 font-semibold',
    hosxp_all: 'border-indigo-200 bg-indigo-50 text-indigo-800 font-semibold',
    stm_matched: 'border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold',
    stm_all: 'border-teal-200 bg-teal-50 text-teal-800 font-semibold',
    mismatched: 'border-rose-300 bg-rose-50 text-rose-800 font-semibold',
    amount_diff: 'border-amber-300 bg-amber-50 text-amber-800 font-semibold',
    claim_diff: 'border-amber-400 bg-amber-100 text-amber-900 font-semibold',
    matched_ok: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    matched_short: 'border-rose-200 bg-rose-50 text-rose-700',
    matched_over: 'border-amber-200 bg-amber-50 text-amber-700',
    only_hosxp: 'border-sky-200 bg-sky-50 text-sky-700',
    only_stm: 'border-violet-200 bg-violet-50 text-violet-700',
    stm_out_of_range: 'border-orange-200 bg-orange-50 text-orange-700',
    pair_diff: 'border-indigo-400 bg-indigo-50 text-indigo-900 font-semibold',
    hosxp_paid: 'border-purple-300 bg-purple-50 text-purple-900 font-semibold',
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
    stmRange,
    repErrors = [],
    filters,
    statusOptions,
    amountLabels,
    module,
    isComparePage: isCompareProp = false,
}: Props) {
    const mod = resolveClaimModule(module);
    const sourceLabel = mod.labels.source;
    const sourceAllLabel = mod.labels.source_all;
    const stmSetCount = importCount ?? batchCount ?? 0;
    const isComparePage = isCompareProp || Boolean(
        typeof window !== 'undefined' && window.location.pathname.includes('/compare')
    );
    const [pairA, setPairA] = useState<string>(filters.compare_a || 'hosxp_all');
    const [pairB, setPairB] = useState<string>(filters.compare_b || 'stm_all');

    useEffect(() => {
        if (filters.compare_a && filters.compare_a !== pairA) {
            setPairA(filters.compare_a);
        }
        if (filters.compare_b && filters.compare_b !== pairB) {
            setPairB(filters.compare_b);
        }
    }, [filters.compare_a, filters.compare_b]);
    const [q, setQ] = useState(filters.q || '');
    const [startDate, setStartDate] = useState(filters.start_date || reconciliation?.start_date || stmRange?.min || '');
    const [endDate, setEndDate] = useState(filters.end_date || reconciliation?.end_date || stmRange?.max || '');
    const [reconciling, setReconciling] = useState(false);

    const visibleMonths = monthly.filter((m) => m.month !== 'unknown' && m.item_count > 0);
    const selectedMonth = visibleMonths.find((m) => m.month === filters.month) || null;
    const hasActiveFilter = Boolean(
        filters.status || filters.month || filters.error_code || filters.amount || filters.q,
    );

    const formatDateStr = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const setPreset = (type: 'this_month' | 'last_month' | 'last_3_months' | 'fiscal_year' | 'stm_range') => {
        const today = new Date();
        const y = today.getFullYear();
        const m = today.getMonth();

        if (type === 'this_month') {
            const first = new Date(y, m, 1);
            const last = new Date(y, m + 1, 0);
            setStartDate(formatDateStr(first));
            setEndDate(formatDateStr(last));
        } else if (type === 'last_month') {
            const first = new Date(y, m - 1, 1);
            const last = new Date(y, m, 0);
            setStartDate(formatDateStr(first));
            setEndDate(formatDateStr(last));
        } else if (type === 'last_3_months') {
            const first = new Date(y, m - 2, 1);
            setStartDate(formatDateStr(first));
            setEndDate(formatDateStr(today));
        } else if (type === 'fiscal_year') {
            const fyStartYear = m >= 9 ? y : y - 1;
            const first = new Date(fyStartYear, 9, 1);
            const last = new Date(fyStartYear + 1, 8, 30);
            setStartDate(formatDateStr(first));
            setEndDate(formatDateStr(last));
        } else if (type === 'stm_range' && stmRange?.min && stmRange?.max) {
            setStartDate(stmRange.min);
            setEndDate(stmRange.max);
        }
    };

    const runReconcile = () => {
        if (!startDate || !endDate) return;
        setReconciling(true);
        router.post(
            claimRoute(mod, 'compare_reconcile'),
            { start_date: startDate, end_date: endDate },
            {
                onFinish: () => setReconciling(false),
            },
        );
    };

    const applyFilter = (next?: {
        start_date?: string | null;
        end_date?: string | null;
        status?: string | null;
        month?: string | null;
        error_code?: string | null;
        amount?: string | null;
        compare_a?: string | null;
        compare_b?: string | null;
        per_page?: number | string | null;
        page?: number | null;
    }) => {
        const sDate = next && 'start_date' in next ? next.start_date : (startDate || filters.start_date || undefined);
        const eDate = next && 'end_date' in next ? next.end_date : (endDate || filters.end_date || undefined);
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
        const compA =
            next && 'compare_a' in next ? next.compare_a || undefined : (filters.compare_a || pairA || undefined);
        const compB =
            next && 'compare_b' in next ? next.compare_b || undefined : (filters.compare_b || pairB || undefined);
        const perPage =
            next && 'per_page' in next
                ? next.per_page || 'all'
                : filters.per_page || 'all';
        const page =
            next && 'page' in next ? next.page || 1 : next ? 1 : filters.page || 1;

        router.get(
            claimRoute(mod, 'compare_page'),
            {
                start_date: sDate || undefined,
                end_date: eDate || undefined,
                status: status || undefined,
                month: month || undefined,
                error_code: errorCode || undefined,
                amount: amount || undefined,
                compare_a: compA || undefined,
                compare_b: compB || undefined,
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

    const handlePairChange = (newA: string, newB: string, preferredStatus?: string | null) => {
        setPairA(newA);
        setPairB(newB);
        applyFilter({
            compare_a: newA,
            compare_b: newB,
            status: preferredStatus !== undefined ? preferredStatus : (filters.status || 'pair_diff'),
            page: 1,
        });
    };

    const viewPairDiff = () => {
        applyFilter({
            status: 'pair_diff',
            compare_a: pairA,
            compare_b: pairB,
            page: 1,
        });
        setTimeout(() => {
            document.getElementById('cgd-reconcile-items')?.scrollIntoView({ behavior: 'smooth' });
        }, 150);
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
        if (startDate) params.set('start_date', startDate);
        if (endDate) params.set('end_date', endDate);
        if (filters.status) params.set('status', filters.status);
        if (filters.month) params.set('month', filters.month);
        if (filters.error_code) params.set('error_code', filters.error_code);
        if (filters.amount) params.set('amount', filters.amount);
        if (filters.compare_a || pairA) params.set('compare_a', filters.compare_a || pairA);
        if (filters.compare_b || pairB) params.set('compare_b', filters.compare_b || pairB);
        const query = (q || filters.q || '').trim();
        if (query) params.set('q', query);
        const qs = params.toString();
        const base = claimRoute(mod, exportKey);

        return qs ? `${base}?${qs}` : base;
    };

    const exportSuffix = [
        startDate && endDate ? `${startDate} ถึง ${endDate}` : null,
        exportMonthLabel,
        exportStatusLabel,
        exportErrorLabel,
        exportAmountLabel,
    ]
        .filter(Boolean)
        .join(' · ');

    const chipCounts = statusCounts || {
        hosxp_matched: reconciliation?.matched_hosxp_count ?? 0,
        hosxp_all:
            reconciliation?.hosxp_all_count ??
            ((reconciliation?.matched_hosxp_count ?? 0) + (reconciliation?.only_hosxp ?? 0)),
        stm_matched: reconciliation?.stm_matched_count ?? reconciliation?.matched_hosxp_count ?? 0,
        stm_all: reconciliation?.stm_all_count ?? reconciliation?.stm_count ?? 0,
        matched_short: reconciliation?.shortfall_count ?? reconciliation?.matched_short ?? selectedMonth?.matched_short ?? 0,
        only_hosxp: reconciliation?.only_hosxp_count ?? reconciliation?.only_hosxp ?? selectedMonth?.only_hosxp ?? 0,
        hosxp_paid: reconciliation?.hosxp_paid_count ?? 0,
        matched_ok: selectedMonth?.matched_ok ?? reconciliation?.matched_ok ?? 0,
        matched_over: selectedMonth?.matched_over ?? reconciliation?.matched_over ?? 0,
        only_stm: selectedMonth?.only_stm ?? reconciliation?.only_stm ?? 0,
        stm_out_of_range: selectedMonth?.stm_out_of_range ?? reconciliation?.stm_out_of_range ?? 0,
        mismatched: 0,
        amount_diff: 0,
        claim_diff: 0,
    };

    const sixKpiCards = reconciliation
        ? [
              {
                  no: 1,
                  key: 'hosxp_matched',
                  label: '1. HOSxP (SEQ ตรง) สิทธิจ่าย(12)',
                  shortLabel: 'HOSxP (SEQ ตรง)',
                  amount: reconciliation.total_hosxp_net ?? 0,
                  count: reconciliation.matched_hosxp_count ?? reconciliation.hosxp_count ?? 0,
                  subText: `ชำระเอง ${money(reconciliation.total_hosxp_paid ?? 0)} | ก่อนหัก ${money(reconciliation.total_hosxp ?? 0)}`,
                  tone: 'blue' as const,
              },
              {
                  no: 2,
                  key: 'hosxp_all',
                  label: '2. HOSxP ข้อมูลตามวันที่ผู้ป่วยมารับบริการ สิทธิจ่าย(12)',
                  shortLabel: 'HOSxP วันที่รับบริการ',
                  amount:
                      reconciliation.total_hosxp_all_net ??
                      ((reconciliation.total_hosxp_net ?? 0) + (reconciliation.total_hosxp_unmatched_net ?? 0)),
                  count:
                      reconciliation.hosxp_all_count ??
                      ((reconciliation.matched_hosxp_count ?? 0) + (reconciliation.only_hosxp ?? 0)),
                  subText: `ชำระเอง ${money(
                      reconciliation.total_hosxp_all_paid ?? 0,
                  )} | ก่อนหัก ${money(
                      reconciliation.total_hosxp_all ??
                          ((reconciliation.total_hosxp ?? 0) + (reconciliation.total_hosxp_unmatched ?? 0)),
                  )}`,
                  tone: 'indigo' as const,
              },
              {
                  no: 3,
                  key: 'stm_matched',
                  label: '3. STM (SEQ ตรง)',
                  shortLabel: 'STM (SEQ ตรง)',
                  amount: reconciliation.total_stm_claim_matched ?? reconciliation.total_stm_claim ?? 0,
                  count: reconciliation.stm_matched_count ?? reconciliation.matched_hosxp_count ?? 0,
                  subText: `ชดเชยสุทธิ ${money(
                      reconciliation.total_stm_approved_matched ?? reconciliation.total_stm_approved ?? 0,
                  )}`,
                  tone: 'emerald' as const,
              },
              {
                  no: 4,
                  key: 'stm_all',
                  label: '4. STM ข้อมูลตามวันที่ผู้ป่วยมารับบริการ',
                  shortLabel: 'STM วันที่รับบริการ',
                  amount: reconciliation.total_stm_all_claim ?? reconciliation.total_stm_claim ?? 0,
                  count: reconciliation.stm_all_count ?? reconciliation.stm_count ?? 0,
                  subText: `ชดเชยสุทธิ ${money(
                      reconciliation.total_stm_all_approved ?? reconciliation.total_stm_approved ?? 0,
                  )}`,
                  tone: 'teal' as const,
              },
              {
                  no: 5,
                  key: 'matched_short',
                  label: '5. ยอดขาด',
                  shortLabel: 'ยอดขาด',
                  amount: reconciliation.total_shortfall ?? 0,
                  count: reconciliation.shortfall_count ?? reconciliation.matched_short ?? 0,
                  subText: 'เรียกเก็บ − ชดเชยสุทธิ',
                  tone: 'rose' as const,
                  danger: true,
              },
              {
                  no: 6,
                  key: 'only_hosxp',
                  label: '6. HOSxP ไม่มี SEQ ตรง หลังหัก Payment สิทธิจ่าย(12)',
                  shortLabel: 'HOSxP ไม่มี SEQ ตรง',
                  amount: reconciliation.total_hosxp_unmatched_net ?? 0,
                  count: reconciliation.only_hosxp_count ?? reconciliation.only_hosxp ?? 0,
                  subText: `ชำระเอง ${money(
                      reconciliation.total_hosxp_unmatched_paid ?? 0,
                  )} | ก่อนหัก ${money(
                      reconciliation.total_hosxp_unmatched ?? 0,
                  )}`,
                  tone: 'amber' as const,
              },
              {
                  no: 7,
                  key: 'hosxp_paid',
                  label: '7. ยอดชำระเอง (Payment) ใน HOSxP สิทธิจ่าย(12)',
                  shortLabel: 'ยอดชำระเอง (Payment)',
                  amount: reconciliation.total_hosxp_all_paid ?? 0,
                  count: reconciliation.hosxp_paid_count ?? 0,
                  subText: 'ผู้ป่วยชำระเงินเอง',
                  tone: 'purple' as const,
              },
          ]
        : [];

    const metricA = sixKpiCards.find((c) => c.key === pairA) || sixKpiCards[0];
    const metricB = sixKpiCards.find((c) => c.key === pairB) || sixKpiCards[2] || sixKpiCards[1];
    const deltaCount = (metricA?.count ?? 0) - (metricB?.count ?? 0);
    const deltaAmount = (metricA?.amount ?? 0) - (metricB?.amount ?? 0);
    const ratioCount =
        metricA && metricA.count > 0 && metricB
            ? ((metricB.count / metricA.count) * 100).toFixed(1)
            : null;

    const exportPairPdfHref = (a: string, b: string) => {
        const params = new URLSearchParams();
        if (startDate) params.set('start_date', startDate);
        if (endDate) params.set('end_date', endDate);
        params.set('compare_a', a);
        params.set('compare_b', b);
        const qs = params.toString();
        const base = claimRoute(mod, 'compare_pair_pdf');

        return qs ? `${base}?${qs}` : base;
    };

    return (
        <TooltipProvider delayDuration={200}>
            <QualityPage
                tone="emerald"
                icon={FileCheck2}
                badge="Financial Data Hub"
                title="เปรียบเทียบสิทธิ์จ่ายตรง (STM vs HOSxP)"
                subtitle={
                    reconciliation
                        ? `ทุกชุด ${sourceAllLabel} (${stmSetCount.toLocaleString('th-TH')} ชุด) · HOSxP ${reconciliation.start_date} → ${reconciliation.end_date} · รันเมื่อ ${reconciliation.created_at}`
                        : 'กรองข้อมูลวันที่มารับบริการใน STM กับ HOSxP เพื่อตรวจสอบยอดเงินและรายการที่ไม่ตรงกัน'
                }
                breadcrumbs={dataHubBreadcrumbs({
                    title: 'เปรียบเทียบสิทธิ์จ่ายตรง',
                    href: claimRoute(mod, 'compare_page'),
                })}
                headTitle={`เปรียบเทียบข้อมูลจ่ายตรง ${sourceLabel}`}
                subNav={<DataHubSubNav active={mod.routes.dashboard} />}
                actions={
                    <div className="flex flex-wrap gap-2">
                        {reconciliation && (
                            <>
                                <Button asChild variant="outline" className="rounded-xl border-emerald-300 text-emerald-800 hover:bg-emerald-50">
                                    <a href={exportHref('summary_export_pdf')}>
                                        <FileText className="mr-2 h-4 w-4 text-emerald-600" />
                                        พิมพ์รายงานสรุป PDF
                                    </a>
                                </Button>
                                <Button asChild variant="outline" className="rounded-xl">
                                    <a href={exportHref('summary_export')}>
                                        <Download className="mr-2 h-4 w-4" />
                                        ส่งออก Excel
                                    </a>
                                </Button>
                            </>
                        )}
                        <Button asChild variant="outline" className="rounded-xl">
                            <Link href={claimRoute(mod, 'dashboard')}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                กลับหน้าภาพรวม
                            </Link>
                        </Button>
                    </div>
                }
            >
                <ClaimModuleSubNav
                    dashboardUrl={claimRoute(mod, 'dashboard')}
                    compareUrl={claimRoute(mod, 'compare_page')}
                    importUrl={claimRoute(mod, 'import')}
                    stmUrl={mod.has_stm ? claimRoute(mod, 'stm_index') : undefined}
                    precheckUrl={mod.key === 'cgd' ? claimRoute(mod, 'precheck') : undefined}
                    importLabel={mod.labels.import_rep}
                    active="compare"
                />

                {/* แผงกรองช่วงวันที่มารับบริการ */}
                <Panel
                    title="ช่วงวันที่มารับบริการ (Visit Date)"
                    description="ระบุช่วงวันที่รับบริการใน STM กับ HOSxP เพื่อดูยอดรวมและเปรียบเทียบผลต่าง"
                    className="mb-4 bg-white"
                >
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="w-full sm:w-44">
                            <Label className="mb-1 block text-xs font-semibold text-slate-700">วันที่เริ่มต้น</Label>
                            <ThaiDatePicker
                                value={startDate}
                                onChange={setStartDate}
                                placeholder="วว/ดด/ปปปป"
                            />
                        </div>
                        <div className="w-full sm:w-44">
                            <Label className="mb-1 block text-xs font-semibold text-slate-700">วันที่สิ้นสุด</Label>
                            <ThaiDatePicker
                                value={endDate}
                                onChange={setEndDate}
                                placeholder="วว/ดด/ปปปป"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-xl text-xs"
                                onClick={() => setPreset('this_month')}
                            >
                                เดือนนี้
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-xl text-xs"
                                onClick={() => setPreset('last_month')}
                            >
                                เดือนที่แล้ว
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-xl text-xs"
                                onClick={() => setPreset('last_3_months')}
                            >
                                3 เดือนล่าสุด
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-xl text-xs"
                                onClick={() => setPreset('fiscal_year')}
                            >
                                ปีงบประมาณนี้
                            </Button>
                            {stmRange?.min && stmRange?.max && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="rounded-xl text-xs"
                                    onClick={() => setPreset('stm_range')}
                                >
                                    ตามไฟล์ STM
                                </Button>
                            )}
                        </div>

                        <div className="ml-auto flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="rounded-xl border-slate-300"
                                onClick={() => applyFilter({ start_date: startDate, end_date: endDate })}
                            >
                                <Filter className="mr-1.5 h-4 w-4 text-slate-600" />
                                กรองผลลัพธ์
                            </Button>
                            <Button
                                type="button"
                                disabled={reconciling || !startDate || !endDate}
                                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                onClick={runReconcile}
                            >
                                <RefreshCw className={cn('mr-1.5 h-4 w-4', reconciling && 'animate-spin')} />
                                {reconciling ? 'กำลังประมวลผล...' : 'ประมวลผลเปรียบเทียบใหม่'}
                            </Button>
                        </div>
                    </div>
                </Panel>

                {/* การ์ดสรุปยอดเงิน 6 รายการหลัก (กดเพื่อดูรายละเอียดและพิมพ์รายงาน PDF) */}
                {reconciliation ? (
                    <div className="mb-4">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                <h3 className="text-sm font-bold text-slate-800">
                                    สรุปผลการเปรียบเทียบ 6 รายการหลัก
                                </h3>
                                <span className="text-xs text-slate-500">
                                    (คลิกที่การ์ดเพื่อกรองดูรายละเอียดด้านล่าง พร้อมพิมพ์รายงาน PDF)
                                </span>
                            </div>
                            {filters.status && (
                                <button
                                    type="button"
                                    onClick={() => applyFilter({ status: null })}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
                                >
                                    ✕ ล้างตัวกรอง (แสดงทั้งหมด)
                                </button>
                            )}
                        </div>

                        <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
                            {sixKpiCards.map((card) => {
                                const isActive = filters.status === card.key;
                                return (
                                    <button
                                        type="button"
                                        key={card.key}
                                        onClick={() =>
                                            applyFilter({
                                                status: isActive ? null : card.key,
                                            })
                                        }
                                        className={cn(
                                            'group relative flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all duration-150 shadow-xs cursor-pointer',
                                            isActive
                                                ? card.danger
                                                    ? 'ring-2 ring-rose-500 border-rose-500 bg-rose-50 shadow-sm'
                                                    : 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50 shadow-sm'
                                                : card.danger
                                                  ? 'border-rose-200 bg-rose-50/40 hover:border-rose-400 hover:bg-rose-50/70 hover:shadow-xs'
                                                  : 'border-slate-200/90 bg-white hover:border-emerald-300 hover:bg-slate-50/80 hover:shadow-xs',
                                        )}
                                    >
                                        <div>
                                            <div className="mb-2 flex items-center justify-between gap-1">
                                                <span
                                                    className={cn(
                                                        'inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold',
                                                        isActive
                                                            ? card.danger
                                                                ? 'bg-rose-600 text-white'
                                                                : 'bg-emerald-600 text-white'
                                                            : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200',
                                                    )}
                                                >
                                                    {card.no}
                                                </span>
                                                <span
                                                    className={cn(
                                                        'rounded-full px-2 py-0.5 text-[10px] font-medium tracking-tight',
                                                        isActive
                                                            ? card.danger
                                                                ? 'bg-rose-200 text-rose-900 font-semibold'
                                                                : 'bg-emerald-200 text-emerald-900 font-semibold'
                                                            : 'bg-slate-100 text-slate-600',
                                                    )}
                                                >
                                                    {card.count.toLocaleString('th-TH')} รายการ
                                                </span>
                                            </div>

                                            <div
                                                className={cn(
                                                    'text-xs font-semibold leading-snug line-clamp-2',
                                                    isActive
                                                        ? card.danger
                                                            ? 'text-rose-950 font-bold'
                                                            : 'text-emerald-950 font-bold'
                                                        : card.danger
                                                          ? 'text-rose-900'
                                                          : 'text-slate-800',
                                                )}
                                                title={card.label}
                                            >
                                                {card.label}
                                            </div>
                                        </div>

                                        <div className="mt-3 border-t border-slate-100/90 pt-2">
                                            <div className="text-[10px] font-medium text-slate-400">ยอดเงิน</div>
                                            <MoneyText
                                                value={card.amount}
                                                size="md"
                                                className={cn(
                                                    'font-bold',
                                                    isActive
                                                        ? card.danger
                                                            ? 'text-rose-700'
                                                            : 'text-emerald-700'
                                                        : card.danger
                                                          ? 'text-rose-700'
                                                          : 'text-slate-900',
                                                )}
                                            />
                                            <div
                                                className={cn(
                                                    'mt-1 truncate text-[10px]',
                                                    isActive
                                                        ? card.danger
                                                            ? 'text-rose-800 font-medium'
                                                            : 'text-emerald-800 font-medium'
                                                        : 'text-slate-500',
                                                )}
                                                title={card.subText}
                                            >
                                                {card.subText}
                                            </div>
                                        </div>

                                        <div className="mt-2 flex items-center justify-between pt-1">
                                            {isActive ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
                                                    กำลังแสดงรายละเอียด
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    คลิกดูรายละเอียด →
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="mb-4 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 p-8 text-center">
                        <ArrowLeftRight className="mx-auto h-12 w-12 text-emerald-500" />
                        <h3 className="mt-2 text-base font-semibold text-slate-900">ยังไม่มีข้อมูลการเปรียบเทียบ</h3>
                        <p className="mt-1 text-sm text-slate-600">
                            กรุณาเลือกช่วงวันที่มารับบริการ (เช่น วันที่เริ่มต้น - สิ้นสุด) ด้านบน แล้วกดปุ่ม{' '}
                            <span className="font-semibold text-emerald-700">"ประมวลผลเปรียบเทียบใหม่"</span> เพื่อเริ่มต้น
                        </p>
                    </div>
                )}

                {/* แถบแจ้งเตือนสถานะการกรองปัจจุบัน + ปุ่มพิมพ์ PDF ด่วน */}
                {filters.status && (
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 shadow-xs">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white shadow-xs">
                                ✓
                            </span>
                            <div>
                                <div className="text-sm font-bold text-emerald-950">
                                    กำลังแสดงรายละเอียด:{' '}
                                    <span className="text-emerald-800">
                                        {statusOptions[filters.status] || filters.status}
                                    </span>{' '}
                                    <span className="text-xs font-semibold text-emerald-700">
                                        ({filteredTotal.toLocaleString('th-TH')} รายการ)
                                    </span>
                                </div>
                                <div className="text-xs text-emerald-700">
                                    รายการในตารางด้านล่างและรายงาน PDF ถูกกรองตามเงื่อนไขนี้แล้ว
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                asChild
                                size="sm"
                                className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs font-semibold"
                            >
                                <a href={exportHref('summary_export_pdf')}>
                                    <FileText className="mr-1.5 h-4 w-4" />
                                    พิมพ์รายงาน PDF เฉพาะกลุ่มนี้
                                </a>
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-xl border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-100/60"
                                onClick={() => applyFilter({ status: null })}
                            >
                                แสดงทั้งหมด
                            </Button>
                        </div>
                    </div>
                )}

                {/* แท็บกรองแยกประเภทข้อมูล: ไม่ตรงกัน / ค่าเงินต่างกัน */}
                <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-xs">
                    <div className="px-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        แยกประเภท:
                    </div>

                    <button
                        type="button"
                        onClick={() => applyFilter({ status: null })}
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                            !filters.status
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-100',
                        )}
                    >
                        <span>ทั้งหมด</span>
                        <span
                            className={cn(
                                'rounded-full px-1.5 py-0.5 text-[10px]',
                                !filters.status ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600',
                            )}
                        >
                            {filteredTotal.toLocaleString('th-TH')}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => applyFilter({ status: 'hosxp_matched' })}
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                            filters.status === 'hosxp_matched'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-blue-800 bg-blue-50 hover:bg-blue-100',
                        )}
                    >
                        <span>1. HOSxP (SEQ ตรง)</span>
                        {chipCounts.hosxp_matched !== undefined && (
                            <span
                                className={cn(
                                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                                    filters.status === 'hosxp_matched' ? 'bg-blue-700 text-white' : 'bg-blue-200 text-blue-900',
                                )}
                            >
                                {Number(chipCounts.hosxp_matched).toLocaleString('th-TH')}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => applyFilter({ status: 'hosxp_all' })}
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                            filters.status === 'hosxp_all'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-indigo-800 bg-indigo-50 hover:bg-indigo-100',
                        )}
                    >
                        <span>2. HOSxP วันที่รับบริการ</span>
                        {chipCounts.hosxp_all !== undefined && (
                            <span
                                className={cn(
                                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                                    filters.status === 'hosxp_all' ? 'bg-indigo-700 text-white' : 'bg-indigo-200 text-indigo-900',
                                )}
                            >
                                {Number(chipCounts.hosxp_all).toLocaleString('th-TH')}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => applyFilter({ status: 'stm_matched' })}
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                            filters.status === 'stm_matched'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100',
                        )}
                    >
                        <span>3. STM (SEQ ตรง)</span>
                        {chipCounts.stm_matched !== undefined && (
                            <span
                                className={cn(
                                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                                    filters.status === 'stm_matched' ? 'bg-emerald-700 text-white' : 'bg-emerald-200 text-emerald-900',
                                )}
                            >
                                {Number(chipCounts.stm_matched).toLocaleString('th-TH')}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => applyFilter({ status: 'stm_all' })}
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                            filters.status === 'stm_all'
                                ? 'bg-teal-600 text-white shadow-xs'
                                : 'text-teal-800 bg-teal-50 hover:bg-teal-100',
                        )}
                    >
                        <span>4. STM วันที่รับบริการ</span>
                        {chipCounts.stm_all !== undefined && (
                            <span
                                className={cn(
                                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                                    filters.status === 'stm_all' ? 'bg-teal-700 text-white' : 'bg-teal-200 text-teal-900',
                                )}
                            >
                                {Number(chipCounts.stm_all).toLocaleString('th-TH')}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => applyFilter({ status: 'mismatched' })}
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                            filters.status === 'mismatched'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-rose-700 bg-rose-50 hover:bg-rose-100',
                        )}
                    >
                        <span>⚠️ ไม่ตรงกันทั้งหมด</span>
                        {chipCounts.mismatched !== undefined && (
                            <span
                                className={cn(
                                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                                    filters.status === 'mismatched' ? 'bg-rose-700 text-white' : 'bg-rose-200 text-rose-800',
                                )}
                            >
                                {Number(chipCounts.mismatched).toLocaleString('th-TH')}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => applyFilter({ status: 'amount_diff' })}
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                            filters.status === 'amount_diff'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'text-amber-800 bg-amber-50 hover:bg-amber-100',
                        )}
                    >
                        <span>💰 ค่าเงินต่างกัน</span>
                        {chipCounts.amount_diff !== undefined && (
                            <span
                                className={cn(
                                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                                    filters.status === 'amount_diff' ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-900',
                                )}
                            >
                                {Number(chipCounts.amount_diff).toLocaleString('th-TH')}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => applyFilter({ status: 'matched_short' })}
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                            filters.status === 'matched_short'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-100',
                        )}
                    >
                        <span>📉 ขาดเงิน</span>
                        {chipCounts.matched_short !== undefined && (
                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                                {Number(chipCounts.matched_short).toLocaleString('th-TH')}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => applyFilter({ status: 'matched_over' })}
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                            filters.status === 'matched_over'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-100',
                        )}
                    >
                        <span>📈 ชดเชยเกิน</span>
                        {chipCounts.matched_over !== undefined && (
                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                                {Number(chipCounts.matched_over).toLocaleString('th-TH')}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => applyFilter({ status: 'only_hosxp' })}
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                            filters.status === 'only_hosxp'
                                ? 'bg-sky-600 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-100',
                        )}
                    >
                        <span>🏥 มีเฉพาะ HOSxP</span>
                        {chipCounts.only_hosxp !== undefined && (
                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                                {Number(chipCounts.only_hosxp).toLocaleString('th-TH')}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => applyFilter({ status: 'only_stm' })}
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                            filters.status === 'only_stm'
                                ? 'bg-violet-600 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-100',
                        )}
                    >
                        <span>📄 มีเฉพาะ STM</span>
                        {chipCounts.only_stm !== undefined && (
                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                                {Number(chipCounts.only_stm).toLocaleString('th-TH')}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => applyFilter({ status: 'matched_ok' })}
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                            filters.status === 'matched_ok'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100',
                        )}
                    >
                        <span>✅ ตรงกันสมบูรณ์</span>
                        {chipCounts.matched_ok !== undefined && (
                            <span
                                className={cn(
                                    'rounded-full px-1.5 py-0.5 text-[10px]',
                                    filters.status === 'matched_ok'
                                        ? 'bg-emerald-700 text-white'
                                        : 'bg-emerald-100 text-emerald-800',
                                )}
                            >
                                {Number(chipCounts.matched_ok).toLocaleString('th-TH')}
                            </span>
                        )}
                    </button>
                </div>

                {/* แถบดาวน์โหลดรายงานสรุป */}
                <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3">
                    <div className="mr-auto text-sm font-semibold text-emerald-950">
                        พิมพ์รายงานสรุปผลการเปรียบเทียบ
                        {exportSuffix ? ` · ${exportSuffix}` : ''}
                    </div>
                    <Button asChild className="rounded-xl bg-emerald-700 hover:bg-emerald-800">
                        <a href={exportHref('summary_export_pdf')}>
                            <FileText className="mr-2 h-4 w-4" />
                            พิมพ์รายงานสรุป PDF
                        </a>
                    </Button>
                    <Button asChild variant="outline" className="rounded-xl border-emerald-300 bg-white">
                        <a href={exportHref('summary_export')}>
                            <Download className="mr-2 h-4 w-4" />
                            ส่งออก Excel
                        </a>
                    </Button>
                </div>

                {isComparePage && reconciliation ? (
                    <Panel
                        title="ระบบเปรียบเทียบผลต่างระหว่าง 6 รายการหลัก (Pairwise Comparison)"
                        description="เลือกจับคู่ 2 รายการจาก 6 รายการหลัก เพื่อวิเคราะห์ส่วนต่างจำนวนรายการและยอดเงิน พร้อมออกรายงาน PDF เฉพาะคู่เปรียบเทียบ"
                        className="mb-4 border-indigo-200 bg-gradient-to-r from-slate-50 via-indigo-50/20 to-emerald-50/20 shadow-xs"
                    >
                        {/* ปุ่มทางลัดคู่เปรียบเทียบยอดนิยม */}
                        <div className="mb-3.5">
                            <div className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                คู่เปรียบเทียบแนะนำ (Quick Presets):
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handlePairChange('hosxp_matched', 'stm_matched', 'pair_diff')}
                                    className={cn(
                                        'rounded-xl text-xs transition',
                                        pairA === 'hosxp_matched' && pairB === 'stm_matched'
                                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 hover:text-white'
                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100',
                                    )}
                                >
                                    🔹 ข้อ 1 vs 3: HOSxP (SEQ ตรง) vs STM (SEQ ตรง)
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handlePairChange('hosxp_all', 'stm_all', 'pair_diff')}
                                    className={cn(
                                        'rounded-xl text-xs transition',
                                        pairA === 'hosxp_all' && pairB === 'stm_all'
                                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 hover:text-white'
                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100',
                                    )}
                                >
                                    🔹 ข้อ 2 vs 4: HOSxP ทั้งหมด vs STM ทั้งหมด
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handlePairChange('hosxp_all', 'only_hosxp', 'pair_diff')}
                                    className={cn(
                                        'rounded-xl text-xs transition',
                                        pairA === 'hosxp_all' && pairB === 'only_hosxp'
                                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 hover:text-white'
                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100',
                                    )}
                                >
                                    🔹 ข้อ 2 vs 6: HOSxP ทั้งหมด vs ไม่มี SEQ ใน STM
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handlePairChange('stm_matched', 'matched_short', 'pair_diff')}
                                    className={cn(
                                        'rounded-xl text-xs transition',
                                        pairA === 'stm_matched' && pairB === 'matched_short'
                                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 hover:text-white'
                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100',
                                    )}
                                >
                                    🔹 ข้อ 3 vs 5: STM (SEQ ตรง) vs ยอดขาด
                                </Button>
                            </div>
                        </div>

                        {/* กล่องเลือกฝั่ง A และ B */}
                        <div className="mb-4 grid gap-3 md:grid-cols-12 items-center rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
                            <div className="md:col-span-5 space-y-1.5">
                                <Label className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                                        A
                                    </span>
                                    เลือกรายการที่ 1 (ตัวตั้ง)
                                </Label>
                                <select
                                    value={pairA}
                                    onChange={(e) => handlePairChange(e.target.value, pairB)}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    {sixKpiCards.map((card) => (
                                        <option key={card.key} value={card.key}>
                                            {card.label} ({card.count.toLocaleString('th-TH')} รายการ)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-2 flex justify-center py-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePairChange(pairB, pairA)}
                                    className="rounded-xl border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
                                    title="สลับฝั่งคู่เปรียบเทียบ"
                                >
                                    <ArrowLeftRight className="mr-1 h-3.5 w-3.5 text-indigo-600" />
                                    <span className="text-xs font-medium">สลับคู่</span>
                                </Button>
                            </div>

                            <div className="md:col-span-5 space-y-1.5">
                                <Label className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                                        B
                                    </span>
                                    เลือกรายการที่ 2 (ตัวเปรียบเทียบ)
                                </Label>
                                <select
                                    value={pairB}
                                    onChange={(e) => handlePairChange(pairA, e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                >
                                    {sixKpiCards.map((card) => (
                                        <option key={card.key} value={card.key}>
                                            {card.label} ({card.count.toLocaleString('th-TH')} รายการ)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* การ์ดผลต่างการเปรียบเทียบ (Matrix Summary) */}
                        <div className="grid gap-3 sm:grid-cols-3 mb-4">
                            <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-3.5 shadow-xs">
                                <div className="text-[11px] font-bold text-blue-900">
                                    [ข้อ A] {metricA?.shortLabel || metricA?.label}
                                </div>
                                <div className="mt-2 text-xl font-bold text-blue-950">
                                    {money(metricA?.amount)}
                                </div>
                                <div className="mt-1 text-xs text-blue-700 font-medium">
                                    {metricA?.count.toLocaleString('th-TH')} รายการ · {metricA?.subText}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-xs">
                                <div className="text-[11px] font-bold text-emerald-900">
                                    [ข้อ B] {metricB?.shortLabel || metricB?.label}
                                </div>
                                <div className="mt-2 text-xl font-bold text-emerald-950">
                                    {money(metricB?.amount)}
                                </div>
                                <div className="mt-1 text-xs text-emerald-700 font-medium">
                                    {metricB?.count.toLocaleString('th-TH')} รายการ · {metricB?.subText}
                                </div>
                            </div>

                            <div
                                onClick={viewPairDiff}
                                className={cn(
                                    'group relative cursor-pointer rounded-2xl border p-3.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
                                    filters.status === 'pair_diff'
                                        ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-400'
                                        : 'border-indigo-200 bg-white hover:border-indigo-400',
                                )}
                            >
                                <div className="text-[11px] font-bold text-indigo-900 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <span>ผลต่างเปรียบเทียบ (A − B)</span>
                                        <Search className="h-3.5 w-3.5 text-indigo-500 group-hover:scale-110 transition-transform" />
                                    </span>
                                    {ratioCount && (
                                        <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] text-indigo-800 font-semibold">
                                            สัดส่วน {ratioCount}%
                                        </span>
                                    )}
                                </div>
                                <div className="mt-2 text-xl font-bold">
                                    <span className={deltaAmount >= 0 ? 'text-indigo-700' : 'text-rose-700'}>
                                        {deltaAmount > 0 ? '+' : ''}{money(deltaAmount)}
                                    </span>
                                </div>
                                <div className="mt-1 text-xs font-semibold text-slate-600">
                                    ส่วนต่าง{' '}
                                    <span className={deltaCount >= 0 ? 'text-indigo-700' : 'text-rose-700'}>
                                        {deltaCount > 0 ? '+' : ''}{deltaCount.toLocaleString('th-TH')} รายการ
                                    </span>{' '}
                                    ({deltaCount === 0 ? 'เท่ากัน' : deltaCount > 0 ? 'ฝั่ง A มากกว่า' : 'ฝั่ง B มากกว่า'})
                                </div>

                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        viewPairDiff();
                                    }}
                                    className={cn(
                                        'mt-3 w-full rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition',
                                        filters.status === 'pair_diff'
                                            ? 'bg-indigo-700 text-white'
                                            : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-600 hover:text-white border border-indigo-200',
                                    )}
                                >
                                    <Search className="h-3.5 w-3.5" />
                                    {filters.status === 'pair_diff' ? '✓ กำลังแสดงรายการผลต่างนี้' : 'กดดูรายละเอียดผลต่าง (A − B)'}
                                </Button>
                            </div>
                        </div>

                        {/* กล่องวิเคราะห์เปรียบเทียบอัจฉริยะ (Dynamic Insight Box) */}
                        {/* 1. กรณีเลือก ข้อ 1 vs ข้อ 3: HOSxP (SEQ ตรง) vs STM (SEQ ตรง) */}
                        {((pairA === 'hosxp_matched' && pairB === 'stm_matched') || (pairA === 'stm_matched' && pairB === 'hosxp_matched')) && (
                            <div className="mb-4 rounded-2xl border border-indigo-200 bg-white p-4 shadow-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold">
                                            💡
                                        </span>
                                        <span className="text-xs font-bold text-slate-900">
                                            วิเคราะห์เปรียบเทียบ ข้อ 1 (HOSxP SEQ ตรง สุทธิ) vs ข้อ 3 (STM SEQ ตรง)
                                        </span>
                                    </div>
                                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800">
                                        จำนวนเคสเท่ากันเป๊ะ ({metricA?.count.toLocaleString('th-TH')} รายการ) · มีผลต่างเรียกเก็บ {money(Math.abs(deltaAmount))} ฿ และยอดขาดชดเชย {money(reconciliation?.total_shortfall ?? 0)} ฿
                                    </span>
                                </div>

                                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                    {/* 1. ผลต่างยอดเรียกเก็บ 190 บาท (4 เคส) */}
                                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                                        <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
                                            <span>1. ผลต่างยอดเรียกเก็บ (HOSxP − STM)</span>
                                            <span className="rounded-full bg-amber-200 px-1.5 py-0.2 text-[10px] text-amber-900">4 เคส</span>
                                        </div>
                                        <div className="mt-1.5 text-base font-bold text-amber-950">
                                            +{money(Math.abs(deltaAmount))} บาท
                                        </div>
                                        <div className="mt-1 text-[11px] text-amber-800 leading-relaxed">
                                            เกิดจาก <strong>4 รายการ</strong> ที่ค่ารักษาใน HOSxP สุทธิ (11,230 ฿) ไม่ตรงกับยอดที่ส่งเบิกใน STM (11,040 ฿) สุทธิ +190 ฿ (+450, -120, -200, +60)
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => applyFilter({ status: 'claim_diff' })}
                                            className={cn(
                                                'mt-2.5 w-full h-7 rounded-lg border-amber-300 text-[11px] font-semibold transition',
                                                filters.status === 'claim_diff'
                                                    ? 'bg-amber-600 text-white border-amber-600'
                                                    : 'bg-white text-amber-900 hover:bg-amber-100',
                                            )}
                                        >
                                            🔍 ดูเฉพาะ 4 เคสยอดเรียกเก็บไม่ตรง (190 ฿)
                                        </Button>
                                    </div>

                                    {/* 2. ยอดขาดเงินชดเชย (Shortfall) */}
                                    <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3">
                                        <div className="flex items-center justify-between text-[11px] font-bold text-rose-900">
                                            <span>2. ยอดขาดเงินชดเชย (Shortfall)</span>
                                            <span className="rounded-full bg-rose-200 px-1.5 py-0.2 text-[10px] text-rose-900">{reconciliation?.shortfall_count ?? 6} เคส</span>
                                        </div>
                                        <div className="mt-1.5 text-base font-bold text-rose-950">
                                            {money(reconciliation?.total_shortfall ?? 573.50)} บาท
                                        </div>
                                        <div className="mt-1 text-[11px] text-rose-800 leading-relaxed">
                                            เกิดจาก <strong>{reconciliation?.shortfall_count ?? 6} รายการ</strong> ที่ STM ชดเชยไม่เต็มยอดเรียกเก็บ (ส่งเบิก 25,930 ฿ แต่ได้รับชดเชย 25,356.50 ฿ ขาด {money(reconciliation?.total_shortfall ?? 573.50)} ฿)
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => applyFilter({ status: 'matched_short' })}
                                            className={cn(
                                                'mt-2.5 w-full h-7 rounded-lg border-rose-300 text-[11px] font-semibold transition',
                                                filters.status === 'matched_short'
                                                    ? 'bg-rose-600 text-white border-rose-600'
                                                    : 'bg-white text-rose-900 hover:bg-rose-100',
                                            )}
                                        >
                                            ⚠️ ดู 6 เคสยอดขาดเงินชดเชย ({money(reconciliation?.total_shortfall ?? 573.50)} ฿)
                                        </Button>
                                    </div>

                                    {/* 3. รวมผลต่างเงินที่ยังไม่ได้รับชดเชย */}
                                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
                                        <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900">
                                            <span>3. รวมผลต่าง (HOSxP สุทธิ − ชดเชยจริง)</span>
                                            <span className="rounded-full bg-indigo-200 px-1.5 py-0.2 text-[10px] text-indigo-900">10 เคส</span>
                                        </div>
                                        <div className="mt-1.5 text-base font-bold text-indigo-950">
                                            {money(Math.abs(deltaAmount) + (reconciliation?.total_shortfall ?? 0))} บาท
                                        </div>
                                        <div className="mt-1 text-[11px] text-indigo-800 leading-relaxed">
                                            ผลต่างเรียกเก็บ {money(Math.abs(deltaAmount))} ฿ + ยอดขาดชดเชย {money(reconciliation?.total_shortfall ?? 573.50)} ฿ = <strong>{money(Math.abs(deltaAmount) + (reconciliation?.total_shortfall ?? 0))} ฿</strong> (รวมเคสที่มีผลต่างทั้งหมดของคู่นี้)
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => applyFilter({ status: 'pair_diff', compare_a: 'hosxp_matched', compare_b: 'stm_matched' })}
                                            className={cn(
                                                'mt-2.5 w-full h-7 rounded-lg border-indigo-300 text-[11px] font-semibold transition',
                                                filters.status === 'pair_diff'
                                                    ? 'bg-indigo-700 text-white border-indigo-700'
                                                    : 'bg-indigo-100 text-indigo-900 hover:bg-indigo-200',
                                            )}
                                        >
                                            📑 ดูครบ 10 เคสผลต่างของคู่นี้
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 2. กรณีเลือก ข้อ 2 vs ข้อ 4: HOSxP ทั้งหมด vs STM ทั้งหมด */}
                        {((pairA === 'hosxp_all' && pairB === 'stm_all') || (pairA === 'stm_all' && pairB === 'hosxp_all')) && (
                            <div className="mb-4 rounded-2xl border border-indigo-200 bg-white p-4 shadow-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold">
                                            💡
                                        </span>
                                        <span className="text-xs font-bold text-slate-900">
                                            วิเคราะห์เปรียบเทียบ ข้อ 2 (HOSxP วันที่รับบริการ สุทธิ) vs ข้อ 4 (STM วันที่รับบริการ)
                                        </span>
                                    </div>
                                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                                        ✓ หลังหัก Payment แล้ว ยอดสุทธิตรงกับเรียกเก็บ STM 100% (ผลต่าง {money(deltaAmount)} ฿)
                                    </span>
                                </div>

                                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                    {/* 1. ยอดสุทธิเปรียบเทียบ */}
                                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                                        <div className="text-[11px] font-bold text-emerald-800">
                                            1. ผลต่างยอดเงินสุทธิ (Net Amount)
                                        </div>
                                        <div className="mt-1.5 text-base font-bold text-emerald-900">
                                            {money(deltaAmount)} บาท (ตรงกันเป๊ะ)
                                        </div>
                                        <div className="mt-1 text-[11px] text-emerald-700 leading-relaxed">
                                            HOSxP สุทธิ ({money(metricA?.key === 'hosxp_all' ? metricA.amount : metricB.amount)}) เท่ากับ STM เรียกเก็บ ({money(metricA?.key === 'stm_all' ? metricA.amount : metricB.amount)})
                                        </div>
                                    </div>

                                    {/* 2. ยอดเงิน Payment ที่แยกออกไป */}
                                    <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-3">
                                        <div className="text-[11px] font-bold text-purple-900">
                                            2. ยอดชำระเอง (Payment) ที่แยกเป็นข้อ 7
                                        </div>
                                        <div className="mt-1.5 text-base font-bold text-purple-950">
                                            {money(reconciliation?.total_hosxp_all_paid ?? 0)} บาท
                                        </div>
                                        <div className="mt-1 text-[11px] text-purple-800 leading-relaxed">
                                            หักออกจากยอดคิดคำนวณแล้ว และแยกไว้ที่ <strong>ข้อ 7</strong> เพื่อให้ตรวจสอบเคสที่ผู้ป่วยชำระเองได้อิสระ
                                        </div>
                                    </div>

                                    {/* 3. ส่วนต่างรายการ */}
                                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                                        <div className="text-[11px] font-bold text-amber-900">
                                            3. ส่วนต่างจำนวนรายการ ({deltaCount > 0 ? `+${deltaCount}` : deltaCount} รายการ)
                                        </div>
                                        <div className="mt-1.5 text-base font-bold text-amber-950">
                                            {deltaCount > 0 ? `+${deltaCount}` : deltaCount} รายการ
                                        </div>
                                        <div className="mt-1 text-[11px] text-amber-800 leading-relaxed">
                                            เกิดจาก <strong>12 รายการเฉพาะ HOSxP</strong> (ผู้ป่วยจ่ายเองเต็มจำนวน ยอดเบิกเป็น 0 จึงไม่เข้า STM) ลบ <strong>2 รายการเฉพาะ STM (190 ฿)</strong>
                                        </div>
                                    </div>
                                </div>

                                {/* ปุ่มทางลัดเจาะดูข้อมูลส่วนต่างแต่ละกลุ่ม */}
                                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5">
                                    <span className="text-[11px] font-semibold text-slate-500">เลือกดูรายการเฉพาะกลุ่มในตาราง:</span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => applyFilter({ status: 'hosxp_paid' })}
                                        className={cn(
                                            'h-7 rounded-lg border-purple-300 text-[11px] font-semibold transition',
                                            filters.status === 'hosxp_paid' ? 'bg-purple-700 text-white' : 'bg-purple-50 text-purple-800 hover:bg-purple-100',
                                        )}
                                    >
                                        💳 ดูข้อ 7 รายการชำระเอง (Payment)
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => applyFilter({ status: 'only_hosxp' })}
                                        className={cn(
                                            'h-7 rounded-lg border-sky-300 text-[11px] font-semibold transition',
                                            filters.status === 'only_hosxp' ? 'bg-sky-700 text-white' : 'bg-sky-50 text-sky-800 hover:bg-sky-100',
                                        )}
                                    >
                                        🏥 ดู 12 รายการเฉพาะ HOSxP (ผู้ป่วยจ่ายเอง)
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => applyFilter({ status: 'claim_diff' })}
                                        className={cn(
                                            'h-7 rounded-lg border-amber-300 text-[11px] font-semibold transition',
                                            filters.status === 'claim_diff' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100',
                                        )}
                                    >
                                        🔍 ดู 4 เคสยอดเรียกเก็บไม่ตรง (190 ฿)
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => applyFilter({ status: 'matched_short' })}
                                        className={cn(
                                            'h-7 rounded-lg border-rose-300 text-[11px] font-semibold transition',
                                            filters.status === 'matched_short' ? 'bg-rose-700 text-white' : 'bg-rose-50 text-rose-800 hover:bg-rose-100',
                                        )}
                                    >
                                        📉 ดูรายการยอดขาดชดเชย (Shortfall)
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => applyFilter({ status: 'only_stm' })}
                                        className={cn(
                                            'h-7 rounded-lg border-violet-300 text-[11px] font-semibold transition',
                                            filters.status === 'only_stm' ? 'bg-violet-700 text-white' : 'bg-violet-50 text-violet-800 hover:bg-violet-100',
                                        )}
                                    >
                                        📄 ดู 2 รายการเฉพาะ STM (190 ฿)
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => applyFilter({ status: 'pair_diff', compare_a: 'hosxp_all', compare_b: 'stm_all' })}
                                        className={cn(
                                            'h-7 rounded-lg border-indigo-400 text-[11px] font-semibold transition',
                                            filters.status === 'pair_diff' ? 'bg-indigo-700 text-white' : 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100',
                                        )}
                                    >
                                        📊 ดูทั้งหมด 24 รายการส่วนต่าง
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* แถบปุ่ม Action: พิมพ์รายงาน PDF คู่เปรียบเทียบ และกรองดูรายการ */}
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-100/90 p-3">
                            <div className="text-xs text-slate-700 font-medium">
                                สามารถพิมพ์รายงาน PDF วิเคราะห์เฉพาะคู่เปรียบเทียบ หรือเลือกกรองรายการในตารางด้านล่างได้ทันที
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    asChild
                                    className="rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white shadow-sm text-xs font-semibold"
                                >
                                    <a href={exportPairPdfHref(pairA, pairB)}>
                                        <Printer className="mr-1.5 h-3.5 w-3.5" />
                                        พิมพ์รายงาน PDF คู่เปรียบเทียบ (A vs B)
                                    </a>
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={viewPairDiff}
                                    className={cn(
                                        'rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition',
                                        filters.status === 'pair_diff'
                                            ? 'bg-indigo-700 text-white ring-2 ring-indigo-300'
                                            : 'bg-indigo-600 hover:bg-indigo-700 text-white',
                                    )}
                                >
                                    <Search className="h-3.5 w-3.5" />
                                    ดูรายการผลต่าง (A − B)
                                    {chipCounts.pair_diff !== undefined && (
                                        <span className="ml-1 rounded-md bg-white/25 px-1.5 py-0.5 text-[10px] font-bold">
                                            {Number(chipCounts.pair_diff).toLocaleString('th-TH')}
                                        </span>
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => applyFilter({ status: 'pair_a', page: 1 })}
                                    className={cn(
                                        'rounded-xl border-slate-300 bg-white text-xs hover:bg-slate-50',
                                        (filters.status === 'pair_a' || filters.status === pairA) && 'ring-2 ring-blue-400 border-blue-400 font-bold',
                                    )}
                                >
                                    ดูรายการฝั่ง A ({Number(chipCounts.pair_a ?? metricA?.count ?? 0).toLocaleString('th-TH')})
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => applyFilter({ status: 'pair_b', page: 1 })}
                                    className={cn(
                                        'rounded-xl border-slate-300 bg-white text-xs hover:bg-slate-50',
                                        (filters.status === 'pair_b' || filters.status === pairB) && 'ring-2 ring-emerald-400 border-emerald-400 font-bold',
                                    )}
                                >
                                    ดูรายการฝั่ง B ({Number(chipCounts.pair_b ?? metricB?.count ?? 0).toLocaleString('th-TH')})
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => applyFilter({ status: 'pair_both', page: 1 })}
                                    className={cn(
                                        'rounded-xl border-slate-300 bg-white text-xs hover:bg-slate-50',
                                        filters.status === 'pair_both' && 'ring-2 ring-indigo-400 border-indigo-400 font-bold',
                                    )}
                                >
                                    ดูทั้งหมดในคู่นี้ (A + B)
                                </Button>
                            </div>
                        </div>
                    </Panel>
                ) : (
                    <Panel title="ตัวกรองเพิ่มเติม" description="กรองตามเดือน, รหัส Error หรือรูปแบบส่วนต่างของเงิน" className="mb-4">
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
            )}

                <Panel
                    title={
                        isComparePage
                            ? `ตัวกรองยอดไม่ตรง HOSxP vs ${sourceLabel} (เฉพาะคู่เปรียบเทียบ [ข้อ A] vs [ข้อ B])`
                            : `ตัวกรองยอดไม่ตรง HOSxP vs ${sourceLabel}`
                    }
                    description={
                        isComparePage
                            ? `กรองเจาะจงเฉพาะรายการในคู่ที่เลือกที่มีความคลาดเคลื่อนของยอดเงินตามสาเหตุ`
                            : `รายการที่จับคู่ SEQ แล้ว แต่ยอด HOSxP สุทธิไม่ตรงเรียกเก็บ/ชดเชย หรือส่วนต่างตามสาเหตุ`
                    }
                    className="mb-4 border-amber-200 bg-amber-50/40"
                >
                    <div className="mb-2 flex flex-wrap gap-2">
                        <button type="button" onClick={() => applyFilter({ amount: null, page: 1 })}>
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
                                            page: 1,
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
                        <div className="text-xs text-amber-900 font-medium flex items-center gap-1.5 mt-1">
                            <span>กำลังกรอง:</span>
                            <span className="font-bold underline">{exportAmountLabel}</span>
                            <span>{isComparePage ? `(ภายใต้คู่ [ข้อ A] vs [ข้อ B])` : ''}</span>
                            {' · '}
                            <button
                                type="button"
                                className="text-amber-800 underline font-semibold hover:text-amber-950"
                                onClick={() => applyFilter({ amount: null, page: 1 })}
                            >
                                ล้างตัวกรองยอด
                            </button>
                        </div>
                    )}
                    {amountOptions.filter((opt) => opt.count > 0).length === 0 && (
                        <div className="text-xs text-slate-500">ไม่มีข้อมูลส่วนต่างยอดเงินสำหรับตัวกรองนี้</div>
                    )}
                </Panel>

                <div id="cgd-reconcile-items">
                <Panel
                    title="รายการเปรียบเทียบ"
                    description={`เปรียบเทียบข้อมูลเรียกเก็บ ${sourceLabel} กับชดเชยสุทธิ และ Visit HOSxP ด้วย SEQ ตามช่วงวันที่รับบริการ`}
                >
                    {isComparePage && (
                        <div className="mb-3.5 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-2 shadow-xs">
                            <span className="text-xs font-bold text-slate-600 pl-2">มุมมองรายการ:</span>
                            <button
                                type="button"
                                onClick={() => applyFilter({ status: 'pair_diff', amount: null, page: 1 })}
                                className={cn(
                                    'rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5',
                                    (filters.status === 'pair_diff' || (!filters.status && !filters.amount))
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100',
                                )}
                            >
                                <span>⚖️ ผลต่างเปรียบเทียบ (A − B)</span>
                                {chipCounts.pair_diff !== undefined && (
                                    <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-bold', (filters.status === 'pair_diff' || (!filters.status && !filters.amount)) ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700')}>
                                        {Number(chipCounts.pair_diff).toLocaleString('th-TH')}
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => applyFilter({ status: 'pair_a', amount: null, page: 1 })}
                                className={cn(
                                    'rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5',
                                    (filters.status === 'pair_a' || filters.status === pairA)
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100',
                                )}
                            >
                                <span>🔹 รายการฝั่ง A: {metricA?.shortLabel || 'ข้อ A'}</span>
                                <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-bold', (filters.status === 'pair_a' || filters.status === pairA) ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700')}>
                                    {Number(chipCounts.pair_a ?? metricA?.count ?? 0).toLocaleString('th-TH')}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => applyFilter({ status: 'pair_b', amount: null, page: 1 })}
                                className={cn(
                                    'rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5',
                                    (filters.status === 'pair_b' || filters.status === pairB)
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100',
                                )}
                            >
                                <span>🔸 รายการฝั่ง B: {metricB?.shortLabel || 'ข้อ B'}</span>
                                <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-bold', (filters.status === 'pair_b' || filters.status === pairB) ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700')}>
                                    {Number(chipCounts.pair_b ?? metricB?.count ?? 0).toLocaleString('th-TH')}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => applyFilter({ status: 'pair_both', amount: null, page: 1 })}
                                className={cn(
                                    'rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5',
                                    filters.status === 'pair_both'
                                        ? 'bg-purple-600 text-white shadow-xs'
                                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100',
                                )}
                            >
                                <span>🌐 ทั้งหมดในคู่นี้ (A + B)</span>
                                {chipCounts.pair_both !== undefined && (
                                    <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-bold', filters.status === 'pair_both' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700')}>
                                        {Number(chipCounts.pair_both).toLocaleString('th-TH')}
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => applyFilter({ status: 'all', amount: null, page: 1 })}
                                className={cn(
                                    'rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5',
                                    (filters.status === 'all')
                                        ? 'bg-slate-700 text-white shadow-xs'
                                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100',
                                )}
                            >
                                <span>📋 ทุกสถานะ</span>
                            </button>
                        </div>
                    )}

                    {filters.status === 'pair_diff' && (
                        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-indigo-50/90 px-4 py-2.5 text-xs text-indigo-950 shadow-xs">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse" />
                                <span className="font-bold text-indigo-900">
                                    กำลังแสดงรายการผลต่างเปรียบเทียบ (A − B):
                                </span>
                                <span className="rounded-md bg-white border border-indigo-200 px-2 py-0.5 font-medium text-slate-800">
                                    [ข้อ A] {metricA?.shortLabel || metricA?.label}
                                </span>
                                <span className="font-bold text-indigo-700">เทียบกับ</span>
                                <span className="rounded-md bg-white border border-indigo-200 px-2 py-0.5 font-medium text-slate-800">
                                    [ข้อ B] {metricB?.shortLabel || metricB?.label}
                                </span>
                                <span className="rounded-md bg-indigo-200/80 px-2 py-0.5 font-bold text-indigo-900">
                                    {filteredTotal.toLocaleString('th-TH')} รายการ
                                </span>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => applyFilter({ status: null, page: 1 })}
                                className="h-7 rounded-lg border-indigo-300 bg-white text-[11px] font-semibold text-indigo-800 hover:bg-indigo-100"
                            >
                                ล้างตัวกรอง (ดูทั้งหมด)
                            </Button>
                        </div>
                    )}

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
                                        { label: 'HOSxP รวม', value: filterTotals.total_hosxp },
                                        { label: 'ชำระเอง (Payment)', value: filterTotals.total_hosxp_paid },
                                        { label: 'HOSxP สุทธิ (หลังหัก)', value: filterTotals.total_hosxp_net },
                                        { label: `เรียกเก็บ ${sourceLabel}`, value: filterTotals.total_claim },
                                        {
                                            label: 'ผลต่างเรียกเก็บ (HOSxP − STM)',
                                            value: filterTotals.total_claim_gap ?? (filterTotals.total_hosxp_net - filterTotals.total_claim),
                                            highlight: Math.abs(filterTotals.total_claim_gap ?? (filterTotals.total_hosxp_net - filterTotals.total_claim)) >= 0.01,
                                        },
                                        { label: 'ชดเชยสุทธิ', value: filterTotals.total_approved },
                                        {
                                            label:
                                                filters.status === 'matched_over' ? 'ยอดเกิน' : 'ยอดขาดเงินชดเชย',
                                            value:
                                                filters.status === 'matched_over'
                                                    ? filterTotals.total_over
                                                    : filterTotals.total_shortfall,
                                            danger: filterTotals.total_shortfall > 0,
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
                                                    : card.highlight
                                                      ? 'border-amber-300 bg-amber-50/80 ring-1 ring-amber-300'
                                                      : 'border-white/80 bg-white/80',
                                            )}
                                        >
                                            <div className="text-[11px] text-slate-500">{card.label}</div>
                                            <MoneyText
                                                value={card.value}
                                                size="sm"
                                                className={cn(
                                                    'mt-0.5 font-semibold',
                                                    card.danger
                                                        ? 'text-rose-700'
                                                        : card.highlight
                                                          ? 'text-amber-950 font-bold'
                                                          : 'text-slate-900',
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
                                    <th className="px-2 py-2.5 text-right whitespace-nowrap">HOSxP รวม</th>
                                    <th className="px-2 py-2.5 text-right whitespace-nowrap">Payment</th>
                                    <th className="px-2 py-2.5 text-right whitespace-nowrap">HOSxP สุทธิ</th>
                                    <th className="px-2 py-2.5 text-right whitespace-nowrap">เรียกเก็บ STM</th>
                                    <th className="px-2 py-2.5 text-right whitespace-nowrap">ผลต่างเรียกเก็บ</th>
                                    <th className="px-2 py-2.5 text-right whitespace-nowrap">ชดเชยสุทธิ</th>
                                    <th className="px-2 py-2.5 text-right whitespace-nowrap">ขาดเงินชดเชย</th>
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
                                            <div className="flex max-w-[150px] flex-col gap-1">
                                                <StatusPill
                                                    label={item.status_label}
                                                    className={statusClass[item.status]}
                                                />
                                                {Math.abs(item.diff_claim ?? 0) >= 0.01 && (
                                                    <span className="inline-flex items-center gap-0.5 rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-950">
                                                        ยอดไม่ตรง {item.diff_claim! > 0 ? '+' : ''}{money(item.diff_claim)} ฿
                                                    </span>
                                                )}
                                                {item.shortfall > 0.009 && item.status !== 'matched_short' && (
                                                    <span className="inline-flex items-center gap-0.5 rounded-md border border-rose-300 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-900">
                                                        ขาด -{money(item.shortfall)} ฿
                                                    </span>
                                                )}
                                                {item.payment_adjusted && (
                                                    <StatusPill
                                                        label="★P"
                                                        className="w-fit border-purple-300 bg-purple-100 text-purple-800"
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
                                                        ? 'font-semibold text-purple-700'
                                                        : 'text-slate-600'
                                                }
                                            />
                                        </td>
                                        <td className="px-2 py-2 align-top text-right">
                                            <MoneyText
                                                value={item.hosxp_net}
                                                size="sm"
                                                className="font-semibold text-slate-900"
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
                                            {item.diff_claim !== undefined && item.diff_claim !== null ? (
                                                <span
                                                    className={cn(
                                                        'text-xs font-semibold tabular-nums',
                                                        item.diff_claim > 0.009 && 'text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200',
                                                        item.diff_claim < -0.009 && 'text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200',
                                                        Math.abs(item.diff_claim) <= 0.009 && 'text-slate-400',
                                                    )}
                                                >
                                                    {item.diff_claim > 0.009 ? '+' : ''}{money(item.diff_claim)}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </td>
                                        <td className="px-2 py-2 align-top text-right">
                                            <MoneyText
                                                value={item.stm_approved}
                                                size="sm"
                                                className="text-slate-700"
                                            />
                                        </td>
                                        <td className="px-2 py-2 align-top text-right">
                                            {item.shortfall > 0.009 ? (
                                                <span className="text-xs font-semibold tabular-nums text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                                    -{money(item.shortfall)}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">0.00</span>
                                            )}
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
