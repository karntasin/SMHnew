import React, { useEffect, useMemo, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    Download,
    FileSpreadsheet,
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
    visit_at: string | null;
    hosxp_total: number | null;
    hosxp_paid: number | null;
    hosxp_net: number | null;
    stm_claim: number | null;
    stm_approved: number | null;
    diff_claim: number | null;
    shortfall: number;
    rep_no: string | null;
    claim_submission_no?: string | null;
    error_code: string | null;
    fund_codes: string | null;
    remark: string | null;
}

interface RepError {
    id: number;
    claim_submission_no: string | null;
    rep_no: string | null;
    hn: string | null;
    seq_no: string | null;
    patient_name: string | null;
    visit_date: string | null;
    visit_at: string | null;
    amount_claim: number;
    amount_approved: number;
    error_code: string | null;
    fund_codes: string | null;
    tran_id: string | null;
    remark: string | null;
}

interface ErrorEvent {
    id: number;
    event_type: string;
    batch_id: number | null;
    rep_no?: string | null;
    error_code_before: string | null;
    error_code_after: string | null;
    amount_approved_before: number | null;
    amount_approved_after: number | null;
    note: string | null;
    created_at: string | null;
}

interface ErrorCase {
    id: number;
    match_key: string;
    hn: string | null;
    pid: string | null;
    seq_no: string | null;
    patient_name: string | null;
    rep_no: string | null;
    claim_submission_no: string | null;
    original_error_code: string | null;
    original_amount_claim: number;
    original_amount_approved: number;
    current_status: 'open' | 'fixed' | 'still_open';
    current_error_code: string | null;
    current_amount_approved: number;
    first_seen_at: string | null;
    last_updated_at: string | null;
    events: ErrorEvent[];
}

interface AppealEvent {
    id: number;
    event_type: string;
    batch_id: number | null;
    rep_no?: string | null;
    from_appeal_file?: boolean;
    is_history_rep?: boolean;
    amount_approved_before: number | null;
    amount_approved_after: number | null;
    appeal_amount_before: number | null;
    appeal_amount_after: number | null;
    note: string | null;
    created_at: string | null;
}

interface AppealCase {
    id: number;
    match_key: string;
    hn: string | null;
    pid: string | null;
    seq_no: string | null;
    patient_name: string | null;
    rep_no: string | null;
    claim_submission_no: string | null;
    original_amount_claim: number;
    original_amount_approved: number;
    original_shortfall: number;
    remaining_shortfall?: number;
    current_status:
        | 'eligible'
        | 'submitted'
        | 'approved'
        | 'settled'
        | 'still_short'
        | 'denied'
        | 'partial'
        | 'no_prior_rep';
    appeal_amount_requested: number;
    appeal_amount_approved: number;
    current_amount_approved: number;
    from_appeal_file?: boolean;
    lower_rep_no?: string | null;
    amount_net_compensation?: number | null;
    followup_stm_approved?: number | null;
    appeal_count: number;
    first_seen_at: string | null;
    last_updated_at: string | null;
    events: AppealEvent[];
}

const ERROR_STATUS_LABEL: Record<string, string> = {
    open: 'ยัง Error',
    still_open: 'ยัง Error (รอบถัดไป)',
    fixed: 'แก้แล้ว',
};

