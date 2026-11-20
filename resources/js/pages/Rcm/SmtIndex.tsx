import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    Banknote,
    Building2,
    Calendar,
    Check,
    CheckCircle2,
    Download,
    ExternalLink,
    Eye,
    FileDown,
    FileText,
    Filter,
    Heart,
    Layers,
    Loader2,
    RefreshCw,
    Search,
    Shield,
    Sparkles,
    UserCheck,
    Users,
    Wallet,
    X,
} from 'lucide-react';
import RcmLayout from './RcmLayout';
import { Button } from '@/components/ui/button';
import { ThaiDateRangePicker } from '@/components/date-range-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface RepMatchInfo {
    matched: boolean;
    case_count: number;
    total_claim: number;
    total_approved: number;
    smt_paid: number;
    shortfall: number;
    is_fully_paid: boolean;
    status: 'fully_paid' | 'shortfall';
}

interface ReconcileSummary {
    total_lgo_transfers: number;
    total_claimed: number;
    total_approved: number;
    total_smt_paid: number;
    fully_paid_count: number;
    fully_paid_amount: number;
    shortfall_count: number;
    shortfall_amount: number;
    unmatched_count: number;
}

interface SmtTransfer {
    id: number;
    budget_source: string;
    is_ckd: boolean;
    is_lgo_hd?: boolean;
    bank_transfer_amount?: number;
    budget_year: string;
    batch_no: string;
    posting_date: string;
    transfer_date: string | null;
    ref_doc_no: string | null;
    hcode: string;
    vendor_no: string | null;
    fund_name: string | null;
    fund_group_descr: string | null;
    mou_grp_code: string | null;
    bank_name: string | null;
    bank_account_no: string | null;
    amount: number;
    total: number;
    moph_id: string | null;
    moph_desc: string | null;
    pdf_path?: string | null;
    pdf_filename?: string | null;
    pdf_downloaded_at?: string | null;
    has_pdf?: boolean;
    pdf_view_url?: string | null;
    pdf_download_url?: string | null;
    synced_at: string | null;
    rep_match?: RepMatchInfo | null;
}

interface SmtSummary {
    total_all: number;
    total_lgo: number;
    total_lgo_hd?: number;
    total_uc: number;
    total_ckd: number;
    total_dss: number;
    total_covid: number;
    count_all: number;
    count_lgo: number;
    count_lgo_hd?: number;
    count_uc: number;
    count_ckd: number;
    count_dss: number;
    count_covid: number;
    pdf_count?: number;
    last_synced_at: string | null;
    matched_lgo_rep_count?: number;
    reconcile_summary?: ReconcileSummary;
}

interface PaginationLinks {
    url: string | null;
    label: string;
    active: boolean;
}

interface Props {
    filters: {
        budget_source: string;
        budget_year: string;
        start_date: string;
        end_date: string;
        search: string;
        zone_id: string;
        province_id: string;
        hcode: string;
        reconcile_filter?: string;
    };
    items: {
        data: SmtTransfer[];
        links: PaginationLinks[];
        total: number;
        current_page: number;
        last_page: number;
    };
    summary: SmtSummary;
}

interface PatientCase {
    id: number;
    row_no: number;
    hn: string;
    patient_name: string;
    visit_date: string;
    amount_claim: number;
    amount_approved: number;
    shortfall: number;
    error_code: string | null;
    fund_codes: string | null;
}

interface RepCasesResponse {
    rep_no: string;
    case_count: number;
    total_claim: number;
    total_approved: number;
    total_shortfall: number;
    cases: PatientCase[];
}

