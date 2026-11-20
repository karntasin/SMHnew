import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    Banknote,
    Building2,
    Calendar,
    CheckCircle2,
    Download,
    Eye,
    Heart,
    Layers,
    Loader2,
    RefreshCw,
    Search,
    Shield,
    Sparkles,
    Wallet,
    X,
} from 'lucide-react';
import { QualityPage, Panel, StatusPill } from '@/components/quality/quality-ui';
import DataHubSubNav, { dataHubBreadcrumbs } from '../DataHub/DataHubSubNav';
import { Button } from '@/components/ui/button';
import { ThaiDateRangePicker } from '@/components/date-range-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface RepMatchInfo {
    matched: boolean;
    case_count: number;
    total_claim: number;
    total_approved: number;
    shortfall: number;
}

interface SmtTransfer {
    id: number;
    budget_source: string;
    is_ckd: boolean;
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
    is_lgo_hd?: boolean;
    bank_transfer_amount?: number;
    moph_id: string | null;
    moph_desc: string | null;
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
    last_synced_at: string | null;
    matched_lgo_rep_count?: number;
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

export default function NhsoSmtIndex({ filters, items, summary }: Props) {
    const [budgetSource, setBudgetSource] = useState(filters.budget_source || 'all');
    const [budgetYear, setBudgetYear] = useState(filters.budget_year || '2570');
    const [startDate, setStartDate] = useState(filters.start_date || '2026-10-01');
    const [endDate, setEndDate] = useState(filters.end_date || '2027-09-30');
    const [search, setSearch] = useState(filters.search || '');
    const [isSyncing, setIsSyncing] = useState(false);

    // Detail Modal state
    const [selectedTransfer, setSelectedTransfer] = useState<SmtTransfer | null>(null);
    const [detailData, setDetailData] = useState<any>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

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
            route('finance.smt.index'),
            {
                budget_source: budgetSource,
                budget_year: year,
                start_date: s,
                end_date: e,
                search: search,
            },
            { preserveState: true }
        );
    };

    const handleSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        router.get(
            route('finance.smt.index'),
            {
                budget_source: budgetSource,
                budget_year: budgetYear,
                start_date: startDate,
                end_date: endDate,
                search: search,
            },
            { preserveState: true }
        );
    };

    const handleSourceTabChange = (sourceKey: string) => {
        setBudgetSource(sourceKey);
        router.get(
            route('finance.smt.index'),
            {
                budget_source: sourceKey,
                budget_year: budgetYear,
                start_date: startDate,
                end_date: endDate,
                search: search,
            },
            { preserveState: true }
        );
    };

    const handleSync = () => {
        if (isSyncing) return;
        setIsSyncing(true);
        router.post(
            route('finance.smt.sync'),
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

    const handleOpenDetail = async (transfer: SmtTransfer) => {
        setSelectedTransfer(transfer);
        setLoadingDetail(true);
        setDetailData(null);
        try {
            const res = await fetch(
                route('finance.smt.detail', {
                    batch_no: transfer.batch_no,
                    posting_date: transfer.posting_date,
                    fiscal_year: transfer.budget_year,
                    hcode: transfer.hcode,
                })
            );
            const data = await res.json();
            setDetailData(data);
        } catch (err) {
            console.error('Failed to load detail from SMT', err);
        } finally {
            setLoadingDetail(false);
        }
    };

    const fundTabs = [
        { key: 'all', label: 'ทั้งหมด', count: summary.count_all, color: 'text-slate-700 bg-slate-100 border-slate-300' },
        { key: 'lgo', label: 'อปท. (LGO)', count: summary.count_lgo, color: 'text-blue-700 bg-blue-50 border-blue-200' },
        { key: 'lgo_hd', label: 'ไต อปท.', count: summary.count_lgo_hd || 0, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
        { key: 'uc', label: 'บัตรทอง (UC)', count: summary.count_uc, color: 'text-amber-700 bg-amber-50 border-amber-200' },
        { key: 'ckd', label: 'ไตวายเรื้อรัง (CKD)', count: summary.count_ckd, color: 'text-purple-700 bg-purple-50 border-purple-200' },
        { key: 'dss', label: 'ผู้พิการ (DSS)', count: summary.count_dss, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
        { key: 'covid', label: 'กู้เงิน Covid', count: summary.count_covid, color: 'text-rose-700 bg-rose-50 border-rose-200' },
    ];

    return (
        <QualityPage
            tone="emerald"
            icon={Banknote}
            badge={`SMT Smart Money Transfer · ปีงบประมาณ ${budgetYear}`}
            title="รายงานการจ่ายเงิน สปสช. (SMT)"
            subtitle={`ตรวจสอบรายงานการโอนเงินชดเชยค่าบริการสาธารณสุขปีงบประมาณ ${budgetYear} แยกรายกองทุน (อปท., บัตรทอง, ไตวายเรื้อรัง, ผู้พิการ, Covid)`}
            breadcrumbs={dataHubBreadcrumbs({ title: 'การจ่ายเงิน SMT', href: route('finance.smt.index') })}
            headTitle="การจ่ายเงิน สปสช. SMT"
            subNav={<DataHubSubNav active="finance.smt.index" />}
            actions={
                <div className="flex items-center gap-2">
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
                        href={route('finance.smt.export', {
                            budget_source: budgetSource,
                            budget_year: budgetYear,
                            start_date: startDate,
                            end_date: endDate,
                            search: search,
                        })}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition"
                    >
                        <Download className="w-4 h-4" /> ส่งออก Excel
                    </a>
                </div>
            }
        >
            {/* Filter Control Header */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs mb-6 space-y-4">
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
                                    else if (presetKey === 'fiscal_2567') by = '2567';
                                    else if (presetKey === 'fiscal_2566') by = '2566';
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
                        {summary.count_lgo} รายการ · สวัสดิการพนักงาน อปท.
                    </div>
                </div>

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

                <div className="bg-white p-4 rounded-2xl border border-purple-200/80 bg-purple-50/20 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-purple-700">กองทุนไตวายเรื้อรัง (CKD)</span>
                        <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
                            <Sparkles className="w-4 h-4" />
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

            {/* Main Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden mb-12">
                <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="relative w-80">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                            type="text"
                            placeholder="ค้นหาเลข Statement, Batch, ชื่อกองทุน..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                        />
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
                                <th className="py-3 px-4">เลขที่ REP อปท. / เลขที่เอกสารอ้างอิง</th>
                                <th className="py-3 px-4">ชุดข้อมูล (Batch)</th>
                                <th className="py-3 px-4">กองทุนหลัก</th>
                                <th className="py-3 px-4">กองทุนย่อย / รายการ</th>
                                <th className="py-3 px-4 text-right">ยอดเงินโอนสุทธิ</th>
                                <th className="py-3 px-4">ธนาคาร / เลขที่บัญชี</th>
                                <th className="py-3 px-4">รหัสผังบัญชี สป.สธ.</th>
                                <th className="py-3 px-4 text-center">รายละเอียด</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {items.data.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-12 text-center text-slate-400">
                                        ยังไม่มีข้อมูลการโอนเงินในช่วงเวลานี้ — กรุณากดปุ่ม <b>"⚡ ดึงข้อมูลจากเว็บ SMT อัตโนมัติ"</b> ด้านบน
                                    </td>
                                </tr>
                            ) : (
                                items.data.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
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
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-lg w-fit">
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                                        <span>ตรงกับ REP ({item.rep_match.case_count} เคส)</span>
                                                    </span>
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
                                        </td>
                                        <td className="py-3 px-4 font-medium text-slate-800 max-w-xs truncate" title={item.fund_name || ''}>
                                            {item.fund_name || '-'}
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600" title={`เงินโอนเข้าบัญชี (SMT): ${formatMoney(item.bank_transfer_amount ?? Math.max(0, item.total))}`}>
                                            {formatMoney(item.bank_transfer_amount ?? Math.max(0, item.total))}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="font-medium text-slate-800">{item.bank_name || '-'}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">{item.bank_account_no}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="font-mono text-slate-700">{item.moph_id || '-'}</div>
                                            <div className="text-[10px] text-slate-400 max-w-xs truncate">{item.moph_desc}</div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenDetail(item)}
                                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                                                title="ดูรายละเอียดจาก สปสช."
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
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

            {/* Detail Modal */}
            <Dialog open={!!selectedTransfer} onOpenChange={() => setSelectedTransfer(null)}>
                <DialogContent className="max-w-2xl bg-white rounded-2xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                            <Banknote className="w-5 h-5 text-teal-600" />
                            รายละเอียดการโอนเงินงวด {selectedTransfer?.ref_doc_no} (Batch: {selectedTransfer?.batch_no})
                        </DialogTitle>
                    </DialogHeader>

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
                                        {selectedTransfer?.posting_date} ({detailData.displayDate || '-'})
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

                    <DialogFooter>
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
        </QualityPage>
    );
}