const ERROR_STATUS_CLASS: Record<string, string> = {
    open: 'border-rose-200 bg-rose-50 text-rose-700',
    still_open: 'border-orange-200 bg-orange-50 text-orange-800',
    fixed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const APPEAL_STATUS_LABEL: Record<string, string> = {
    eligible: 'รออุทธรณ์',
    submitted: 'รออุทธรณ์ (ยื่นแล้ว)',
    approved: 'อุทธรณ์สำเร็จ',
    settled: 'ได้รับเงินแล้ว',
    still_short: 'ยังขาดเงิน',
    partial: 'ไม่สำเร็จ',
    denied: 'ไม่สำเร็จ',
    no_prior_rep: 'ยังไม่สำเร็จ',
};

const APPEAL_STATUS_CLASS: Record<string, string> = {
    eligible: 'border-amber-200 bg-amber-50 text-amber-800',
    submitted: 'border-sky-200 bg-sky-50 text-sky-800',
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    settled: 'border-teal-200 bg-teal-50 text-teal-800',
    still_short: 'border-orange-300 bg-orange-50 text-orange-900',
    partial: 'border-rose-200 bg-rose-50 text-rose-700',
    denied: 'border-rose-200 bg-rose-50 text-rose-700',
    no_prior_rep: 'border-orange-200 bg-orange-50 text-orange-800',
};

const ERROR_EVENT_LABEL: Record<string, string> = {
    detected: 'พบ Error',
    updated_from_rep: 'อัปเดตจาก REP',
    fixed: 'แก้ Error สำเร็จ',
    still_error: 'ยังมี Error',
};

const APPEAL_EVENT_LABEL: Record<string, string> = {
    detected_shortfall: 'พบยอดจาก STM · รออุทธรณ์',
    marked_submitted: 'ยื่นอุทธรณ์',
    appeal_imported: 'ประวัติ REP',
    approved: 'อุทธรณ์สำเร็จ',
    settled: 'ได้รับเงินแล้ว',
    still_short: 'ยังขาดเงิน',
    partial: 'ไม่สำเร็จ',
    denied: 'ไม่สำเร็จ',
    no_prior_rep: 'ยังไม่สำเร็จ · ไม่พบ SEQ ใน STM',
};

interface Props {
    hosxpReady: boolean;
    import: {
        id: number;
        claim_submission_no: string;
        filename: string;
        detail_count: number;
        rep_count: number;
        total_claim: number;
        total_approved: number;
        visit_date_min: string | null;
        visit_date_max: string | null;
        created_at: string;
    };
    reconciliation: {
        id: number;
        start_date: string;
        end_date: string;
        stm_count: number;
        matched_ok: number;
        matched_short: number;
        matched_over: number;
        only_hosxp: number;
        only_stm: number;
        stm_out_of_range: number;
        total_hosxp: number;
        total_hosxp_net: number;
        total_stm_claim: number;
        total_stm_approved: number;
        total_shortfall: number;
        created_at: string;
    } | null;
    monthly: Array<{ month: string; label: string; item_count: number }>;
    items: {
        data: Item[];
        links: { url: string | null; label: string; active: boolean }[];
        total: number;
        from: number | null;
        to: number | null;
        current_page: number;
        last_page: number;
    };
    filterTotals: {
        item_count: number;
        total_hosxp_net: number;
        total_claim: number;
        total_approved: number;
        total_shortfall: number;
        total_claim_gap?: number;
    } | null;
    statusCounts: Record<string, number> | null;
    stmSummaries?: Array<{
        id: number;
        rep_no: string | null;
        period: string | null;
        count_total: number;
        count_pass: number;
        count_fail: number;
        amount_claim: number;
        amount_drug: number;
        amount_treat: number;
        amount_paid_total: number;
    }>;
    stmDetails?: {
        data: Array<{
            id: number;
            rep_no: string | null;
            row_no: number | null;
            hn: string | null;
            pid: string | null;
            seq_no: string | null;
            patient_name: string | null;
            visit_date: string | null;
            amount_claim: number;
            amount_approved: number;
            amount_treat: number;
            amount_drug: number;
            shortfall: number;
            overpay?: number;
            amount_gap?: number;
            is_duplicate_seq?: boolean;
            seq_dup_count?: number;
        }>;
        links: { url: string | null; label: string; active: boolean }[];
        total: number;
        from: number | null;
        to: number | null;
        current_page: number;
        last_page: number;
    };
    stmStats?: {
        row_count: number;
        rep_count: number;
        total_claim: number;
        total_approved: number;
        total_shortfall: number;
        claim_ne_approved: number;
        shortfall: number;
        overpay: number;
        zero_approved: number;
        missing_seq: number;
        duplicate_seq_rows: number;
        duplicate_seq_groups: number;
    };
    stmRepOptions?: string[];
    stmMonthOptions?: Array<{ month: string; label: string; item_count: number }>;
    stmFlagLabels?: Record<string, string>;
    repErrors: RepError[];
    errorCases?: ErrorCase[];
    errorCaseStatusCounts?: Record<string, number>;
    appealCases?: AppealCase[];
    appealCaseStatusCounts?: Record<string, number>;
    errorOptions: Array<{ value: string; label: string; count: number }>;
    amountOptions: Array<{ value: string; label: string; count: number }>;
    errorCodeMeanings: Record<string, { description: string; solution: string }>;
    filters: {
        tab?: string | null;
        status: string | null;
        q: string;
        month: string | null;
        error_code: string | null;
        amount: string | null;
        error_status?: string | null;
        appeal_status?: string | null;
        stm_q?: string;
        stm_rep?: string | null;
        stm_month?: string | null;
        stm_flag?: string | null;
        stm_per_page?: number | string;
        per_page: number;
        page: number;
        stm_page?: number;
    };
    statusOptions: Record<string, string>;
    amountLabels: Record<string, string>;
    module?: ClaimModuleMeta;
}

const money = (n: number | null | undefined) =>
    new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const nearlyEqual = (a: number | null | undefined, b: number | null | undefined) =>
    Math.abs((a ?? 0) - (b ?? 0)) < 0.01;

/** แสดงวันที่/เวลาเข้ารักษา เช่น 5 ส.ค. 2569 09:30 */
const fmtVisitAt = (visitAt?: string | null, visitDate?: string | null): string => {
    const src = visitAt || visitDate;
    if (!src) return '';
    const normalized = src.includes('T') || src.includes(' ')
        ? src.replace(' ', 'T')
        : `${src}T00:00:00`;
    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) return src;
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const datePart = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
    if (!visitAt || !src.includes(' ')) return datePart;
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${datePart} ${hh}:${mm}`;
};

const STATUS_CLASS: Record<string, string> = {
    matched_ok: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    matched_short: 'border-rose-200 bg-rose-50 text-rose-700',
    matched_over: 'border-amber-200 bg-amber-50 text-amber-700',
    only_hosxp: 'border-sky-200 bg-sky-50 text-sky-700',
    only_stm: 'border-violet-200 bg-violet-50 text-violet-700',
    stm_out_of_range: 'border-orange-200 bg-orange-50 text-orange-700',
};

type TabKey = 'compare' | 'stm' | 'errors' | 'appeals';

export default function StmCompare({
    hosxpReady,
    import: stm,
    reconciliation,
    monthly,
    items,
    filterTotals,
    statusCounts,
    stmSummaries = [],
    stmDetails = {
        data: [],
        links: [],
        total: 0,
        from: null,
        to: null,
        current_page: 1,
        last_page: 1,
    },
    stmStats = {
        row_count: 0,
        rep_count: 0,
        total_claim: 0,
        total_approved: 0,
        total_shortfall: 0,
        claim_ne_approved: 0,
        shortfall: 0,
        overpay: 0,
        zero_approved: 0,
        missing_seq: 0,
        duplicate_seq_rows: 0,
        duplicate_seq_groups: 0,
    },
    stmRepOptions = [],
    stmMonthOptions = [],
    stmFlagLabels = {},
    repErrors,
    errorCases = [],
    errorCaseStatusCounts = {},
    appealCases = [],
    appealCaseStatusCounts = {},
    errorOptions,
    amountOptions = [],
    errorCodeMeanings,
    filters,
    statusOptions,
    module,
}: Props) {
    const mod = resolveClaimModule(module);
    const isRepMode = mod.primary_source === 'rep' || mod.key === 'lgo';
    const sourceLabel = mod.labels.source;
    const comparePageUrl = isRepMode ? claimRoute(mod, 'compare') : claimRoute(mod, 'compare', stm.id);
    const { flash } = usePage().props as { flash?: { success?: string; error?: string } };
    const [startDate, setStartDate] = useState(reconciliation?.start_date || stm.visit_date_min || '');
    const [endDate, setEndDate] = useState(reconciliation?.end_date || stm.visit_date_max || '');
    const [q, setQ] = useState(filters.q || '');
    const [stmQ, setStmQ] = useState(filters.stm_q || '');
    const [processing, setProcessing] = useState(false);
    const tab = (filters.tab as TabKey) || 'compare';
    const [expandedErrorIds, setExpandedErrorIds] = useState<number[]>([]);
    const [expandedAppealIds, setExpandedAppealIds] = useState<number[]>([]);

    const openErrorCount =
        (errorCaseStatusCounts.open || 0) + (errorCaseStatusCounts.still_open || 0);

    const openAppealCount =
        appealCaseStatusCounts.outstanding ??
        (appealCaseStatusCounts.eligible || 0) + (appealCaseStatusCounts.submitted || 0);

    useEffect(() => {
        setQ(filters.q || '');
    }, [filters.q]);

    useEffect(() => {
        setStmQ(filters.stm_q || '');
    }, [filters.stm_q]);

    const MATCHED_STATUSES = ['matched_ok', 'matched_short', 'matched_over'];

    /** ส่งเฉพาะค่าที่มีจริง — แท็บละชุดตัวกรองไม่ล้างกัน, แต่ค่าในแท็บเปรียบเทียบทำงานร่วมกันแบบ AND */
    const applyFilters = (next: Record<string, string | number | null | undefined>) => {
        let status = next.status !== undefined ? next.status : filters.status;
        let amount = next.amount !== undefined ? next.amount : filters.amount;

        // ตัวกรองยอดเงินใช้ได้เฉพาะรายการที่จับคู่แล้ว — เคลียร์สถานะที่ไม่เข้ากัน (ไม่ใช่การผูกตัวเลือก)
        if (amount && status && !MATCHED_STATUSES.includes(String(status))) {
            if (next.amount !== undefined) {
                status = null;
            } else if (next.status !== undefined) {
                amount = null;
            }
        }

        const raw: Record<string, string | number | null | undefined> = {
            tab: next.tab !== undefined ? next.tab : tab,
            status,
            q: next.q !== undefined ? next.q : filters.q,
            month: next.month !== undefined ? next.month : filters.month,
            error_code: next.error_code !== undefined ? next.error_code : filters.error_code,
            amount,
            per_page: next.per_page !== undefined ? next.per_page : filters.per_page,
            page: next.page !== undefined ? next.page : filters.page,
            stm_q: next.stm_q !== undefined ? next.stm_q : filters.stm_q,
            stm_rep: next.stm_rep !== undefined ? next.stm_rep : filters.stm_rep,
            stm_month: next.stm_month !== undefined ? next.stm_month : filters.stm_month,
            stm_flag: next.stm_flag !== undefined ? next.stm_flag : filters.stm_flag,
            stm_per_page:
                next.stm_per_page !== undefined ? next.stm_per_page : filters.stm_per_page,
            stm_page: next.stm_page !== undefined ? next.stm_page : filters.stm_page,
            error_status:
                next.error_status !== undefined ? next.error_status : filters.error_status,
            appeal_status:
                next.appeal_status !== undefined ? next.appeal_status : filters.appeal_status,
        };

        if (
            next.status !== undefined ||
            next.q !== undefined ||
            next.month !== undefined ||
            next.error_code !== undefined ||
            next.amount !== undefined
        ) {
            raw.page = next.page !== undefined ? next.page : 1;
        }
        if (
            next.stm_q !== undefined ||
            next.stm_rep !== undefined ||
            next.stm_month !== undefined ||
            next.stm_flag !== undefined ||
            next.stm_per_page !== undefined
        ) {
            raw.stm_page = next.stm_page !== undefined ? next.stm_page : 1;
        }

        const params = Object.fromEntries(
            Object.entries(raw).filter(
                ([, v]) => v !== null && v !== undefined && v !== '',
            ),
        );

        router.get(comparePageUrl, params, {
            preserveState: true,
            replace: true,
            preserveScroll: true,
        });
    };

    const switchTab = (next: TabKey) => {
        if (next === tab) return;
        applyFilters({ tab: next });
    };

    const visibleStatusCounts = useMemo(() => {
        if (!statusCounts) return [];
        return Object.entries(statusCounts).filter(([key, count]) => {
            const n = Number(count);
            return n > 0 || filters.status === key;
        });
    }, [statusCounts, filters.status]);

    const visibleAmountOptions = useMemo(() => {
        return amountOptions.filter(
            (opt) => opt.count > 0 || filters.amount === opt.value,
        );
    }, [amountOptions, filters.amount]);

    const visibleStmSummaries = useMemo(() => {
        if (!filters.stm_rep) return stmSummaries;
        return stmSummaries.filter((row) => row.rep_no === filters.stm_rep);
    }, [stmSummaries, filters.stm_rep]);

    const toggleExpandError = (id: number) => {
        setExpandedErrorIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const toggleExpandAppeal = (id: number) => {
        setExpandedAppealIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const hosxpMismatchCount =
        amountOptions.find((opt) => opt.value === 'hosxp_ne_claim')?.count ??
        amountOptions.find((opt) => opt.value === 'hosxp_ne_stm')?.count ??
        0;

    const exportQuery = useMemo(() => {
        const params = new URLSearchParams();
        if (filters.status) params.set('status', filters.status);
        if (filters.q) params.set('q', filters.q);
        if (filters.month) params.set('month', filters.month);
        if (filters.error_code) params.set('error_code', filters.error_code);
        if (filters.amount) params.set('amount', filters.amount);
        const qs = params.toString();
        return qs ? `?${qs}` : '';
    }, [filters]);

    const runReconcile = () => {
        if (!startDate || !endDate) return;
        setProcessing(true);
        const reconcileUrl = isRepMode
            ? claimRoute(mod, 'reconcile_all')
            : claimRoute(mod, 'stm_reconcile', stm.id);
        router.post(
            reconcileUrl,
            { start_date: startDate, end_date: endDate },
            { onFinish: () => setProcessing(false) },
        );
    };

    return (
        <QualityPage
            tone="emerald"
            icon={FileSpreadsheet}
            badge="Financial Data Hub"
            title={stm.claim_submission_no}
            subtitle={`เปรียบเทียบ · ข้อมูล STM · Error/อุทธรณ์ · ตัวกรองแท็บแยกกัน · ในแท็บเดียวกันทำงานร่วมแบบ AND`}
            breadcrumbs={dataHubBreadcrumbs({
                title: stm.claim_submission_no,
                href: comparePageUrl,
            })}
            headTitle={`เปรียบเทียบ ${stm.claim_submission_no}`}
            subNav={<DataHubSubNav active={mod.routes.dashboard} />}
            actions={
                <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" className="rounded-xl">
                        <Link href={claimRoute(mod, 'dashboard')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            กลับ
                        </Link>
                    </Button>
                    {reconciliation && !isRepMode && (
                        <>
                            <Button asChild className="rounded-xl bg-emerald-700 hover:bg-emerald-800">
                                <a href={`${claimRoute(mod, 'compare_export', stm.id)}${exportQuery}`}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Excel
                                </a>
                            </Button>
                            <Button asChild variant="outline" className="rounded-xl">
                                <a href={`${claimRoute(mod, 'compare_export_pdf', stm.id)}${exportQuery}`}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    PDF
                                </a>
                            </Button>
                        </>
                    )}
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

            {flash?.success && (
                <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {flash.success}
                </div>
            )}
            {flash?.error && (
                <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    {flash.error}
                </div>
            )}

            {!hosxpReady && (
                <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    ยังเชื่อมต่อ HOSxP ไม่ได้ — เปรียบเทียบยังทำไม่ได้
                </div>
            )}

            <div className="mb-4 flex flex-wrap gap-2">
                <StatusPill
                    label={`เลขที่นำเบิก ${stm.claim_submission_no}`}
                    className="border-emerald-200 bg-emerald-50 text-emerald-800"
                />
                <StatusPill
                    label={`${stm.detail_count.toLocaleString()} รายการ · ${stm.rep_count} REP`}
                    className="border-slate-200 bg-white text-slate-700"
                />
                <StatusPill label={stm.filename} className="border-slate-200 bg-slate-50 text-slate-600" />
            </div>

            <Panel
                title="รันเปรียบเทียบ"
                description={`ดึง Visit HOSxP แล้วจับคู่ SEQ กับ ${sourceLabel}`}
                className="mb-4"
            >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1">
                        <Label className="text-xs text-slate-500">วันเริ่มต้น</Label>
                        <ThaiDatePicker value={startDate} onChange={setStartDate} className="mt-1 w-full max-w-none" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <Label className="text-xs text-slate-500">วันสิ้นสุด</Label>
                        <ThaiDatePicker value={endDate} onChange={setEndDate} className="mt-1 w-full max-w-none" />
                    </div>
                    <Button
                        className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 sm:w-auto sm:min-w-[180px]"
                        disabled={!hosxpReady || !startDate || !endDate || processing}
                        onClick={runReconcile}
                    >
                        <RefreshCw className={cn('mr-2 h-4 w-4', processing && 'animate-spin')} />
                        {processing ? 'กำลังเปรียบเทียบ...' : 'เปรียบเทียบใหม่'}
                    </Button>
                </div>
            </Panel>

            <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    { label: `เรียกเก็บ ${sourceLabel}`, value: money(stm.total_claim) },
                    { label: `พึงรับ ${sourceLabel}`, value: money(stm.total_approved) },
                    {
                        label: 'ยอดขาด',
                        value: money(reconciliation?.total_shortfall ?? Math.max(0, stm.total_claim - stm.total_approved)),
                        danger: true,
                    },
                ].map((card) => (
                    <div key={card.label} className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                        <div className="text-xs text-slate-500">{card.label}</div>
                        <div className={cn('mt-1 text-lg font-semibold', card.danger ? 'text-rose-700' : 'text-slate-900')}>
                            {card.value}
                        </div>
                    </div>
                ))}
                <button
                    type="button"
                    disabled={!reconciliation}
                    onClick={() => {
                        applyFilters({
                            tab: 'compare',
                            amount: filters.amount === 'hosxp_ne_claim' ? null : 'hosxp_ne_claim',
                        });
                    }}
                    className={cn(
                        'rounded-2xl border px-4 py-3 text-left transition',
                        filters.amount === 'hosxp_ne_claim'
                            ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300'
                            : 'border-slate-100 bg-white hover:border-amber-200 hover:bg-amber-50/40',
                        !reconciliation && 'cursor-not-allowed opacity-60',
                    )}
                >
                    <div className="text-xs text-slate-500">HOSxP สุทธิ (จับคู่แล้ว)</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">
                        {money(reconciliation?.total_hosxp_net ?? 0)}
                    </div>
                    <div className="mt-1 text-[11px] font-medium text-amber-700">
                        {hosxpMismatchCount > 0
                            ? `คลิกดูยอดไม่ตรงเรียกเก็บ ${hosxpMismatchCount.toLocaleString()} รายการ`
                            : filters.amount === 'hosxp_ne_claim'
                              ? 'กำลังกรองยอดไม่ตรง · คลิกเพื่อยกเลิก'
                              : 'ยอดตรงกับเรียกเก็บครบ'}
                    </div>
                </button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => switchTab('compare')}
                    className={cn(
                        'rounded-xl px-4 py-2 text-sm font-semibold',
                        tab === 'compare' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200',
                    )}
                >
                    {mod.labels.compare_tab}
                </button>
                <button
                    type="button"
                    onClick={() => switchTab('stm')}
                    className={cn(
                        'rounded-xl px-4 py-2 text-sm font-semibold',
                        tab === 'stm' ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200',
                    )}
                >
                    {mod.labels.data_tab} ({(stm.detail_count || stmDetails.total || 0).toLocaleString()})
                </button>
                <button
                    type="button"
                    onClick={() => switchTab('errors')}
                    className={cn(
                        'rounded-xl px-4 py-2 text-sm font-semibold',
                        tab === 'errors' ? 'bg-rose-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200',
                    )}
                >
                    REP ที่มี Error ({(openErrorCount || errorCases.length || repErrors.length).toLocaleString()})
                </button>
                <button
                    type="button"
                    onClick={() => switchTab('appeals')}
                    className={cn(
                        'rounded-xl px-4 py-2 text-sm font-semibold',
                        tab === 'appeals' ? 'bg-sky-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200',
                    )}
                >
                    การขออุทธรณ์ ({(openAppealCount || appealCases.length).toLocaleString()})
                </button>
            </div>

            {tab === 'compare' && (
                <>
                    <Panel
                        title="ตัวกรอง"
                        description="เลือกได้หลายเงื่อนไขพร้อมกัน (AND) · ตัวเลขบนปุ่มนับตามตัวกรองอื่นที่เลือกอยู่ · ไม่ล้างค่าที่เลือกอัตโนมัติ"
                        className="mb-4"
                    >
                        {visibleStatusCounts.length > 0 && (
                            <div className="mb-3">
                                <div className="mb-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                    สถานะ
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {visibleStatusCounts.map(([key, count]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() =>
                                                applyFilters({
                                                    status: filters.status === key ? null : key,
                                                })
                                            }
                                            className={cn(
                                                'rounded-xl border px-3 py-1.5 text-xs font-semibold',
                                                filters.status === key
                                                    ? STATUS_CLASS[key]
                                                    : 'border-slate-200 bg-white text-slate-600',
                                                Number(count) === 0 && 'opacity-60',
                                            )}
                                        >
                                            {statusOptions[key] || key}{' '}
                                            {Number(count).toLocaleString()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {visibleAmountOptions.length > 0 && (
                            <div className="mb-3 border-t border-slate-100 pt-3">
                                <div className="mb-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                    ยอดไม่ตรง HOSxP vs STM
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => applyFilters({ amount: null })}
                                        className={cn(
                                            'rounded-xl border px-3 py-1.5 text-xs font-semibold',
                                            !filters.amount
                                                ? 'border-amber-400 bg-amber-50 text-amber-900 ring-2 ring-amber-300'
                                                : 'border-slate-200 bg-white text-slate-600',
                                        )}
                                    >
                                        ทุกยอดเงิน
                                    </button>
                                    {visibleAmountOptions.map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() =>
                                                applyFilters({
                                                    amount:
                                                        filters.amount === opt.value
                                                            ? null
                                                            : opt.value,
                                                })
                                            }
                                            className={cn(
                                                'rounded-xl border px-3 py-1.5 text-xs font-semibold',
                                                filters.amount === opt.value
                                                    ? 'border-amber-400 bg-amber-100 text-amber-900 ring-2 ring-amber-300'
                                                    : 'border-amber-200 bg-amber-50 text-amber-800',
                                                opt.count === 0 && 'opacity-60',
                                            )}
                                        >
                                            {opt.label} {opt.count.toLocaleString()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                            <div className="relative min-w-[220px] flex-1">
                                <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                                <Input
                                    className="rounded-xl pl-9"
                                    value={q}
                                    placeholder="ค้นหา HN / SEQ / ชื่อ"
                                    onChange={(e) => setQ(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') applyFilters({ q });
                                    }}
                                />
                            </div>
                            <Button variant="outline" className="rounded-xl" onClick={() => applyFilters({ q })}>
                                ค้นหา
                            </Button>
                            {monthly.length > 0 && (
                                <select
                                    className="rounded-xl border border-slate-200 bg-white px-3 text-sm"
                                    value={filters.month || ''}
                                    onChange={(e) => applyFilters({ month: e.target.value || null })}
                                >
                                    <option value="">ทุกเดือน</option>
                                    {monthly.map((m) => (
                                        <option key={m.month} value={m.month}>
                                            {m.label} ({m.item_count})
                                        </option>
                                    ))}
                                </select>
                            )}
                            {errorOptions.length > 0 && (
                                <select
                                    className="rounded-xl border border-slate-200 bg-white px-3 text-sm"
                                    value={filters.error_code || ''}
                                    onChange={(e) => applyFilters({ error_code: e.target.value || null })}
                                >
                                    <option value="">ทุก Error</option>
                                    {errorOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </Panel>

                    <Panel
                        key={`compare-${filters.status || ''}-${filters.month || ''}-${filters.amount || ''}-${filters.error_code || ''}-${filters.q || ''}-${items.current_page}`}
                        title="รายการเปรียบเทียบ"
                        description="STM เป็นหลัก · จับคู่ HOSxP ด้วย SEQ"
                    >
                        {filterTotals && (
                            <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                                {[
                                    { label: 'รายการ', value: filterTotals.item_count.toLocaleString() },
                                    { label: 'HOSxP สุทธิ', value: money(filterTotals.total_hosxp_net) },
                                    { label: 'เรียกเก็บ STM', value: money(filterTotals.total_claim) },
                                    {
                                        label: 'ส่วนต่าง (สุทธิ−เรียกเก็บ)',
                                        value: money(filterTotals.total_claim_gap ?? 0),
                                        highlight: true,
                                    },
                                    { label: 'ยอดขาด (เรียกเก็บ−พึงรับ)', value: money(filterTotals.total_shortfall) },
                                ].map((c) => (
                                    <div
                                        key={c.label}
                                        className={cn(
                                            'rounded-xl border px-3 py-2 text-sm',
                                            c.highlight
                                                ? 'border-amber-200 bg-amber-50'
                                                : 'border-slate-100 bg-slate-50',
                                        )}
                                    >
                                        <div className="text-xs text-slate-500">{c.label}</div>
                                        <div
                                            className={cn(
                                                'font-semibold',
                                                c.highlight ? 'text-amber-900' : 'text-slate-900',
                                            )}
                                        >
                                            {c.value}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                        <th className="px-3 py-2">สถานะ</th>
                                        <th className="px-3 py-2">HN / SEQ</th>
                                        <th className="px-3 py-2">ชื่อ</th>
                                        <th className="px-3 py-2">REP</th>
                                        <th className="px-3 py-2 text-right">HOSxP สุทธิ</th>
                                        <th className="px-3 py-2 text-right">เรียกเก็บ</th>
                                        <th className="px-3 py-2 text-right">พึงรับ</th>
                                        <th className="px-3 py-2 text-right">ต่าง (สุทธิ−เรียกเก็บ)</th>
                                        <th className="px-3 py-2 text-right">ขาด</th>
                                        <th className="px-3 py-2">Error</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.data.length === 0 && (
                                        <tr>
                                            <td colSpan={10} className="px-3 py-10 text-center text-slate-400">
                                                {reconciliation
                                                    ? 'ไม่พบรายการตามตัวกรอง'
                                                    : 'ยังไม่ได้เปรียบเทียบ — กดเปรียบเทียบใหม่ด้านบน'}
                                            </td>
                                        </tr>
                                    )}
                                    {items.data.map((row) => {
                                        const hosxpNet = row.hosxp_net ?? row.hosxp_total;
                                        const neClaim = !nearlyEqual(hosxpNet, row.stm_claim);
                                        const neApproved = !nearlyEqual(hosxpNet, row.stm_approved);
                                        const diffClaim =
                                            row.diff_claim ??
                                            (hosxpNet != null && row.stm_claim != null
                                                ? Math.round((hosxpNet - row.stm_claim) * 100) / 100
                                                : null);

                                        return (
                                            <tr
                                                key={row.id}
                                                className={cn(
                                                    'border-b border-slate-50',
                                                    (neClaim || neApproved) &&
                                                        ['matched_ok', 'matched_short', 'matched_over'].includes(
                                                            row.status,
                                                        ) &&
                                                        'bg-amber-50/40',
                                                )}
                                            >
                                                <td className="px-3 py-2">
                                                    <StatusPill
                                                        label={row.status_label}
                                                        className={
                                                            STATUS_CLASS[row.status] || 'border-slate-200 bg-slate-50'
                                                        }
                                                    />
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <div className="font-medium">{row.hn || '-'}</div>
                                                    <div className="font-mono text-xs text-slate-500">
                                                        {row.seq_no || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div>{row.patient_name || '-'}</div>
                                                    {(row.visit_at || row.visit_date) && (
                                                        <div className="text-[11px] text-slate-400">
                                                            {fmtVisitAt(row.visit_at, row.visit_date)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">{row.rep_no || '-'}</td>
                                                <td
                                                    className={cn(
                                                        'px-3 py-2 text-right',
                                                        (neClaim || neApproved) && 'font-semibold text-amber-800',
                                                    )}
                                                >
                                                    {money(hosxpNet)}
                                                </td>
                                                <td
                                                    className={cn(
                                                        'px-3 py-2 text-right',
                                                        neClaim && 'font-semibold text-rose-700',
                                                    )}
                                                >
                                                    {money(row.stm_claim)}
                                                </td>
                                                <td
                                                    className={cn(
                                                        'px-3 py-2 text-right',
                                                        neApproved && 'font-semibold text-rose-700',
                                                    )}
                                                >
                                                    {money(row.stm_approved)}
                                                </td>
                                                <td
                                                    className={cn(
                                                        'px-3 py-2 text-right font-semibold',
                                                        diffClaim != null && Math.abs(diffClaim) >= 0.01
                                                            ? 'text-amber-700'
                                                            : 'text-slate-400',
                                                    )}
                                                >
                                                    {diffClaim != null ? money(diffClaim) : '-'}
                                                </td>
                                                <td className="px-3 py-2 text-right font-semibold text-rose-700">
                                                    {money(row.shortfall)}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {row.error_code ? (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="cursor-help font-mono text-xs text-rose-700">
                                                                        {row.error_code}
                                                                    </span>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="max-w-xs">
                                                                    <div className="font-semibold">{row.error_code}</div>
                                                                    <div className="text-xs">
                                                                        {errorCodeMeanings[row.error_code]
                                                                            ?.description ||
                                                                            row.remark ||
                                                                            '-'}
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {items.last_page > 1 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {items.links.map((link, idx) =>
                                    link.url ? (
                                        <Link
                                            key={`${link.label}-${idx}`}
                                            href={link.url}
                                            className={cn(
                                                'rounded-lg border px-3 py-1.5 text-sm',
                                                link.active
                                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                                                    : 'border-slate-200 bg-white text-slate-600',
                                            )}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ) : (
                                        <span
                                            key={`${link.label}-${idx}`}
                                            className="rounded-lg border border-slate-100 px-3 py-1.5 text-sm text-slate-300"
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ),
                                )}
                            </div>
                        )}
                    </Panel>
                </>
            )}

            {tab === 'stm' && (
                <>
                    <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                            {
                                label: 'รายการทั้งหมด',
                                value: stmStats.row_count.toLocaleString(),
                                sub: `${stmStats.rep_count} REP`,
                            },
                            {
                                label: 'เรียกเก็บรวม',
                                value: money(stmStats.total_claim),
                            },
                            {
                                label: 'พึงรับรวม',
                                value: money(stmStats.total_approved),
                            },
                            {
                                label: 'ยอดค้างรวม',
                                value: money(stmStats.total_shortfall),
                                danger: stmStats.total_shortfall >= 0.01,
                            },
                        ].map((card) => (
                            <div
                                key={card.label}
                                className="rounded-2xl border border-slate-100 bg-white px-4 py-3"
                            >
                                <div className="text-xs text-slate-500">{card.label}</div>
                                <div
                                    className={cn(
                                        'mt-1 text-lg font-semibold',
                                        card.danger ? 'text-rose-700' : 'text-slate-900',
                                    )}
                                >
                                    {card.value}
                                </div>
                                {card.sub && (
                                    <div className="mt-0.5 text-[11px] text-slate-500">{card.sub}</div>
                                )}
                            </div>
                        ))}
                    </div>

                    <Panel
                        title="สรุปประเด็นที่ต้องตรวจ"
                        description="คลิกการ์ดเพื่อกรองรายการ · คลิกซ้ำเพื่อยกเลิก"
                        className="mb-4"
                    >
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            {(
                                [
                                    {
                                        flag: 'claim_ne_approved',
                                        label: stmFlagLabels.claim_ne_approved || 'เรียกเก็บ ≠ พึงรับ',
                                        count: stmStats.claim_ne_approved,
                                        tone: 'amber',
                                    },
                                    {
                                        flag: 'shortfall',
                                        label: stmFlagLabels.shortfall || 'เรียกเก็บ > พึงรับ',
                                        count: stmStats.shortfall,
                                        tone: 'rose',
                                    },
                                    {
                                        flag: 'overpay',
                                        label: stmFlagLabels.overpay || 'พึงรับ > เรียกเก็บ',
                                        count: stmStats.overpay,
                                        tone: 'violet',
                                    },
                                    {
                                        flag: 'duplicate_seq',
                                        label: stmFlagLabels.duplicate_seq || 'SEQ ซ้ำ',
                                        count: stmStats.duplicate_seq_rows,
                                        hint:
                                            stmStats.duplicate_seq_groups > 0
                                                ? `${stmStats.duplicate_seq_groups} เลข SEQ`
                                                : undefined,
                                        tone: 'sky',
                                    },
                                    {
                                        flag: 'zero_approved',
                                        label: stmFlagLabels.zero_approved || 'พึงรับ = 0',
                                        count: stmStats.zero_approved,
                                        tone: 'orange',
                                    },
                                    {
                                        flag: 'missing_seq',
                                        label: stmFlagLabels.missing_seq || 'ไม่มี SEQ',
                                        count: stmStats.missing_seq,
                                        tone: 'slate',
                                    },
                                ] as const
                            ).map((card) => {
                                const active = filters.stm_flag === card.flag;
                                const toneClass = {
                                    amber: active
                                        ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300'
                                        : 'border-amber-100 bg-amber-50/40 hover:border-amber-200',
                                    rose: active
                                        ? 'border-rose-400 bg-rose-50 ring-2 ring-rose-300'
                                        : 'border-rose-100 bg-rose-50/40 hover:border-rose-200',
                                    violet: active
                                        ? 'border-violet-400 bg-violet-50 ring-2 ring-violet-300'
                                        : 'border-violet-100 bg-violet-50/40 hover:border-violet-200',
                                    sky: active
                                        ? 'border-sky-400 bg-sky-50 ring-2 ring-sky-300'
                                        : 'border-sky-100 bg-sky-50/40 hover:border-sky-200',
                                    orange: active
                                        ? 'border-orange-400 bg-orange-50 ring-2 ring-orange-300'
                                        : 'border-orange-100 bg-orange-50/40 hover:border-orange-200',
                                    slate: active
                                        ? 'border-slate-400 bg-slate-100 ring-2 ring-slate-300'
                                        : 'border-slate-100 bg-slate-50 hover:border-slate-200',
                                }[card.tone];
                                return (
                                    <button
                                        key={card.flag}
                                        type="button"
                                        onClick={() =>
                                            applyFilters({
                                                tab: 'stm',
                                                stm_flag: active ? null : card.flag,
                                            })
                                        }
                                        className={cn(
                                            'rounded-2xl border px-4 py-3 text-left transition',
                                            toneClass,
                                            card.count === 0 && !active && 'opacity-50',
                                        )}
                                    >
                                        <div className="text-xs font-medium text-slate-600">
                                            {card.label}
                                        </div>
                                        <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                                            {card.count.toLocaleString()}
                                        </div>
                                        {card.hint && (
                                            <div className="mt-0.5 text-[11px] text-slate-500">
                                                {card.hint}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </Panel>

                    <Panel
                        title="ตัวกรองข้อมูล STM"
                        description="ค้นหา · REP · เดือน · ประเด็นตรวจ — แยกจากแท็บอื่น"
                        className="mb-4"
                    >
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative min-w-[220px] flex-1">
                                <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                                <Input
                                    className="rounded-xl pl-9"
                                    value={stmQ}
                                    placeholder="ค้นหา HN / SEQ / ชื่อ / REP"
                                    onChange={(e) => setStmQ(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            applyFilters({ stm_q: stmQ, tab: 'stm' });
                                        }
                                    }}
                                />
                            </div>
                            <Button
                                variant="outline"
                                className="rounded-xl"
                                onClick={() => applyFilters({ stm_q: stmQ, tab: 'stm' })}
                            >
                                ค้นหา
                            </Button>
                            {stmRepOptions.length > 0 && (
                                <select
                                    className="rounded-xl border border-slate-200 bg-white px-3 text-sm"
                                    value={filters.stm_rep || ''}
                                    onChange={(e) =>
                                        applyFilters({
                                            stm_rep: e.target.value || null,
                                            tab: 'stm',
                                        })
                                    }
                                >
                                    <option value="">ทุก REP</option>
                                    {stmRepOptions.map((rep) => (
                                        <option key={rep} value={rep}>
                                            REP {rep}
                                        </option>
                                    ))}
                                </select>
                            )}
                            {stmMonthOptions.length > 0 && (
                                <select
                                    className="rounded-xl border border-slate-200 bg-white px-3 text-sm"
                                    value={filters.stm_month || ''}
                                    onChange={(e) =>
                                        applyFilters({
                                            stm_month: e.target.value || null,
                                            tab: 'stm',
                                        })
                                    }
                                >
                                    <option value="">ทุกเดือน</option>
                                    {stmMonthOptions.map((m) => (
                                        <option key={m.month} value={m.month}>
                                            {m.label} ({m.item_count})
                                        </option>
                                    ))}
                                </select>
                            )}
                            {(filters.stm_q ||
                                filters.stm_rep ||
                                filters.stm_month ||
                                filters.stm_flag) && (
                                <Button
                                    variant="ghost"
                                    className="rounded-xl text-slate-500"
                                    onClick={() => {
                                        setStmQ('');
                                        applyFilters({
                                            stm_q: '',
                                            stm_rep: null,
                                            stm_month: null,
                                            stm_flag: null,
                                            tab: 'stm',
                                        });
                                    }}
                                >
                                    ล้างตัวกรอง STM
                                </Button>
                            )}
                        </div>
                        {filters.stm_flag && (
                            <div className="mt-3 text-xs text-teal-800">
                                กำลังกรอง:{' '}
                                <span className="font-semibold">
                                    {stmFlagLabels[filters.stm_flag] || filters.stm_flag}
                                </span>
                                {' · '}
                                พบ {stmDetails.total.toLocaleString()} รายการ
                            </div>
                        )}
                    </Panel>

                    <Panel
                        key={`stm-${filters.stm_flag || ''}-${filters.stm_rep || ''}-${filters.stm_month || ''}-${filters.stm_q || ''}-${stmDetails.current_page}`}
                        title="รายละเอียดตาม STM"
                        description={`พึงรับราย SEQ · แสดง ${stmDetails.from ?? 0}–${stmDetails.to ?? 0} จาก ${stmDetails.total.toLocaleString()} รายการ`}
                        className="mb-4"
                    >
                        <div className="overflow-x-auto rounded-2xl border border-teal-100">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-teal-100 bg-teal-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                                        <th className="px-3 py-2">REP</th>
                                        <th className="px-3 py-2">HN</th>
                                        <th className="px-3 py-2">SEQ</th>
                                        <th className="px-3 py-2">ชื่อ</th>
                                        <th className="px-3 py-2">วันที่</th>
                                        <th className="px-3 py-2 text-right">เรียกเก็บ</th>
                                        <th className="px-3 py-2 text-right">พึงรับ</th>
                                        <th className="px-3 py-2 text-right">ส่วนต่าง</th>
                                        <th className="px-3 py-2 text-right">ค่ารักษา</th>
                                        <th className="px-3 py-2 text-right">ค่ายา</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stmDetails.data.map((row) => {
                                        const gap = row.amount_gap ?? row.amount_claim - row.amount_approved;
                                        return (
                                            <tr
                                                key={row.id}
                                                className={cn(
                                                    'border-b border-slate-50',
                                                    row.is_duplicate_seq && 'bg-sky-50/70',
                                                    Math.abs(gap) >= 0.01 &&
                                                        !row.is_duplicate_seq &&
                                                        'bg-amber-50/40',
                                                )}
                                            >
                                                <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">
                                                    {row.rep_no || '-'}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    {row.hn || '-'}
                                                </td>
                                                <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                                                    <span>{row.seq_no || '-'}</span>
                                                    {row.is_duplicate_seq && (
                                                        <span className="ml-1 rounded-full border border-sky-200 bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">
                                                            ซ้ำ×{row.seq_dup_count}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2">{row.patient_name || '-'}</td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    {row.visit_date || '-'}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    {money(row.amount_claim)}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    {money(row.amount_approved)}
                                                </td>
                                                <td
                                                    className={cn(
                                                        'px-3 py-2 text-right font-semibold',
                                                        gap > 0.009
                                                            ? 'text-rose-700'
                                                            : gap < -0.009
                                                              ? 'text-violet-700'
                                                              : 'text-slate-400',
                                                    )}
                                                >
                                                    {Math.abs(gap) >= 0.01
                                                        ? `${gap > 0 ? '+' : ''}${money(gap)}`
                                                        : '-'}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    {money(row.amount_treat)}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    {money(row.amount_drug)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {stmDetails.data.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={10}
                                                className="px-3 py-10 text-center text-slate-400"
                                            >
                                                ไม่พบรายการตามตัวกรอง STM
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {stmDetails.last_page > 1 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {stmDetails.links.map((link, idx) =>
                                    link.url ? (
                                        <Link
                                            key={`${link.label}-${idx}`}
                                            href={link.url}
                                            className={cn(
                                                'rounded-lg border px-3 py-1.5 text-sm',
                                                link.active
                                                    ? 'border-teal-500 bg-teal-50 text-teal-800'
                                                    : 'border-slate-200 bg-white text-slate-600',
                                            )}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ) : (
                                        <span
                                            key={`${link.label}-${idx}`}
                                            className="rounded-lg border border-slate-100 px-3 py-1.5 text-sm text-slate-300"
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ),
                                )}
                            </div>
                        )}
                    </Panel>

                    <Panel title="สรุปตาม REP" description="จากแท็บ สรุป(พึงรับ) ในไฟล์ STM">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                        <th className="px-3 py-2">REP NO</th>
                                        <th className="px-3 py-2 text-right">ทั้งหมด</th>
                                        <th className="px-3 py-2 text-right">ผ่าน</th>
                                        <th className="px-3 py-2 text-right">ไม่ผ่าน</th>
                                        <th className="px-3 py-2 text-right">เรียกเก็บ</th>
                                        <th className="px-3 py-2 text-right">ค่ายา</th>
                                        <th className="px-3 py-2 text-right">ค่ารักษา</th>
                                        <th className="px-3 py-2 text-right">จ่ายชดเชยทั้งสิ้น</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleStmSummaries.map((row) => (
                                        <tr key={row.id} className="border-b border-slate-50">
                                            <td className="px-3 py-2 font-medium">{row.rep_no || '-'}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">
                                                {row.count_total.toLocaleString()}
                                            </td>
                                            <td className="px-3 py-2 text-right tabular-nums">
                                                {row.count_pass.toLocaleString()}
                                            </td>
                                            <td className="px-3 py-2 text-right tabular-nums">
                                                {row.count_fail.toLocaleString()}
                                            </td>
                                            <td className="px-3 py-2 text-right">{money(row.amount_claim)}</td>
                                            <td className="px-3 py-2 text-right">{money(row.amount_drug)}</td>
                                            <td className="px-3 py-2 text-right">{money(row.amount_treat)}</td>
                                            <td className="px-3 py-2 text-right font-semibold">
                                                {money(row.amount_paid_total)}
                                            </td>
                                        </tr>
                                    ))}
                                    {visibleStmSummaries.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="px-3 py-8 text-center text-slate-400">
                                                ไม่มีข้อมูลสรุป STM
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Panel>
                </>
            )}

            {tab === 'errors' && (
                <Panel
                    title={`REP ที่มี Error · เลขที่นำเบิก ${stm.claim_submission_no}`}
                    description="ใช้เฉพาะไฟล์ REP (ไม่เกี่ยวกับ HOSxP) · พบ Error → ตรวจด้วย REP คนละเลขที่ SEQ เดิม · ไม่มี Error = แก้แล้ว"
                >
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        {(
                            [
                                ['', 'ค้างอยู่', openErrorCount],
                                ['open', 'ยัง Error', errorCaseStatusCounts.open || 0],
                                ['still_open', 'ยัง Error (รอบถัดไป)', errorCaseStatusCounts.still_open || 0],
                                ['fixed', 'แก้แล้ว', errorCaseStatusCounts.fixed || 0],
                                ['all', 'ทั้งหมด', errorCaseStatusCounts.all || 0],
                            ] as const
                        ).map(([value, label, count]) => {
                            const active =
                                (value === '' && !filters.error_status) ||
                                filters.error_status === value;
                            return (
                                <button
                                    key={value || 'pending'}
                                    type="button"
                                    onClick={() =>
                                        applyFilters({
                                            error_status: value === '' ? null : value,
                                        })
                                    }
                                    className={cn(
                                        'rounded-full border px-3 py-1 text-xs font-semibold',
                                        active
                                            ? 'border-rose-500 bg-rose-600 text-white'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-rose-200',
                                    )}
                                >
                                    {label} ({count.toLocaleString()})
                                </button>
                            );
                        })}
                    </div>

                    <p className="mb-4 text-xs text-slate-500">
                        การตรวจว่าแก้ Error ผ่านหรือไม่ ใช้ไฟล์{' '}
                        <strong>REP คนละเลข</strong> (รอบถัดไป) ที่ <strong>SEQ เดิม</strong> — ไม่ใช่ไฟล์ REP เดียวกัน
                        · ไฟล์ APPEAL ใช้ที่แท็บ <strong>การขออุทธรณ์</strong>
                    </p>

                    {errorCases.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center text-sm text-slate-500">
                            ไม่พบรายการ Error ตามตัวกรองนี้
                            <div className="mt-2 text-xs">นำเข้าไฟล์ REP ที่มี Error หรือเลือกฟิลเตอร์สถานะอื่น</div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-2xl border border-rose-100">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-rose-100 bg-rose-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                                        <th className="px-3 py-2">สถานะ</th>
                                        <th className="px-3 py-2">Error</th>
                                        <th className="px-3 py-2">HN / SEQ</th>
                                        <th className="px-3 py-2">ชื่อ</th>
                                        <th className="px-3 py-2">REP</th>
                                        <th className="px-3 py-2 text-right">เรียกเก็บ</th>
                                        <th className="px-3 py-2 text-right">ชดเชยเดิม → ปัจจุบัน</th>
                                        <th className="px-3 py-2">ประวัติ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {errorCases.map((row) => {
                                        const expanded = expandedErrorIds.includes(row.id);
                                        return (
                                            <React.Fragment key={row.id}>
                                                <tr className="border-b border-slate-50 align-top">
                                                    <td className="px-3 py-2">
                                                        <span
                                                            className={cn(
                                                                'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                                                                ERROR_STATUS_CLASS[row.current_status] ||
                                                                    'border-slate-200 bg-slate-50 text-slate-600',
                                                            )}
                                                        >
                                                            {ERROR_STATUS_LABEL[row.current_status] ||
                                                                row.current_status}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="cursor-help font-mono text-xs font-semibold text-rose-700">
                                                                        {row.current_error_code ||
                                                                            row.original_error_code ||
                                                                            '-'}
                                                                    </span>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="max-w-xs">
                                                                    <div className="font-semibold">
                                                                        {row.current_error_code ||
                                                                            row.original_error_code}
                                                                    </div>
                                                                    <div className="text-xs">
                                                                        {errorCodeMeanings[
                                                                            row.current_error_code ||
                                                                                row.original_error_code ||
                                                                                ''
                                                                        ]?.description || '-'}
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        {row.original_error_code &&
                                                            row.current_error_code &&
                                                            row.original_error_code !== row.current_error_code && (
                                                                <div className="text-[11px] text-slate-400">
                                                                    เดิม {row.original_error_code}
                                                                </div>
                                                            )}
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap">
                                                        <div>{row.hn || '-'}</div>
                                                        <div className="font-mono text-xs text-slate-500">
                                                            {row.seq_no || '-'}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2">{row.patient_name || '-'}</td>
                                                    <td className="px-3 py-2 font-mono text-xs">{row.rep_no || '-'}</td>
                                                    <td className="px-3 py-2 text-right">
                                                        {money(row.original_amount_claim)}
                                                    </td>
                                                    <td className="px-3 py-2 text-right whitespace-nowrap">
                                                        <span className="text-slate-500">
                                                            {money(row.original_amount_approved)}
                                                        </span>
                                                        <span className="mx-1 text-slate-300">→</span>
                                                        <span
                                                            className={cn(
                                                                'font-semibold',
                                                                row.current_status === 'fixed'
                                                                    ? 'text-emerald-700'
                                                                    : 'text-slate-800',
                                                            )}
                                                        >
                                                            {money(row.current_amount_approved)}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <button
                                                            type="button"
                                                            className="text-xs font-semibold text-rose-700 hover:underline"
                                                            onClick={() => toggleExpandError(row.id)}
                                                        >
                                                            {expanded ? 'ซ่อน' : `ดู (${row.events.length})`}
                                                        </button>
                                                    </td>
                                                </tr>
                                                {expanded && (
                                                    <tr className="border-b border-slate-100 bg-slate-50/80">
                                                        <td colSpan={8} className="px-4 py-3">
                                                            <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                                                <span className="font-semibold text-slate-500">
                                                                    ประวัติอัปเดต Error (SEQ)
                                                                </span>
                                                                <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 font-mono font-semibold text-rose-800">
                                                                    REP {row.rep_no || '-'}
                                                                </span>
                                                                {row.seq_no && (
                                                                    <span className="font-mono text-slate-500">
                                                                        SEQ {row.seq_no}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {row.events.length === 0 ? (
                                                                <div className="text-xs text-slate-400">ยังไม่มีประวัติ</div>
                                                            ) : (
                                                                <ol className="space-y-2">
                                                                    {row.events.map((ev) => (
                                                                        <li
                                                                            key={ev.id}
                                                                            className="flex flex-wrap gap-x-3 gap-y-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                                                                        >
                                                                            <span className="font-semibold text-slate-800">
                                                                                {ERROR_EVENT_LABEL[ev.event_type] ||
                                                                                    ev.event_type}
                                                                            </span>
                                                                            <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 font-mono font-semibold text-rose-800">
                                                                                REP {ev.rep_no || row.rep_no || '-'}
                                                                            </span>
                                                                            <span className="text-slate-400">
                                                                                {ev.created_at || ''}
                                                                            </span>
                                                                            {(ev.error_code_before ||
                                                                                ev.error_code_after) && (
                                                                                <span className="font-mono text-rose-700">
                                                                                    {ev.error_code_before || '-'} →{' '}
                                                                                    {ev.error_code_after || '-'}
                                                                                </span>
                                                                            )}
                                                                            {(ev.amount_approved_before != null ||
                                                                                ev.amount_approved_after != null) && (
                                                                                <span className="text-slate-600">
                                                                                    ชดเชย{' '}
                                                                                    {money(ev.amount_approved_before)} →{' '}
                                                                                    {money(ev.amount_approved_after)}
                                                                                </span>
                                                                            )}
                                                                            {ev.note && (
                                                                                <span className="text-slate-500 w-full">
                                                                                    {ev.note}
                                                                                </span>
                                                                            )}
                                                                        </li>
                                                                    ))}
                                                                </ol>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Panel>
            )}

            {tab === 'appeals' && (
                <Panel
                    title={`การขออุทธรณ์ · ${stm.claim_submission_no}`}
                    description={
                        isRepMode
                            ? 'REP เรียกเก็บ > ชดเชยสุทธิ = รออุทธรณ์ · นำเข้าไฟล์ _APPEAL เพื่ออัปเดตผล · ใช้ข้อมูลจาก REP เท่านั้น (ไม่มี STM)'
                            : 'STM พึงรับ ≠ เรียกเก็บ = รออุทธรณ์ · APPEAL สำเร็จ → รอ STM หลัง APPEAL (REP+SEQ) · พึงรับทั้งหมด − ยังขาดเงิน = 0 → ได้รับเงินแล้ว'
                    }
                >
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        {(
                            (isRepMode
                                ? ([
                                      ['', 'รออุทธรณ์', openAppealCount],
                                      ['approved', 'อุทธรณ์สำเร็จ', appealCaseStatusCounts.approved || 0],
                                      ['denied', 'ไม่สำเร็จ/บางส่วน', appealCaseStatusCounts.denied || 0],
                                      ['all', 'ทั้งหมด', appealCaseStatusCounts.all || 0],
                                  ] as const)
                                : ([
                                      ['', 'รออุทธรณ์', openAppealCount],
                                      ['approved', 'อุทธรณ์สำเร็จ', appealCaseStatusCounts.approved || 0],
                                      ['settled', 'ได้รับเงินแล้ว', appealCaseStatusCounts.settled || 0],
                                      ['still_short', 'ยังขาดเงิน', appealCaseStatusCounts.still_short || 0],
                                      ['all', 'ทั้งหมด', appealCaseStatusCounts.all || 0],
                                  ] as const)
                            )
                        ).map(([value, label, count]) => {
                            const active =
                                (value === '' && !filters.appeal_status) ||
                                filters.appeal_status === value;
                            return (
                                <button
                                    key={value || 'pending'}
                                    type="button"
                                    onClick={() =>
                                        applyFilters({
                                            appeal_status: value === '' ? null : value,
                                            tab: 'appeals',
                                        })
                                    }
                                    className={cn(
                                        'rounded-full border px-3 py-1 text-xs font-semibold',
                                        active
                                            ? 'border-sky-500 bg-sky-600 text-white'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200',
                                    )}
                                >
                                    {label} ({count.toLocaleString()})
                                </button>
                            );
                        })}
                    </div>

                    <p className="mb-4 text-xs text-slate-500">
                        นำเข้าไฟล์ <span className="font-mono">_APPEAL</span> ที่{' '}
                        <Link
                            href={claimRoute(mod, 'import')}
                            className="font-semibold text-sky-700 hover:underline"
                        >
                            {mod.labels.import_rep}
                        </Link>
                        {isRepMode
                            ? ' — จับคู่ SEQ กับเคสรออุทธรณ์จาก REP · ใช้ REP ที่ค่าชดเชยมากกว่าเป็นรายการปัจจุบัน'
                            : ' — จับคู่ REP + SEQ กับเคสรออุทธรณ์ (ต้องนำเข้าทีหลัง) แล้วใช้ REP ที่ค่ามากกว่าเป็นรายการปัจจุบัน'}
                    </p>

                    {appealCases.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center text-sm text-slate-500">
                            ไม่พบรายการตามตัวกรองนี้
                            <div className="mt-2 text-xs">
                                {isRepMode
                                    ? 'REP ที่เรียกเก็บ > ชดเชยสุทธิ จะขึ้นรออุทธรณ์ · นำเข้า APPEAL ทีหลังเพื่ออัปเดตเป็นอุทธรณ์สำเร็จ'
                                    : 'STM ที่พึงรับ ≠ เรียกเก็บ จะขึ้นรออุทธรณ์ · นำเข้า APPEAL ทีหลังเพื่ออัปเดตเป็นอุทธรณ์สำเร็จ'}
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-2xl border border-sky-100">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-sky-100 bg-sky-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                                        <th className="px-3 py-2">สถานะ</th>
                                        <th className="px-3 py-2">HN / SEQ</th>
                                        <th className="px-3 py-2">ชื่อ</th>
                                        <th className="px-3 py-2">REP</th>
                                        <th className="px-3 py-2 text-right">เรียกเก็บ</th>
                                        <th className="px-3 py-2 text-right">ชดเชยสุทธิ / พึงรับ</th>
                                        <th className="px-3 py-2 text-right">ยังขาดเงิน</th>
                                        <th className="px-3 py-2">ประวัติ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {appealCases.map((row) => {
                                        const expanded = expandedAppealIds.includes(row.id);
                                        const claim = row.original_amount_claim || 0;
                                        const fromAppeal = Boolean(row.from_appeal_file);
                                        const isSettledOrShort =
                                            row.current_status === 'settled' ||
                                            row.current_status === 'still_short';
                                        const displayApproved = isSettledOrShort
                                            ? (row.followup_stm_approved ??
                                                  row.current_amount_approved ??
                                                  0)
                                            : fromAppeal
                                              ? (row.amount_net_compensation ??
                                                    row.original_amount_approved ??
                                                    0)
                                              : row.current_status === 'approved'
                                                ? row.current_amount_approved || 0
                                                : row.original_amount_approved || 0;
                                        const gap = isSettledOrShort
                                            ? row.remaining_shortfall ?? 0
                                            : Math.abs(claim - displayApproved);
                                        const historyRepCount = row.events.filter(
                                            (ev) =>
                                                ev.event_type === 'appeal_imported' ||
                                                ev.is_history_rep,
                                        ).length;
                                        return (
                                            <React.Fragment key={row.id}>
                                                <tr className="border-b border-slate-50 align-top">
                                                    <td className="px-3 py-2">
                                                        <span
                                                            className={cn(
                                                                'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                                                                APPEAL_STATUS_CLASS[row.current_status] ||
                                                                    'border-slate-200 bg-slate-50 text-slate-600',
                                                            )}
                                                        >
                                                            {APPEAL_STATUS_LABEL[row.current_status] ||
                                                                row.current_status}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap">
                                                        <div>{row.hn || '-'}</div>
                                                        <div className="font-mono text-xs text-slate-500">
                                                            {row.seq_no || '-'}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2">{row.patient_name || '-'}</td>
                                                    <td className="px-3 py-2 font-mono text-xs">
                                                        <div className="font-semibold text-slate-800">
                                                            {row.rep_no || '-'}
                                                        </div>
                                                        {fromAppeal && row.lower_rep_no && row.lower_rep_no !== row.rep_no && (
                                                            <div className="text-[11px] text-slate-500">
                                                                ยอดจาก REP {row.lower_rep_no}
                                                            </div>
                                                        )}
                                                        {historyRepCount > 0 && (
                                                            <div className="text-[11px] text-slate-500">
                                                                +ประวัติ {historyRepCount} REP
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-right">{money(claim)}</td>
                                                    <td
                                                        className={cn(
                                                            'px-3 py-2 text-right font-semibold',
                                                            row.current_status === 'settled' ||
                                                                fromAppeal ||
                                                                row.current_status === 'approved'
                                                                ? 'text-emerald-700'
                                                                : 'text-slate-700',
                                                        )}
                                                    >
                                                        <div>{money(displayApproved)}</div>
                                                        <div className="text-[10px] font-normal text-slate-400">
                                                            {isSettledOrShort
                                                                ? 'พึงรับทั้งหมด (STM)'
                                                                : fromAppeal
                                                                  ? 'ชดเชยสุทธิ'
                                                                  : 'พึงรับ'}
                                                        </div>
                                                    </td>
                                                    <td
                                                        className={cn(
                                                            'px-3 py-2 text-right font-semibold',
                                                            row.current_status === 'settled'
                                                                ? 'text-teal-700'
                                                                : 'text-amber-700',
                                                        )}
                                                    >
                                                        {row.current_status === 'settled'
                                                            ? '0.00'
                                                            : gap >= 0.01
                                                              ? money(gap)
                                                              : '-'}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <button
                                                            type="button"
                                                            className="text-xs font-semibold text-sky-700 hover:underline"
                                                            onClick={() => toggleExpandAppeal(row.id)}
                                                        >
                                                            {expanded ? 'ซ่อน' : `ดู (${row.events.length})`}
                                                        </button>
                                                    </td>
                                                </tr>
                                                {expanded && (
                                                    <tr className="border-b border-slate-100 bg-slate-50/80">
                                                        <td colSpan={8} className="px-4 py-3">
                                                            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                                                                <span>ประวัติอุทธรณ์ · SEQ {row.seq_no || '-'}</span>
                                                                {row.rep_no && (
                                                                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono font-semibold text-emerald-800">
                                                                        REP ปัจจุบัน {row.rep_no}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {row.events.length === 0 ? (
                                                                <div className="text-xs text-slate-400">ยังไม่มีประวัติ</div>
                                                            ) : (
                                                                <ol className="space-y-2">
                                                                    {row.events.map((ev) => (
                                                                        <li
                                                                            key={ev.id}
                                                                            className="flex flex-wrap gap-x-3 gap-y-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                                                                        >
                                                                            <span className="font-semibold text-slate-800">
                                                                                {APPEAL_EVENT_LABEL[ev.event_type] ||
                                                                                    ev.event_type}
                                                                            </span>
                                                                            <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 font-mono font-semibold text-sky-800">
                                                                                REP {ev.rep_no || row.rep_no || '-'}
                                                                            </span>
                                                                            {ev.is_history_rep ||
                                                                            ev.event_type === 'appeal_imported' ? (
                                                                                <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                                                                                    ประวัติ
                                                                                </span>
                                                                            ) : ev.from_appeal_file ? (
                                                                                <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 font-semibold text-violet-800">
                                                                                    APPEAL
                                                                                </span>
                                                                            ) : null}
                                                                            {row.seq_no && (
                                                                                <span className="font-mono text-slate-500">
                                                                                    SEQ {row.seq_no}
                                                                                </span>
                                                                            )}
                                                                            <span className="text-slate-400">
                                                                                {ev.created_at || ''}
                                                                            </span>
                                                                            {(ev.amount_approved_before != null ||
                                                                                ev.amount_approved_after != null) && (
                                                                                <span className="text-slate-600">
                                                                                    ชดเชย{' '}
                                                                                    {money(ev.amount_approved_before)} →{' '}
                                                                                    {money(ev.amount_approved_after)}
                                                                                </span>
                                                                            )}
                                                                            {(ev.appeal_amount_before != null ||
                                                                                ev.appeal_amount_after != null) && (
                                                                                <span className="text-emerald-700">
                                                                                    จ่ายเพิ่ม{' '}
                                                                                    {money(ev.appeal_amount_before)} →{' '}
                                                                                    {money(ev.appeal_amount_after)}
                                                                                </span>
                                                                            )}
                                                                            {ev.note && (
                                                                                <span className="text-slate-500 w-full">
                                                                                    {ev.note}
                                                                                </span>
                                                                            )}
                                                                        </li>
                                                                    ))}
                                                                </ol>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Panel>
            )}
        </QualityPage>
    );
}