export default function RcmSmtIndex({ filters, items, summary }: Props) {
    const [budgetSource, setBudgetSource] = useState(filters.budget_source || 'all');
    const [budgetYear, setBudgetYear] = useState(filters.budget_year || '2570');
    const [startDate, setStartDate] = useState(filters.start_date || '2026-10-01');
    const [endDate, setEndDate] = useState(filters.end_date || '2027-09-30');
    const [search, setSearch] = useState(filters.search || '');
    const [reconcileFilter, setReconcileFilter] = useState(filters.reconcile_filter || 'all');
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSyncingPdfs, setIsSyncingPdfs] = useState(false);

    // Modal state
    const [selectedTransfer, setSelectedTransfer] = useState<SmtTransfer | null>(null);
    const [modalTab, setModalTab] = useState<'rep' | 'smt'>('rep');
    const [detailData, setDetailData] = useState<any>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [repCasesData, setRepCasesData] = useState<RepCasesResponse | null>(null);
    const [loadingRepCases, setLoadingRepCases] = useState(false);

    const formatMoney = (val: number) =>
        new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(val);

    const formatDisplayPostingDate = (dateStr?: string | null): string => {
        if (!dateStr) return '-';
        if (/^\d{8}$/.test(dateStr)) {
            const year = dateStr.slice(0, 4);
            const monthNum = parseInt(dateStr.slice(4, 6), 10);
            const day = parseInt(dateStr.slice(6, 8), 10);
            const thaiMonths = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
            const monthStr = thaiMonths[monthNum] || dateStr.slice(4, 6);
            return `${day} ${monthStr} ${year}`;
        }
        return dateStr;
    };

    const formatDisplayTransferDate = (dateStr?: string | null): string => {
        if (!dateStr) return '';
        const clean = dateStr.split('T')[0];
        const parts = clean.split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const beYear = year < 2400 ? year + 543 : year;
            const monthNum = parseInt(parts[1], 10);
            const day = parseInt(parts[2], 10);
            const thaiMonths = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
            const monthStr = thaiMonths[monthNum] || parts[1];
            return `${day} ${monthStr} ${beYear}`;
        }
        return dateStr;
    };

    const handleBudgetYearChange = (year: string) => {
        setBudgetYear(year);
        const beYear = parseInt(year, 10) || 2570;
        const ceYear = beYear - 543;
        const s = `${ceYear - 1}-10-01`;
        const e = `${ceYear}-09-30`;

        setStartDate(s);
        setEndDate(e);
        router.get(
            route('rcm.smt.index'),
            {
                budget_source: budgetSource,
                budget_year: year,
                start_date: s,
                end_date: e,
                search: search,
                reconcile_filter: reconcileFilter,
            },
            { preserveState: true }
        );
    };

    const handlePresetDate = (type: string) => {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        const formatDate = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        let s = startDate;
        let e = endDate;
        let by = budgetYear;

        if (type === 'today') {
            const todayStr = formatDate(now);
            s = todayStr;
            e = todayStr;
        } else if (type === 'this_month') {
            s = formatDate(new Date(y, m, 1));
            e = formatDate(new Date(y, m + 1, 0));
        } else if (type === 'last_month') {
            s = formatDate(new Date(y, m - 1, 1));
            e = formatDate(new Date(y, m, 0));
        } else if (type === 'last_3_months') {
            s = formatDate(new Date(y, m - 2, 1));
            e = formatDate(new Date(y, m + 1, 0));
        } else if (type === 'fiscal_2570') {
            s = '2026-10-01';
            e = '2027-09-30';
            by = '2570';
        } else if (type === 'fiscal_2569') {
            s = '2025-10-01';
            e = '2026-09-30';
            by = '2569';
        } else if (type === 'fiscal_2568') {
            s = '2024-10-01';
            e = '2025-09-30';
            by = '2568';
        } else if (type === 'fiscal_2567') {
            s = '2023-10-01';
            e = '2024-09-30';
            by = '2567';
        } else if (type === 'fiscal_2566') {
            s = '2022-10-01';
            e = '2023-09-30';
            by = '2566';
        }

        setStartDate(s);
        setEndDate(e);
        setBudgetYear(by);
        router.get(
            route('rcm.smt.index'),
            {
                budget_source: budgetSource,
                budget_year: by,
                start_date: s,
                end_date: e,
                search: search,
                reconcile_filter: reconcileFilter,
            },
            { preserveState: true }
        );
    };

    const handleSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        router.get(
            route('rcm.smt.index'),
            {
                budget_source: budgetSource,
                budget_year: budgetYear,
                start_date: startDate,
                end_date: endDate,
                search: search,
                reconcile_filter: reconcileFilter,
            },
            { preserveState: true }
        );
    };

    const handleSourceTabChange = (sourceKey: string) => {
        setBudgetSource(sourceKey);
        router.get(
            route('rcm.smt.index'),
            {
                budget_source: sourceKey,
                budget_year: budgetYear,
                start_date: startDate,
                end_date: endDate,
                search: search,
                reconcile_filter: sourceKey === 'lgo' ? reconcileFilter : 'all',
            },
            { preserveState: true }
        );
    };

    const handleReconcileFilterChange = (filterKey: string) => {
        setReconcileFilter(filterKey);
        setBudgetSource('lgo');
        router.get(
            route('rcm.smt.index'),
            {
                budget_source: 'lgo',
                budget_year: budgetYear,
                start_date: startDate,
                end_date: endDate,
                search: search,
                reconcile_filter: filterKey,
            },
            { preserveState: true }
        );
    };

    const handleSync = () => {
        if (isSyncing) return;
        setIsSyncing(true);
        router.post(
            route('rcm.smt.sync'),
            {
                budget_year: budgetYear,
                start_date: startDate,
                end_date: endDate,
                zone_id: filters.zone_id || '06',
                province_id: filters.province_id || '27',
                hcode: filters.hcode || '14689',
            },
            {
                onFinish: () => setIsSyncing(false),
            }
        );
    };

    const handleSyncPdfs = () => {
        if (isSyncingPdfs) return;
        setIsSyncingPdfs(true);
        router.post(
            route('rcm.smt.sync-pdfs'),
            {
                budget_year: budgetYear,
            },
            {
                onFinish: () => setIsSyncingPdfs(false),
            }
        );
    };

    const handleOpenDetail = (transfer: SmtTransfer, initialTab: 'rep' | 'smt' = 'rep') => {
        setSelectedTransfer(transfer);
        // ถ้าเป็น LGO หรือมีข้อมูล REP ให้แสดงแท็บ REP ก่อนเป็นค่าเริ่มต้น
        const defaultTab = transfer.rep_match ? initialTab : 'smt';
        setModalTab(defaultTab);
        setDetailData(null);
        setRepCasesData(null);

        // ดึงข้อมูล SMT Transfer Detail จาก สปสช.
        setLoadingDetail(true);
        fetch(
            route('rcm.smt.detail', {
                batch_no: transfer.batch_no,
                posting_date: transfer.posting_date,
                fiscal_year: transfer.budget_year,
                hcode: transfer.hcode,
            })
        )
            .then((res) => res.json())
            .then((data) => setDetailData(data))
            .catch((err) => console.error('Failed to load detail from SMT', err))
            .finally(() => setLoadingDetail(false));

        // ดึงข้อมูลผู้ป่วยจากตาราง REP (e-Claim) ถ้ามี ref_doc_no
        if (transfer.ref_doc_no) {
            setLoadingRepCases(true);
            fetch(route('rcm.smt.rep-cases', { rep_no: transfer.ref_doc_no }))
                .then((res) => res.json())
                .then((data) => {
                    if (!data.error) {
                        setRepCasesData(data);
                    }
                })
                .catch((err) => console.error('Failed to load REP cases', err))
                .finally(() => setLoadingRepCases(false));
        }
    };

    const fundTabs = [
        { key: 'all', label: 'ทั้งหมด', count: summary.count_all, color: 'text-slate-700 bg-slate-100 border-slate-300' },
        { key: 'lgo', label: 'อปท. (LGO ท้องถิ่น)', count: summary.count_lgo, color: 'text-blue-700 bg-blue-50 border-blue-200' },
        { key: 'lgo_hd', label: 'ไต อปท.', count: summary.count_lgo_hd || 0, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
        { key: 'ckd', label: 'ไตวายเรื้อรัง (CKD)', count: summary.count_ckd, color: 'text-purple-700 bg-purple-50 border-purple-200' },
        { key: 'uc', label: 'บัตรทอง (UC ทั่วไป)', count: summary.count_uc, color: 'text-amber-700 bg-amber-50 border-amber-200' },
        { key: 'dss', label: 'ผู้พิการ (DSS)', count: summary.count_dss, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
        { key: 'covid', label: 'กู้เงิน Covid', count: summary.count_covid, color: 'text-rose-700 bg-rose-50 border-rose-200' },
    ];

    return (
        <RcmLayout title="การจ่ายเงิน สปสช. (SMT / อปท.)" active="smt">
            {/* Header Title & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            Smart Money Transfer (SMT)
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            ปีงบประมาณ {budgetYear}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                            smt.nhso.go.th &bull; เชื่อมโยง REP อปท.
                        </span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mt-1">
                        รายงานการจ่ายเงินจริง สปสช. (SMT / อปท.)
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        แสดงข้อมูลที่ สปสช. โอนจ่ายจริงใน<b>ปีงบประมาณ {budgetYear}</b> (รวมงวดเงินโอนชดเชยของใบแจ้งหนี้ REP ปลายปี 69 ที่จ่ายจริงในต้นปีงบ 70) เชื่อมโยงรายชื่อผู้ป่วยจาก e-Claim อัตโนมัติ
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleSyncPdfs}
                        disabled={isSyncingPdfs}
                        className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium text-xs shadow-2xs"
                        title="ดาวน์โหลดและแนบไฟล์ PDF แจ้งโอนเงินสำหรับงวดที่ยังไม่มีไฟล์"
                    >
                        {isSyncingPdfs ? (
                            <>
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin text-teal-600" />
                                กำลังโหลด PDF...
                            </>
                        ) : (
                            <>
                                <FileDown className="mr-1.5 h-3.5 w-3.5 text-rose-600" />
                                โหลด PDF แจ้งโอนเงิน ({summary.pdf_count || 0}/{summary.count_all})
                            </>
                        )}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-xs font-semibold"
                    >
                        {isSyncing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                กำลังดึงข้อมูลจากเว็บ SMT...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                ⚡ ดึงข้อมูลจากเว็บ SMT อัตโนมัติ
                            </>
                        )}
                    </Button>
                    <a
                        href={route('rcm.smt.export', {
                            budget_source: budgetSource,
                            budget_year: budgetYear,
                            start_date: startDate,
                            end_date: endDate,
                            search: search,
                            reconcile_filter: reconcileFilter,
                        })}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition"
                    >
                        <Download className="w-4 h-4" /> ส่งออก Excel
                    </a>
                </div>
            </div>

            {/* Filter Control Header */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs mb-6 space-y-4">
                {/* Period Shortcuts */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs pb-3 border-b border-slate-100">
                    <span className="font-bold text-slate-600 mr-1">ช่วงเวลาย้อนหลัง:</span>
                    {[
                        { key: 'today', label: 'วันนี้' },
                        { key: 'this_month', label: 'เดือนนี้' },
                        { key: 'last_month', label: 'เดือนที่แล้ว' },
                        { key: 'last_3_months', label: 'ย้อนหลัง 3 เดือน' },
                        { key: 'fiscal_2570', label: 'ปีงบ 2570' },
                        { key: 'fiscal_2569', label: 'ปีงบ 2569' },
                        { key: 'fiscal_2568', label: 'ปีงบ 2568' },
                        { key: 'fiscal_2567', label: 'ปีงบ 2567' },
                        { key: 'fiscal_2566', label: 'ปีงบ 2566' },
                    ].map((p) => (
                        <button
                            key={p.key}
                            type="button"
                            onClick={() => handlePresetDate(p.key)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">เขตพื้นที่ สปสช.</label>
                        <input
                            type="text"
                            value="เขต 6 ระยอง (06)"
                            disabled
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">จังหวัด / รหัส รพ.</label>
                        <input
                            type="text"
                            value="สระแก้ว · 14689 (รพ.ค่ายสุรสิงหนาท)"
                            disabled
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">ปีงบประมาณ</label>
                        <select
                            value={budgetYear}
                            onChange={(e) => handleBudgetYearChange(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-medium"
                        >
                            <option value="2570">ปีงบประมาณ 2570 (1 ต.ค. 69 – 30 ก.ย. 70)</option>
                            <option value="2569">ปีงบประมาณ 2569 (1 ต.ค. 68 – 30 ก.ย. 69)</option>
                            <option value="2568">ปีงบประมาณ 2568 (1 ต.ค. 67 – 30 ก.ย. 68)</option>
                            <option value="2567">ปีงบประมาณ 2567 (1 ต.ค. 66 – 30 ก.ย. 67)</option>
                            <option value="2566">ปีงบประมาณ 2566 (1 ต.ค. 65 – 30 ก.ย. 66)</option>
                        </select>
                    </div>
                    <div className="lg:col-span-2">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">ช่วงวันที่โอนเงิน (พ.ศ.)</label>
                        <div className="flex items-center gap-2">
                            <ThaiDateRangePicker
                                startDate={startDate}
                                endDate={endDate}
                                onChange={(s, e, presetKey) => {
                                    setStartDate(s);
                                    setEndDate(e);
                                    let by = budgetYear;
                                    if (presetKey === 'fiscal_2570') by = '2570';
                                    else if (presetKey === 'fiscal_2569') by = '2569';
                                    else if (presetKey === 'fiscal_2568') by = '2568';
                                    if (by !== budgetYear) {
                                        setBudgetYear(by);
                                    }
                                }}
                                placeholder="เลือกช่วงวันที่โอนเงิน (พ.ศ.)"
                                className="w-full"
                            />
                            <button
                                type="submit"
                                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs shrink-0 transition"
                            >
                                <RefreshCw className="w-3.5 h-3.5 inline mr-1" /> กรองข้อมูล
                            </button>
                        </div>
                    </div>
                </form>

                {/* Fund Tabs */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5" /> แยกกองทุน:
                        </span>
                        {fundTabs.map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => handleSourceTabChange(tab.key)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                                    budgetSource === tab.key
                                        ? `${tab.color} ring-2 ring-teal-500/30 shadow-xs font-bold`
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/80 font-mono shadow-2xs">
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="text-xs text-slate-400">
                        ดึงข้อมูลล่าสุดเมื่อ: <span className="font-semibold text-slate-600">{summary.last_synced_at || 'ยังไม่มีการดึง'}</span>
                    </div>
                </div>
            </div>

            {/* KPI Cards (6 Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">ยอดเงินโอนรวมทุกกองทุน</span>
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                            <Wallet className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-lg font-bold text-slate-800 mt-1">
                        {formatMoney(summary.total_all)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                        {summary.count_all} รายการโอนเงิน (ทั้งหมด)
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-blue-200/80 bg-blue-50/20 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-blue-700">อปท. (LGO ท้องถิ่น)</span>
                        <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                            <Building2 className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-lg font-bold text-blue-700 mt-1">
                        {formatMoney(summary.total_lgo)}
                    </div>
                    <div className="text-[11px] text-blue-600/80 mt-0.5">
                        {summary.count_lgo} รายการ · ตรงกับ REP ในระบบ <b>{summary.matched_lgo_rep_count || 0}</b> งวด
                    </div>
                </div>

                {/* กองทุนไต อปท. (HD) แยกต่างหาก ไม่รวมใน อปท. ทั่วไป */}
                <div className="bg-white p-4 rounded-2xl border border-indigo-200/80 bg-indigo-50/20 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-indigo-700">ไต อปท. (HD)</span>
                        <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
                            <Sparkles className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-lg font-bold text-indigo-700 mt-1">
                        {formatMoney(summary.total_lgo_hd || 0)}
                    </div>
                    <div className="text-[11px] text-indigo-600/80 mt-0.5">
                        {summary.count_lgo_hd || 0} รายการ · ฟอกไต อปท. แยกเฉพาะ
                    </div>
                </div>

                {/* กองทุนไตวายเรื้อรัง (แยกต่างหากชัดเจน ไม่รวมกับ UC) */}
                <div className="bg-white p-4 rounded-2xl border border-purple-200/80 bg-purple-50/20 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-purple-700">กองทุนไตวายเรื้อรัง (CKD)</span>
                        <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
                            <Heart className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-lg font-bold text-purple-700 mt-1">
                        {formatMoney(summary.total_ckd)}
                    </div>
                    <div className="text-[11px] text-purple-600/80 mt-0.5">
                        {summary.count_ckd} รายการ · ฟอกเลือด/ล้างไตแยกเฉพาะ
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-amber-200/80 bg-amber-50/20 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-amber-700">บัตรทอง (UC ทั่วไป)</span>
                        <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                            <Heart className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-lg font-bold text-amber-700 mt-1">
                        {formatMoney(summary.total_uc)}
                    </div>
                    <div className="text-[11px] text-amber-600/80 mt-0.5">
                        {summary.count_uc} รายการ · ไม่รวมไตวายเรื้อรัง
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/20 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-700">ผู้พิการ (DSS) / Covid</span>
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                            <Shield className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-lg font-bold text-emerald-700 mt-1">
                        {formatMoney((summary.total_dss || 0) + (summary.total_covid || 0))}
                    </div>
                    <div className="text-[11px] text-emerald-600/80 mt-0.5">
                        {summary.count_dss + summary.count_covid} รายการโอนเงิน
                    </div>
                </div>
            </div>

            {/* LGO & SMT Reconciliation Matrix Banner */}
            {summary.reconcile_summary && (
                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 mb-6 shadow-md border border-slate-700">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-700/80">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                                    ⚡ กระทบยอดอัตโนมัติ (Automated Reconciliation)
                                </span>
                                <span className="text-xs text-slate-300 font-mono">
                                    จับคู่เลขที่ REP อปท. &bull; ตรวจสอบยอดเงินโอนจริงจาก SMT
                                </span>
                            </div>
                            <h2 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                                <Banknote className="w-5 h-5 text-emerald-400" />
                                สถานะการกระทบยอดเงินโอน อปท. (LGO Reconciliation Summary)
                            </h2>
                            <p className="text-xs text-slate-300 mt-0.5">
                                เปรียบเทียบยอดตั้งเบิกใบแจ้งหนี้ REP อปท. ใน e-Claim กับเงินโอนจริงใน SMT เพื่อยืนยันว่า <b>สปสช. โอนจ่ายครบตามยอดเรียกเก็บหรือไม่</b>
                            </p>
                        </div>

                        {/* Recovery Rate Metric */}
                        {summary.reconcile_summary.total_claimed > 0 && (
                            <div className="bg-slate-800/90 border border-slate-700 px-4 py-2.5 rounded-xl text-right">
                                <div className="text-[11px] text-slate-400 font-medium">อัตราการได้รับชดเชยรวม (Recovery Rate)</div>
                                <div className="text-xl font-black text-emerald-400 font-mono">
                                    {((summary.reconcile_summary.total_smt_paid / summary.reconcile_summary.total_claimed) * 100).toFixed(1)}%
                                </div>
                                <div className="text-[10px] text-slate-400">
                                    เรียกเก็บ {formatMoney(summary.reconcile_summary.total_claimed)} &bull; โอนจริง {formatMoney(summary.reconcile_summary.total_smt_paid)}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 4 Interactive Filter Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* 1. ทั้งหมด */}
                        <button
                            type="button"
                            onClick={() => handleReconcileFilterChange('all')}
                            className={`p-3.5 rounded-xl border text-left transition relative cursor-pointer ${
                                reconcileFilter === 'all' && budgetSource === 'lgo'
                                    ? 'bg-blue-600/30 border-blue-400 ring-2 ring-blue-400/50 shadow-inner'
                                    : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800'
                            }`}
                        >
                            <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
                                <span>งวดโอนเงิน อปท. ทั้งหมด</span>
                                <Layers className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="text-2xl font-bold text-white mt-1">
                                {summary.reconcile_summary.total_lgo_transfers} <span className="text-xs font-normal text-slate-400">งวด</span>
                            </div>
                            <div className="text-xs text-blue-300 font-mono mt-1">
                                ยอดโอน {formatMoney(summary.reconcile_summary.total_smt_paid)}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                                {reconcileFilter === 'all' && budgetSource === 'lgo' ? '● กำลังแสดงทุกงวด' : 'คลิกเพื่อดูทั้งหมด'}
                            </div>
                        </button>

                        {/* 2. จ่ายครบ 100% */}
                        <button
                            type="button"
                            onClick={() => handleReconcileFilterChange('fully_paid')}
                            className={`p-3.5 rounded-xl border text-left transition relative cursor-pointer ${
                                reconcileFilter === 'fully_paid' && budgetSource === 'lgo'
                                    ? 'bg-emerald-600/30 border-emerald-400 ring-2 ring-emerald-400/50 shadow-inner'
                                    : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800'
                            }`}
                        >
                            <div className="flex items-center justify-between text-xs text-emerald-300 font-medium">
                                <span className="flex items-center gap-1">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    จ่ายครบ 100% (ไม่มีส่วนต่าง)
                                </span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/30 text-emerald-300 font-bold">
                                    ครบ
                                </span>
                            </div>
                            <div className="text-2xl font-bold text-emerald-400 mt-1">
                                {summary.reconcile_summary.fully_paid_count} <span className="text-xs font-normal text-slate-400">งวด</span>
                            </div>
                            <div className="text-xs text-emerald-300 font-mono mt-1">
                                ยอดโอน {formatMoney(summary.reconcile_summary.fully_paid_amount)}
                            </div>
                            <div className="text-[10px] text-emerald-200/70 mt-1">
                                {reconcileFilter === 'fully_paid' && budgetSource === 'lgo' ? '● กำลังกรองงวดที่จ่ายครบ' : 'คลิกเพื่อกรองเฉพาะงวดที่จ่ายครบ'}
                            </div>
                        </button>

                        {/* 3. มียอดขาด / ติด C ใน REP */}
                        <button
                            type="button"
                            onClick={() => handleReconcileFilterChange((summary.reconcile_summary.rep_cut_count || 0) > 0 ? 'rep_cut' : 'shortfall')}
                            className={`p-3.5 rounded-xl border text-left transition relative cursor-pointer ${
                                (reconcileFilter === 'shortfall' || reconcileFilter === 'rep_cut') && budgetSource === 'lgo'
                                    ? 'bg-amber-600/30 border-amber-400 ring-2 ring-amber-400/50 shadow-inner'
                                    : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800'
                            }`}
                        >
                            <div className="flex items-center justify-between text-xs text-amber-300 font-medium">
                                <span className="flex items-center gap-1">
                                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                                    โอนครบ (มีติด C ใน REP)
                                </span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/30 text-amber-300 font-bold">
                                    รออุทธรณ์
                                </span>
                            </div>
                            <div className="text-2xl font-bold text-amber-400 mt-1">
                                {(summary.reconcile_summary.rep_cut_count || 0) + (summary.reconcile_summary.shortfall_count || 0)} <span className="text-xs font-normal text-slate-400">งวด</span>
                            </div>
                            <div className="text-xs text-amber-300 font-mono mt-1">
                                ยอดตัด C รวม -{formatMoney((summary.reconcile_summary.rep_cut_amount || 0) + (summary.reconcile_summary.shortfall_amount || 0))}
                            </div>
                            <div className="text-[10px] text-amber-200/80 mt-1">
                                {(reconcileFilter === 'shortfall' || reconcileFilter === 'rep_cut') && budgetSource === 'lgo' ? '● กำลังกรองงวดติด C' : 'คลิกเพื่อกรองงวดที่มีติด C เพื่อส่งอุทธรณ์'}
                            </div>
                        </button>

                        {/* 4. รอนำเข้า REP */}
                        <button
                            type="button"
                            onClick={() => handleReconcileFilterChange('unmatched')}
                            className={`p-3.5 rounded-xl border text-left transition relative cursor-pointer ${
                                reconcileFilter === 'unmatched' && budgetSource === 'lgo'
                                    ? 'bg-amber-600/30 border-amber-400 ring-2 ring-amber-400/50 shadow-inner'
                                    : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800'
                            }`}
                        >
                            <div className="flex items-center justify-between text-xs text-amber-300 font-medium">
                                <span className="flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4 text-amber-400" />
                                    รอนำเข้าไฟล์ REP
                                </span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/30 text-amber-300 font-bold">
                                    รอนำเข้า
                                </span>
                            </div>
                            <div className="text-2xl font-bold text-amber-400 mt-1">
                                {summary.reconcile_summary.unmatched_count} <span className="text-xs font-normal text-slate-400">งวด</span>
                            </div>
                            <div className="text-xs text-amber-300 font-mono mt-1">
                                มีเงินโอน SMT แล้ว แต่ยังไม่พบ REP
                            </div>
                            <div className="text-[10px] text-amber-200/70 mt-1">
                                {reconcileFilter === 'unmatched' && budgetSource === 'lgo' ? '● กำลังกรองงวดรอนำเข้า' : 'คลิกเพื่อดูงวดที่ยังไม่ได้นำเข้า REP'}
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* Main Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden mb-12">
                <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="relative w-80">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                            <input
                                type="text"
                                placeholder="ค้นหาเลข REP, Statement, Batch, กองทุน..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                            />
                        </div>

                        {reconcileFilter !== 'all' && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700">
                                <Filter className="w-3.5 h-3.5 text-slate-500" />
                                <span>ตัวกรอง: <b>{reconcileFilter === 'fully_paid' ? 'จ่ายครบ 100%' : reconcileFilter === 'shortfall' ? 'มียอดขาด/ถูกตัด' : 'รอนำเข้า REP'}</b></span>
                                <button
                                    type="button"
                                    onClick={() => handleReconcileFilterChange('all')}
                                    className="ml-1 text-slate-400 hover:text-slate-600 font-bold"
                                    title="ล้างตัวกรองกระทบยอด"
                                >
                                    &times;
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="text-xs text-slate-500">
                        พบ <span className="font-bold text-slate-800">{items.total}</span> รายการโอนเงิน
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-500">
                                <th className="py-3 px-4">วันที่โอน (พ.ศ.)</th>
                                <th className="py-3 px-4">เลขที่ REP อปท. / เอกสารอ้างอิง</th>
                                <th className="py-3 px-4">ชุดข้อมูล (Batch)</th>
                                <th className="py-3 px-4">กองทุนหลัก</th>
                                <th className="py-3 px-4 text-right">ยอดเรียกเก็บ (REP)</th>
                                <th className="py-3 px-4 text-right">ยอดอนุมัติ (REP)</th>
                                <th className="py-3 px-4 text-right">ยอดโอนจริง (SMT)</th>
                                <th className="py-3 px-4 text-right">ส่วนต่าง / ยอดขาด</th>
                                <th className="py-3 px-4 text-center">สถานะกระทบยอด</th>
                                <th className="py-3 px-4 text-center">แจ้งโอนเงิน (PDF)</th>
                                <th className="py-3 px-4 text-center">รายละเอียด</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {items.data.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="py-12 text-center text-slate-400">
                                        ยังไม่มีข้อมูลการโอนเงินในช่วงเวลานี้ — กรุณากดปุ่ม <b>"⚡ ดึงข้อมูลจากเว็บ SMT อัตโนมัติ"</b> ด้านบน
                                    </td>
                                </tr>
                            ) : (
                                items.data.map((item) => {
                                    const isShortfall = item.rep_match ? item.rep_match.shortfall > 0.01 : false;
                                    return (
                                        <tr
                                            key={item.id}
                                            className={`transition ${
                                                isShortfall
                                                    ? 'bg-rose-50/20 hover:bg-rose-50/50'
                                                    : 'hover:bg-slate-50/80'
                                            }`}
                                        >
                                            <td className="py-3 px-4 font-medium text-slate-800">
                                                <div className="font-semibold text-slate-900">
                                                    {formatDisplayPostingDate(item.posting_date)}
                                                </div>
                                                {item.transfer_date && (
                                                    <div className="text-[11px] text-slate-500 font-sans mt-0.5">
                                                        โอน: {formatDisplayTransferDate(item.transfer_date)}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-mono font-bold text-slate-900 text-sm">
                                                            {item.ref_doc_no || '-'}
                                                        </span>
                                                        {item.is_lgo_hd ? (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-800">
                                                                ไต อปท.
                                                            </span>
                                                        ) : item.budget_source === 'LGO' ? (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                                                                REP อปท.
                                                            </span>
                                                        ) : null}
                                                        {item.is_ckd && (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800">
                                                                DCKD
                                                            </span>
                                                        )}
                                                    </div>

                                                    {item.rep_match ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenDetail(item, 'rep')}
                                                            className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 px-2 py-0.5 rounded-lg w-fit transition text-left cursor-pointer"
                                                            title="คลิกดูรายชื่อผู้ป่วยในงวด REP นี้"
                                                        >
                                                            <Users className="w-3 h-3 text-blue-600 shrink-0" />
                                                            <span>ผู้ป่วย {item.rep_match.case_count} ราย</span>
                                                        </button>
                                                    ) : item.is_lgo_hd ? (
                                                        <span className="text-[10px] text-indigo-500 font-medium">
                                                            กองทุนฟอกเลือด ไต อปท.
                                                        </span>
                                                    ) : item.budget_source === 'LGO' ? (
                                                        <span className="text-[10px] text-slate-400">
                                                            ยังไม่พบไฟล์ REP ในระบบ
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 font-mono text-slate-600">
                                                <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[11px]">
                                                    {item.batch_no}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                {item.is_lgo_hd ? (
                                                    <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[11px]">
                                                        ไต อปท.
                                                    </span>
                                                ) : item.is_ckd ? (
                                                    <span className="px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 font-bold text-[11px]">
                                                        ไตวายเรื้อรัง (CKD)
                                                    </span>
                                                ) : item.budget_source === 'LGO' ? (
                                                    <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[11px]">
                                                        อปท. (LGO)
                                                    </span>
                                                ) : item.budget_source === 'UC' ? (
                                                    <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[11px]">
                                                        บัตรทอง (UC)
                                                    </span>
                                                ) : item.budget_source === 'DSS' ? (
                                                    <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                                                        ผู้พิการ (DSS)
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-medium text-[11px]">
                                                        {item.budget_source}
                                                    </span>
                                                )}
                                                <div className="text-[10px] text-slate-400 truncate max-w-[180px] mt-0.5" title={item.fund_name || ''}>
                                                    {item.fund_name}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">
                                                {item.rep_match ? (
                                                    formatMoney(item.rep_match.total_claim)
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-medium text-sky-700">
                                                {item.rep_match ? (
                                                    formatMoney(item.rep_match.total_approved)
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600" title={`เงินโอนเข้าบัญชี (SMT): ${formatMoney(item.bank_transfer_amount ?? Math.max(0, item.total))}`}>
                                                {formatMoney(item.bank_transfer_amount ?? Math.max(0, item.total))}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono">
                                                {item.rep_match ? (
                                                    item.rep_match.status === 'rep_cut' ? (
                                                        <span className="text-amber-700 font-semibold" title="สปสช. โอนครบตามอนุมัติ แต่มีรายการถูกตัดใน REP รออุทธรณ์">
                                                            ติด C -{formatMoney(item.rep_match.shortfall)}
                                                        </span>
                                                    ) : isShortfall ? (
                                                        <span className="text-rose-600 font-bold" title="สปสช. โอนเงินมาต่ำกว่ายอดอนุมัติจริง">
                                                            ขาด -{formatMoney(item.rep_match.shortfall)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-emerald-600 font-medium">฿0.00</span>
                                                    )
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {item.rep_match ? (
                                                    item.rep_match.status === 'appeal_paid' ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 shadow-2xs" title="งวดชดเชยอุทธรณ์ สปสช. โอนเงินส่วนต่างครบถ้วนแล้ว">
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                                                            ชดเชยอุทธรณ์ครบ
                                                        </span>
                                                    ) : item.rep_match.status === 'fully_paid' ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 shadow-2xs" title="สปสช. โอนเงินครบตามยอดอนุมัติและไม่มีรายการติด C ค้าง">
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                            {item.rep_match.status_label || 'จ่ายครบ 100%'}
                                                        </span>
                                                    ) : item.rep_match.status === 'rep_cut' ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs" title="สปสช. โอนเงินมาครบตามยอดอนุมัติแล้ว แต่ในใบแจ้ง REP มีบางเคสติด C ที่ต้องส่งอุทธรณ์">
                                                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                                            โอนครบ (ติด C รออุทธรณ์)
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 shadow-2xs">
                                                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                                            โอนขาด {formatMoney(item.rep_match.shortfall)}
                                                        </span>
                                                    )
                                                ) : item.budget_source === 'LGO' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">
                                                        <AlertCircle className="w-3 h-3 text-amber-600" />
                                                        รอนำเข้า REP
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] text-slate-400 font-mono">โอนสำเร็จ</span>
                                                )}
                                            </td>
                                            {/* แจ้งโอนเงิน (PDF) */}
                                            <td className="py-3 px-4 text-center">
                                                {item.has_pdf && item.pdf_view_url ? (
                                                    <div className="flex items-center justify-center gap-1">
                                                        <a
                                                            href={item.pdf_view_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/80 transition shadow-2xs group cursor-pointer"
                                                            title={`เปิดดู ${item.pdf_filename || 'ไฟล์ PDF แจ้งโอนเงิน'}`}
                                                        >
                                                            <FileText className="w-3.5 h-3.5 text-purple-600 group-hover:scale-110 transition" />
                                                            <span>เปิด PDF</span>
                                                            <ExternalLink className="w-2.5 h-2.5 text-purple-400" />
                                                        </a>
                                                        {item.pdf_download_url && (
                                                            <a
                                                                href={item.pdf_download_url}
                                                                download
                                                                className="p-1 rounded-md text-slate-400 hover:text-purple-700 hover:bg-purple-50 transition"
                                                                title="ดาวน์โหลดไฟล์ PDF ลงเครื่อง"
                                                            >
                                                                <Download className="w-3 h-3" />
                                                            </a>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-slate-400 font-mono">ไม่มีไฟล์</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenDetail(item, item.rep_match ? 'rep' : 'smt')}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition text-xs font-semibold cursor-pointer"
                                                    title="ดูรายละเอียดการโอนเงิน & ผู้ป่วย"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    <span>ดูข้อมูล</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {items.links && items.links.length > 3 && (
                    <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                        <div className="text-xs text-slate-500">
                            หน้า {items.current_page} จาก {items.last_page}
                        </div>
                        <div className="flex items-center gap-1">
                            {items.links.map((link, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                    disabled={!link.url || link.active}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                    className={`px-2.5 py-1 text-xs rounded-lg transition ${
                                        link.active
                                            ? 'bg-teal-600 text-white font-bold'
                                            : link.url
                                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                            : 'text-slate-300 cursor-not-allowed'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Modal with 2 Tabs: REP Cases & SMT Transfer Info */}
            <Dialog open={!!selectedTransfer} onOpenChange={() => setSelectedTransfer(null)}>
                <DialogContent className="max-w-4xl bg-white rounded-2xl p-6 max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <Banknote className="w-5 h-5 text-teal-600" />
                                รายละเอียดงวดโอนเงิน: {selectedTransfer?.ref_doc_no} (Batch: {selectedTransfer?.batch_no})
                            </DialogTitle>
                            <div className="flex items-center gap-2">
                                {selectedTransfer?.has_pdf && selectedTransfer.pdf_view_url && (
                                    <a
                                        href={selectedTransfer.pdf_view_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition"
                                        title="เปิดดูหนังสือแจ้งการโอนเงิน สปสช. (PDF)"
                                    >
                                        <FileText className="w-3.5 h-3.5" />
                                        <span>เอกสารแจ้งโอนเงิน (PDF)</span>
                                        <ExternalLink className="w-3 h-3 text-white/80" />
                                    </a>
                                )}
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 font-mono">
                                    ยอดโอน: {formatMoney(selectedTransfer?.total || 0)}
                                </span>
                            </div>
                        </div>

                        {/* Modal Tabs */}
                        <div className="flex items-center gap-2 mt-3 pt-1">
                            <button
                                type="button"
                                onClick={() => setModalTab('rep')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                                    modalTab === 'rep'
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                <Users className="w-3.5 h-3.5" />
                                <span>รายชื่อผู้ป่วยใน REP</span>
                                {repCasesData && (
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
                                        {repCasesData.case_count}
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setModalTab('smt')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                                    modalTab === 'smt'
                                        ? 'bg-teal-600 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                <Banknote className="w-3.5 h-3.5" />
                                <span>ข้อมูลเงินโอน สปสช. (SMT)</span>
                            </button>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto py-2">
                        {modalTab === 'rep' ? (
                            <div>
                                {loadingRepCases ? (
                                    <div className="py-12 text-center text-slate-400">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                                        กำลังค้นหารายชื่อผู้ป่วยในงวด REP {selectedTransfer?.ref_doc_no}...
                                    </div>
                                ) : repCasesData && repCasesData.cases.length > 0 ? (
                                    <div className="space-y-3">
                                        {/* REP Summary Header */}
                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs">
                                            <div>
                                                <span className="text-slate-500">เลขที่ REP:</span>
                                                <div className="font-mono font-bold text-blue-900 text-sm">
                                                    {repCasesData.rep_no}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">จำนวนผู้ป่วย:</span>
                                                <div className="font-bold text-slate-800 text-sm">
                                                    {repCasesData.case_count} ราย
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">ยอดตั้งเบิก (Claimed):</span>
                                                <div className="font-bold text-slate-800 text-sm">
                                                    {formatMoney(repCasesData.total_claim)}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">ยอดอนุมัติ (Approved):</span>
                                                <div className="font-bold text-emerald-600 text-sm">
                                                    {formatMoney(repCasesData.total_approved)}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">ยอดขาด (Shortfall):</span>
                                                <div className={`font-bold text-sm ${repCasesData.total_shortfall > 0.01 ? 'text-rose-600 font-mono' : 'text-emerald-600'}`}>
                                                    {repCasesData.total_shortfall > 0.01 ? `-${formatMoney(repCasesData.total_shortfall)}` : '฿0.00'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Shortfall Warning Banner */}
                                        {repCasesData.total_shortfall > 0.01 && (
                                            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                                    <div>
                                                        <span className="font-bold">ตรวจพบยอดขาดชดเชย {formatMoney(repCasesData.total_shortfall)}:</span> มีรายชื่อผู้ป่วยที่ถูกตัดจ่ายหรือไม่ได้รับชดเชยเต็มจำนวน (ไฮไลต์แถวสีแดงด้านล่าง)
                                                    </div>
                                                </div>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-200/80 text-rose-900">
                                                    มีส่วนต่างถูกตัด
                                                </span>
                                            </div>
                                        )}

                                        {/* Patient Table */}
                                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                                                    <tr>
                                                        <th className="py-2.5 px-3">ลำดับ</th>
                                                        <th className="py-2.5 px-3">HN</th>
                                                        <th className="py-2.5 px-3">ชื่อ-นามสกุล (PDPA)</th>
                                                        <th className="py-2.5 px-3">วันที่รับบริการ</th>
                                                        <th className="py-2.5 px-3 text-right">ยอดเรียกเก็บ</th>
                                                        <th className="py-2.5 px-3 text-right">ยอดอนุมัติ</th>
                                                        <th className="py-2.5 px-3 text-right">ยอดขาด</th>
                                                        <th className="py-2.5 px-3 text-center">สถานะ / สาเหตุ</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                                    {repCasesData.cases.map((c, idx) => {
                                                        const isShortfall = c.shortfall > 0.01;
                                                        const isSettled = !!c.is_settled;
                                                        return (
                                                            <tr
                                                                key={c.id}
                                                                className={`transition ${
                                                                    isShortfall
                                                                        ? 'bg-rose-50/60 hover:bg-rose-100/60 font-medium'
                                                                        : isSettled
                                                                        ? 'bg-emerald-50/40 hover:bg-emerald-50/80'
                                                                        : 'hover:bg-slate-50'
                                                                }`}
                                                            >
                                                                <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                                                                <td className="py-2 px-3 font-mono font-medium text-slate-800">{c.hn}</td>
                                                                <td className="py-2 px-3 font-medium text-slate-900">{c.patient_name}</td>
                                                                <td className="py-2 px-3 text-slate-600">{c.visit_date}</td>
                                                                <td className="py-2 px-3 text-right font-mono text-slate-700">{formatMoney(c.amount_claim)}</td>
                                                                <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">{formatMoney(c.amount_approved)}</td>
                                                                <td className="py-2 px-3 text-right font-mono">
                                                                    {isSettled ? (
                                                                        <span className="text-emerald-700 font-semibold" title="ได้รับการชดเชยผ่านการอุทธรณ์แล้ว">
                                                                            ฿0.00 <span className="text-[10px] text-emerald-600 font-normal">(ตัดยอดแล้ว)</span>
                                                                        </span>
                                                                    ) : isShortfall ? (
                                                                        <span className="font-bold text-rose-600">
                                                                            -{formatMoney(c.shortfall)}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-emerald-600 font-medium">฿0.00</span>
                                                                    )}
                                                                </td>
                                                                <td className="py-2 px-3 text-center">
                                                                    {isSettled ? (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                                                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                                            ชดเชยครบ (อุทธรณ์สำเร็จ)
                                                                        </span>
                                                                    ) : isShortfall ? (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                                                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                                                                            {c.error_code ? `ติด C${c.error_code}` : 'ถูกตัดจ่าย'}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                                                            <Check className="w-3 h-3 text-emerald-600" />
                                                                            ผ่าน 100%
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-12 text-center text-slate-400 space-y-2">
                                        <Users className="w-8 h-8 mx-auto text-slate-300" />
                                        <div className="font-semibold text-slate-600">
                                            ไม่พบไฟล์ e-Claim REP เลขที่ {selectedTransfer?.ref_doc_no} ในฐานข้อมูล
                                        </div>
                                        <div className="text-xs text-slate-400 max-w-md mx-auto">
                                            รายการนี้มีเงินโอนจริงจาก สปสช. SMT แล้ว แต่ยังไม่ได้นำเข้าไฟล์ REP ของ อปท. เข้าสู่ระบบ
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div>
                                {loadingDetail ? (
                                    <div className="py-12 text-center text-slate-400">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                                        กำลังเชื่อมต่อดึงข้อมูลรายละเอียดจากเว็บ SMT สปสช....
                                    </div>
                                ) : detailData ? (
                                    <div className="space-y-4 text-xs">
                                        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                            <div>
                                                <span className="text-slate-400">หน่วยบริการ:</span>
                                                <div className="font-semibold text-slate-800">
                                                    {detailData.vendorName || 'โรงพยาบาลค่ายสุรสิงหนาท'} ({selectedTransfer?.hcode})
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-slate-400">เขต / จังหวัด:</span>
                                                <div className="font-semibold text-slate-800">
                                                    {detailData.zoneName || 'เขต 6 ระยอง'} · {detailData.provinceName || 'สระแก้ว'}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-slate-400">วันที่โอนเงินในระบบ:</span>
                                                <div className="font-semibold text-slate-800">
                                                    {formatDisplayPostingDate(selectedTransfer?.posting_date)} {selectedTransfer?.transfer_date ? `(โอน: ${formatDisplayTransferDate(selectedTransfer.transfer_date)})` : (detailData.displayDate ? `(${detailData.displayDate})` : '')}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-slate-400">ยอดเงินโอนสุทธิ:</span>
                                                <div className="font-bold text-emerald-600 text-sm">
                                                    {formatMoney(selectedTransfer?.total || 0)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Items inside batch */}
                                        {detailData.datas && detailData.datas.length > 0 && (
                                            <div>
                                                <h4 className="font-bold text-slate-700 mb-2">รายการกองทุนย่อยในงวดนี้ ({detailData.datas.length} รายการ):</h4>
                                                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                                                    {detailData.datas.map((d: any, idx: number) => (
                                                        <div key={idx} className="p-3 hover:bg-slate-50 flex items-center justify-between">
                                                            <div>
                                                                <div className="font-semibold text-slate-800">{d.fundName}</div>
                                                                <div className="text-[11px] text-slate-400 font-mono">
                                                                    Ref: {d.refDocNo} · MOU: {d.mouGrpCode}
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="font-bold text-emerald-600 font-mono">
                                                                    {formatMoney(d.total || 0)}
                                                                </div>
                                                                <div className="text-[10px] text-slate-400">{d.bankNm}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {selectedTransfer?.moph_desc && (
                                            <div className="p-3 rounded-xl bg-teal-50 border border-teal-100 text-teal-800 text-[11px]">
                                                <span className="font-bold">ผังบัญชี สป.สธ.:</span> {selectedTransfer.moph_id} - {selectedTransfer.moph_desc}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="py-6 text-center text-slate-400">
                                        ไม่พบข้อมูลรายละเอียดเพิ่มเติมจาก SMT
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="border-t border-slate-100 pt-3">
                        <Button
                            type="button"
                            onClick={() => setSelectedTransfer(null)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs"
                        >
                            ปิดหน้าต่าง
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </RcmLayout>
    );
}
