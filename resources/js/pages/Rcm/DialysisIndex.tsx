import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import RcmLayout from './RcmLayout';
import {
    Activity,
    FileSpreadsheet,
    FileText,
    ArrowUpRight,
    ArrowDownRight,
    CheckCircle2,
    AlertCircle,
    Clock,
    Search,
    X,
    Filter,
    HelpCircle,
    ChevronRight,
    Calendar,
    Building2,
    AlertTriangle,
    ExternalLink,
    Coins,
    Pill,
    Droplets,
    Receipt,
    Banknote,
    FileCheck,
} from 'lucide-react';

interface DialysisRow {
    month_key: string;
    month_label_th: string;
    month_short_th?: string;
    year_th: number;
    short_year_th?: string;
    short_label_th?: string;
    full_label_th: string;
    hosxp_cases: number;
    hosxp_income: number;
    hosxp_uc_money: number;
    hosxp_cash: number;
    hosxp_drug_epo: number;
    hosxp_hd_fee: number;
    rep_cases: number;
    rep_claim: number;
    rep_approved: number;
    rep_drug: number;
    rep_c_deny_cases: number;
    rep_c_deny_amount: number;
    smt_batches: number;
    smt_total_transferred: number;
    smt_ckd_amount: number;
    smt_lgo_hd_amount: number;
    diff_hosxp_rep: number;
    diff_rep_smt: number;
    diff_hosxp_smt: number;
    unclaimed_cases: number;
    recovery_rate: number;
    status: string;
    status_label: string;
}

interface DialysisTotals {
    hosxp_cases: number;
    hosxp_income: number;
    hosxp_uc_money: number;
    hosxp_cash: number;
    hosxp_drug_epo: number;
    hosxp_hd_fee: number;
    rep_cases: number;
    rep_claim: number;
    rep_approved: number;
    rep_drug: number;
    rep_c_deny_cases: number;
    rep_c_deny_amount: number;
    smt_batches: number;
    smt_total_transferred: number;
    smt_ckd_amount: number;
    smt_lgo_hd_amount: number;
    diff_hosxp_rep: number;
    diff_rep_smt: number;
    diff_hosxp_smt: number;
    unclaimed_cases: number;
    recovery_rate: number;
}

interface DialysisComparisonData {
    budget_year: number;
    scheme: string;
    service_type: string;
    start_date: string;
    end_date: string;
    hosxp_ready: boolean;
    rows: DialysisRow[];
    totals: DialysisTotals;
}

interface DialysisIndexProps {
    filters: {
        budget_year: number;
        scheme: string;
        service_type: string;
    };
    comparison: DialysisComparisonData;
    hosxp_ready: boolean;
}

export default function DialysisIndex({ filters, comparison, hosxp_ready }: DialysisIndexProps) {
    const [budgetYear, setBudgetYear] = useState<number>(filters.budget_year || 2570);
    const [scheme, setScheme] = useState<string>(filters.scheme || 'all');
    const [serviceType, setServiceType] = useState<string>(filters.service_type || 'all');

    // Drill-Down Modal State
    const [drillModalOpen, setDrillModalOpen] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<DialysisRow | null>(null);
    const [drillTab, setDrillTab] = useState<'hosxp_visits' | 'smt_transfers' | 'rep_cases' | 'c_deny'>('hosxp_visits');
    const [drillItems, setDrillItems] = useState<any[]>([]);
    const [loadingDrill, setLoadingDrill] = useState(false);

    const navigateTo = (by: number, sch: string, st: string) => {
        router.get(
            route('rcm.dialysis.index'),
            {
                budget_year: by,
                scheme: sch,
                service_type: st,
            },
            { preserveState: true }
        );
    };

    const handleBudgetYearChange = (year: number) => {
        setBudgetYear(year);
        navigateTo(year, scheme, serviceType);
    };

    const handleSchemeChange = (newScheme: string) => {
        setScheme(newScheme);
        navigateTo(budgetYear, newScheme, serviceType);
    };

    const handleServiceTypeChange = (newType: string) => {
        setServiceType(newType);
        navigateTo(budgetYear, scheme, newType);
    };

    const openDrillDown = async (
        row: DialysisRow,
        tab: 'hosxp_visits' | 'smt_transfers' | 'rep_cases' | 'c_deny' = 'hosxp_visits'
    ) => {
        setSelectedMonth(row);
        setDrillTab(tab);
        setDrillModalOpen(true);
        setLoadingDrill(true);

        try {
            const url = new URL(route('rcm.dialysis.drill-down'), window.location.origin);
            url.searchParams.set('month_key', row.month_key);
            url.searchParams.set('scheme', scheme);
            url.searchParams.set('tab', tab);

            const res = await fetch(url.toString());
            const data = await res.json();
            setDrillItems(data.items || []);
        } catch (err) {
            console.error('Failed to load drill-down data', err);
            setDrillItems([]);
        } finally {
            setLoadingDrill(false);
        }
    };

    const switchDrillTab = async (tab: 'hosxp_visits' | 'smt_transfers' | 'rep_cases' | 'c_deny') => {
        if (!selectedMonth) return;
        setDrillTab(tab);
        setLoadingDrill(true);

        try {
            const url = new URL(route('rcm.dialysis.drill-down'), window.location.origin);
            url.searchParams.set('month_key', selectedMonth.month_key);
            url.searchParams.set('scheme', scheme);
            url.searchParams.set('tab', tab);

            const res = await fetch(url.toString());
            const data = await res.json();
            setDrillItems(data.items || []);
        } catch (err) {
            console.error('Failed to load drill-down data', err);
            setDrillItems([]);
        } finally {
            setLoadingDrill(false);
        }
    };

    const formatMoney = (val: number) =>
        new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(val);

    const formatNumber = (val: number) =>
        new Intl.NumberFormat('th-TH').format(val);

    const getStatusBadge = (status: string, label: string) => {
        switch (status) {
            case 'settled_full':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {label}
                    </span>
                );
            case 'settled_almost':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-300">
                        <CheckCircle2 className="w-3 h-3 text-teal-600" />
                        {label}
                    </span>
                );
            case 'pending_smt_part':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                        <Clock className="w-3 h-3 text-amber-600" />
                        {label}
                    </span>
                );
            case 'awaiting_smt':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-300">
                        <Clock className="w-3 h-3 text-blue-600" />
                        {label}
                    </span>
                );
            case 'unclaimed':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-300">
                        <AlertCircle className="w-3 h-3 text-rose-600" />
                        {label}
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        {label}
                    </span>
                );
        }
    };

    const totals = comparison.totals;

    return (
        <RcmLayout title="เปรียบเทียบไตเทียม 3 ฝ่าย" active="dialysis">
            {/* Header Area */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-tr from-sky-600 to-teal-500 rounded-xl text-white shadow-sm">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                เปรียบเทียบข้อมูลไตเทียม 3 ฝ่าย (Hemodialysis Reconciliation)
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                                    แผนกไตเทียม 021 vs SMT
                                </span>
                            </h1>
                            <p className="text-xs text-slate-500 mt-0.5">
                                เปรียบเทียบข้อมูลบริการผู้ป่วยไตเทียม (HOSxP) กับยอดส่งเบิก (e-Claim REP) และยอดเงินโอนจริงจาก สปสช. (SMT)
                            </p>
                        </div>
                    </div>
                </div>

                {/* Export Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                    <a
                        href={route('rcm.dialysis.export-excel', {
                            budget_year: budgetYear,
                            scheme,
                            service_type: serviceType,
                        })}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-2xs transition-colors"
                    >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        ส่งออก Excel
                    </a>
                    <a
                        href={route('rcm.dialysis.export-pdf', {
                            budget_year: budgetYear,
                            scheme,
                            service_type: serviceType,
                        })}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium shadow-2xs transition-colors"
                    >
                        <FileText className="w-3.5 h-3.5" />
                        ส่งออก PDF
                    </a>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {/* Budget Year */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            ปีงบประมาณ
                        </label>
                        <select
                            value={budgetYear}
                            onChange={(e) => handleBudgetYearChange(Number(e.target.value))}
                            className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                            {[2570, 2569, 2568, 2567].map((yr) => (
                                <option key={yr} value={yr}>
                                    ปีงบประมาณ {yr} ({yr - 543})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Scheme */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-500" />
                            สิทธิการรักษา
                        </label>
                        <select
                            value={scheme}
                            onChange={(e) => handleSchemeChange(e.target.value)}
                            className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                            <option value="all">ทุกสิทธิการรักษา (All Schemes)</option>
                            <option value="lgo">สิทธิ อปท. (LGO HD)</option>
                            <option value="ucs">สิทธิบัตรทอง (UCS / ไตวายเรื้อรัง)</option>
                            <option value="cgd">สิทธิจ่ายตรง กรมบัญชีกลาง (OFC/CGD)</option>
                            <option value="sss">สิทธิประกันสังคม (SSS)</option>
                        </select>
                    </div>

                    {/* Service Type */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                            <Droplets className="w-3.5 h-3.5 text-slate-500" />
                            ประเภทบริการไตเทียม
                        </label>
                        <select
                            value={serviceType}
                            onChange={(e) => handleServiceTypeChange(e.target.value)}
                            className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                            <option value="all">บริการไตเทียมทั้งหมด (All Services)</option>
                            <option value="epo_drug">เฉพาะค่ายา EPO / กระตุ้นเลือด</option>
                            <option value="hd_fee">เฉพาะค่าหัตถการฟอกเลือด (HD Fee)</option>
                        </select>
                    </div>

                    {/* Database Connection Status */}
                    <div className="flex flex-col justify-end">
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                            <span className={`w-2 h-2 rounded-full ${hosxp_ready ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                            <span className="text-slate-600 font-medium">
                                HOSxP Database: {hosxp_ready ? 'เชื่อมต่อพร้อมใช้งาน' : 'ไม่สามารถเชื่อมต่อได้'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Cards: 4 Key Dimensions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* 1. HOSxP Dialysis */}
                <div className="bg-white rounded-2xl p-4 border border-sky-100 shadow-2xs relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50 rounded-bl-full pointer-events-none -mr-4 -mt-4 opacity-70" />
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-sky-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Activity className="w-4 h-4 text-sky-600" />
                            [1] HOSxP ไตเทียม (แผนก 021)
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                            {formatNumber(totals.hosxp_cases)} ครั้ง
                        </span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 tracking-tight">
                        {formatMoney(totals.hosxp_uc_money)}
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>ค่ายา EPO รวม:</span>
                        <span className="font-semibold text-sky-700">{formatMoney(totals.hosxp_drug_epo)}</span>
                    </div>
                </div>

                {/* 2. e-Claim / REP */}
                <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-2xs relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full pointer-events-none -mr-4 -mt-4 opacity-70" />
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Receipt className="w-4 h-4 text-amber-600" />
                            [2] ส่งเบิก e-Claim / REP
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            {formatNumber(totals.rep_cases)} เคส
                        </span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 tracking-tight">
                        {formatMoney(totals.rep_approved)}
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>เรียกเก็บ: {formatMoney(totals.rep_claim)}</span>
                        {totals.rep_c_deny_amount > 0 && (
                            <span className="font-semibold text-rose-600 flex items-center gap-0.5">
                                <AlertTriangle className="w-3 h-3" />
                                ติด C: {formatMoney(totals.rep_c_deny_amount)}
                            </span>
                        )}
                    </div>
                </div>

                {/* 3. SMT NHSO Transferred */}
                <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-2xs relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full pointer-events-none -mr-4 -mt-4 opacity-70" />
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Banknote className="w-4 h-4 text-emerald-600" />
                            [3] สปสช. SMT (เงินโอนจริง)
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            {formatNumber(totals.smt_batches)} งวดโอน
                        </span>
                    </div>
                    <div className="text-2xl font-black text-emerald-600 tracking-tight">
                        {formatMoney(totals.smt_total_transferred)}
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>ไต อปท: {formatMoney(totals.smt_lgo_hd_amount)}</span>
                        <span>ไตวาย CKD: {formatMoney(totals.smt_ckd_amount)}</span>
                    </div>
                </div>

                {/* 4. Recovery Rate & Summary */}
                <div className="bg-white rounded-2xl p-4 border border-indigo-100 shadow-2xs relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full pointer-events-none -mr-4 -mt-4 opacity-70" />
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Coins className="w-4 h-4 text-indigo-600" />
                            [4] อัตราการชดเชยจริง
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${totals.recovery_rate >= 90 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {totals.recovery_rate}%
                        </span>
                    </div>
                    <div className="text-2xl font-black text-indigo-900 tracking-tight">
                        {formatMoney(Math.abs(totals.diff_hosxp_smt))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>{totals.diff_hosxp_smt > 0 ? 'ยอดรอรับชดเชยสุทธิ:' : 'ชดเชยเกินกว่าลูกหนี้:'}</span>
                        <span className={`font-semibold ${totals.diff_hosxp_smt > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {formatMoney(totals.diff_hosxp_smt)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Reconciliation Comparison Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden mb-8">
                <div className="p-4 border-b border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            ตารางเปรียบเทียบข้อมูล 3 ฝ่าย รายเดือน (ต.ค. - ก.ย. ปีงบประมาณ {budgetYear})
                        </h2>
                        <p className="text-xs text-slate-500">
                            คลิกที่แถวของแต่ละเดือนเพื่อเจาะลึกดูรายชื่อเคสรับบริการ HOSxP, งวดโอนเงิน SMT, หรือผลการเบิกจ่าย
                        </p>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                        หน่วยเงิน: บาท (THB)
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200 bg-slate-100 sticky left-0 z-10">
                                    เดือน/ปี
                                </th>
                                <th colSpan={3} className="py-2 px-3 text-center border-r border-slate-200 bg-sky-50 text-sky-900 font-bold">
                                    [1] HOSxP ไตเทียม (021)
                                </th>
                                <th colSpan={3} className="py-2 px-3 text-center border-r border-slate-200 bg-amber-50 text-amber-900 font-bold">
                                    [2] e-Claim / REP ไตเทียม
                                </th>
                                <th colSpan={2} className="py-2 px-3 text-center border-r border-slate-200 bg-emerald-50 text-emerald-900 font-bold">
                                    [3] สปสช. SMT โอนเงินจริง
                                </th>
                                <th colSpan={3} className="py-2 px-3 text-center bg-indigo-50 text-indigo-900 font-bold">
                                    [4] ผลต่าง & อัตราการชดเชย
                                </th>
                                <th rowSpan={2} className="py-2.5 px-3 text-center border-l border-slate-200">
                                    การจัดการ
                                </th>
                            </tr>
                            <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
                                {/* HOSxP */}
                                <th className="py-1.5 px-2.5 text-right bg-sky-50/50">ครั้งฟอกไต</th>
                                <th className="py-1.5 px-2.5 text-right bg-sky-50/50">ลูกหนี้สิทธิ (฿)</th>
                                <th className="py-1.5 px-2.5 text-right bg-sky-50/50 border-r border-slate-200">ยา EPO (฿)</th>

                                {/* REP */}
                                <th className="py-1.5 px-2.5 text-right bg-amber-50/50">เคสเบิก</th>
                                <th className="py-1.5 px-2.5 text-right bg-amber-50/50">ยอดตั้งเบิก (฿)</th>
                                <th className="py-1.5 px-2.5 text-right bg-amber-50/50 border-r border-slate-200">ยอดอนุมัติ (฿)</th>

                                {/* SMT */}
                                <th className="py-1.5 px-2.5 text-right bg-emerald-50/50">งวดโอน</th>
                                <th className="py-1.5 px-2.5 text-right bg-emerald-50/50 border-r border-slate-200">เงินโอนจริง (฿)</th>

                                {/* Diff & Rate */}
                                <th className="py-1.5 px-2.5 text-right bg-indigo-50/50">ค้างส่งเบิก (฿)</th>
                                <th className="py-1.5 px-2.5 text-right bg-indigo-50/50">ชดเชย (%)</th>
                                <th className="py-1.5 px-2.5 text-center bg-indigo-50/50">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {comparison.rows.map((row) => (
                                <tr
                                    key={row.month_key}
                                    className="hover:bg-sky-50/40 transition-colors cursor-pointer group"
                                    onClick={() => openDrillDown(row, 'hosxp_visits')}
                                >
                                    <td className="py-2.5 px-3 font-bold text-slate-900 border-r border-slate-200 bg-white group-hover:bg-sky-50/40 sticky left-0 z-10 whitespace-nowrap">
                                        {row.short_label_th || row.full_label_th}
                                    </td>

                                    {/* HOSxP */}
                                    <td className="py-2.5 px-2.5 text-right bg-sky-50/10 font-medium">
                                        {formatNumber(row.hosxp_cases)}
                                    </td>
                                    <td className="py-2.5 px-2.5 text-right bg-sky-50/10 font-bold text-slate-900">
                                        {formatMoney(row.hosxp_uc_money)}
                                    </td>
                                    <td className="py-2.5 px-2.5 text-right bg-sky-50/10 text-sky-700 border-r border-slate-200">
                                        {formatMoney(row.hosxp_drug_epo)}
                                    </td>

                                    {/* REP */}
                                    <td className="py-2.5 px-2.5 text-right bg-amber-50/10 font-medium">
                                        {formatNumber(row.rep_cases)}
                                    </td>
                                    <td className="py-2.5 px-2.5 text-right bg-amber-50/10 text-slate-600">
                                        {formatMoney(row.rep_claim)}
                                    </td>
                                    <td className="py-2.5 px-2.5 text-right bg-amber-50/10 font-bold text-slate-800 border-r border-slate-200">
                                        {formatMoney(row.rep_approved)}
                                    </td>

                                    {/* SMT */}
                                    <td className="py-2.5 px-2.5 text-right bg-emerald-50/10 font-medium">
                                        {formatNumber(row.smt_batches)}
                                    </td>
                                    <td className="py-2.5 px-2.5 text-right bg-emerald-50/10 font-black text-emerald-700 border-r border-slate-200">
                                        {formatMoney(row.smt_total_transferred)}
                                    </td>

                                    {/* Diff */}
                                    <td className={`py-2.5 px-2.5 text-right font-medium ${row.diff_hosxp_rep > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                                        {formatMoney(row.diff_hosxp_rep)}
                                    </td>
                                    <td className="py-2.5 px-2.5 text-right font-bold text-indigo-700">
                                        {row.recovery_rate}%
                                    </td>
                                    <td className="py-2.5 px-2.5 text-center">
                                        {getStatusBadge(row.status, row.status_label)}
                                    </td>

                                    {/* Actions */}
                                    <td className="py-2.5 px-3 text-center border-l border-slate-200">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openDrillDown(row, 'hosxp_visits');
                                            }}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors"
                                        >
                                            เจาะลึก
                                            <ChevronRight className="w-3 h-3" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {/* Table Footer: Totals */}
                        <tfoot>
                            <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                                <td className="py-3 px-3 text-left border-r border-slate-200 sticky left-0 bg-slate-100 z-10">
                                    รวมทั้งสิ้น ปีงบ {budgetYear}
                                </td>
                                <td className="py-3 px-2.5 text-right bg-sky-100/50">
                                    {formatNumber(totals.hosxp_cases)}
                                </td>
                                <td className="py-3 px-2.5 text-right bg-sky-100/50 text-slate-900">
                                    {formatMoney(totals.hosxp_uc_money)}
                                </td>
                                <td className="py-3 px-2.5 text-right bg-sky-100/50 text-sky-800 border-r border-slate-200">
                                    {formatMoney(totals.hosxp_drug_epo)}
                                </td>
                                <td className="py-3 px-2.5 text-right bg-amber-100/50">
                                    {formatNumber(totals.rep_cases)}
                                </td>
                                <td className="py-3 px-2.5 text-right bg-amber-100/50">
                                    {formatMoney(totals.rep_claim)}
                                </td>
                                <td className="py-3 px-2.5 text-right bg-amber-100/50 border-r border-slate-200">
                                    {formatMoney(totals.rep_approved)}
                                </td>
                                <td className="py-3 px-2.5 text-right bg-emerald-100/50">
                                    {formatNumber(totals.smt_batches)}
                                </td>
                                <td className="py-3 px-2.5 text-right bg-emerald-100/50 text-emerald-800 border-r border-slate-200">
                                    {formatMoney(totals.smt_total_transferred)}
                                </td>
                                <td className="py-3 px-2.5 text-right text-amber-800">
                                    {formatMoney(totals.diff_hosxp_rep)}
                                </td>
                                <td className="py-3 px-2.5 text-right text-indigo-800 text-sm">
                                    {totals.recovery_rate}%
                                </td>
                                <td className="py-3 px-2.5 text-center text-emerald-700">
                                    ภาพรวมทั้งปี
                                </td>
                                <td className="py-3 px-3 text-center border-l border-slate-200">
                                    -
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Drill-Down Modal */}
            {drillModalOpen && selectedMonth && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-sky-100 text-sky-700 rounded-lg">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        ข้อมูลเจาะลึกประจำเดือน: {selectedMonth.full_label_th}
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        ลูกหนี้ HOSxP: {formatMoney(selectedMonth.hosxp_uc_money)} | เงินโอน SMT: {formatMoney(selectedMonth.smt_total_transferred)}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDrillModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Tabs */}
                        <div className="px-4 border-b border-slate-200 bg-slate-50/30 flex items-center gap-2 overflow-x-auto">
                            <button
                                type="button"
                                onClick={() => switchDrillTab('hosxp_visits')}
                                className={`py-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                                    drillTab === 'hosxp_visits'
                                        ? 'border-sky-600 text-sky-700'
                                        : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <Activity className="w-3.5 h-3.5" />
                                เคสบริการ HOSxP ({selectedMonth.hosxp_cases})
                            </button>
                            <button
                                type="button"
                                onClick={() => switchDrillTab('smt_transfers')}
                                className={`py-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                                    drillTab === 'smt_transfers'
                                        ? 'border-emerald-600 text-emerald-700'
                                        : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <Banknote className="w-3.5 h-3.5" />
                                งวดโอนเงิน SMT สปสช. ({selectedMonth.smt_batches})
                            </button>
                            <button
                                type="button"
                                onClick={() => switchDrillTab('rep_cases')}
                                className={`py-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                                    drillTab === 'rep_cases'
                                        ? 'border-amber-600 text-amber-700'
                                        : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <Receipt className="w-3.5 h-3.5" />
                                รายการส่งเบิก e-Claim ({selectedMonth.rep_cases})
                            </button>
                            <button
                                type="button"
                                onClick={() => switchDrillTab('c_deny')}
                                className={`py-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                                    drillTab === 'c_deny'
                                        ? 'border-rose-600 text-rose-700'
                                        : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                ติด C-Deny ({selectedMonth.rep_c_deny_cases})
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 max-h-[60vh] overflow-y-auto">
                            {loadingDrill ? (
                                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                                    <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-xs">กำลังโหลดข้อมูลเจาะลึก...</span>
                                </div>
                            ) : drillItems.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 text-xs">
                                    ไม่มีข้อมูลในแท็บนี้สำหรับเดือนที่เลือก
                                </div>
                            ) : (
                                <>
                                    {/* Tab 1: HOSxP Visits */}
                                    {drillTab === 'hosxp_visits' && (
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                                    <th className="py-2 px-2.5">วันที่รับบริการ</th>
                                                    <th className="py-2 px-2.5">HN</th>
                                                    <th className="py-2 px-2.5">ชื่อ-นามสกุล (PDPA)</th>
                                                    <th className="py-2 px-2.5">สิทธิการรักษา</th>
                                                    <th className="py-2 px-2.5 text-right">ลูกหนี้สิทธิ (฿)</th>
                                                    <th className="py-2 px-2.5 text-right">ค่ายา EPO (฿)</th>
                                                    <th className="py-2 px-2.5 text-right">ค่าฟอกไต (฿)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                                {drillItems.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50">
                                                        <td className="py-2 px-2.5 whitespace-nowrap">{item.visit_date} {item.visit_time}</td>
                                                        <td className="py-2 px-2.5 font-mono">{item.hn}</td>
                                                        <td className="py-2 px-2.5">{item.patient_name}</td>
                                                        <td className="py-2 px-2.5 text-[11px] text-slate-500">{item.pttype_name || item.pttype}</td>
                                                        <td className="py-2 px-2.5 text-right font-bold text-slate-900">{formatMoney(item.uc_money)}</td>
                                                        <td className="py-2 px-2.5 text-right text-sky-700">{formatMoney(item.drug_epo)}</td>
                                                        <td className="py-2 px-2.5 text-right">{formatMoney(item.hd_fee)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}

                                    {/* Tab 2: SMT Transfers */}
                                    {drillTab === 'smt_transfers' && (
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                                    <th className="py-2 px-2.5">งวด (Batch)</th>
                                                    <th className="py-2 px-2.5">เลขที่เอกสาร (Ref Doc)</th>
                                                    <th className="py-2 px-2.5">วันที่โอนเงิน</th>
                                                    <th className="py-2 px-2.5">กองทุน</th>
                                                    <th className="py-2 px-2.5 text-right">ยอดเงินโอนจริง (฿)</th>
                                                    <th className="py-2 px-2.5 text-center">หลักฐานโอนเงิน</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                                {drillItems.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50">
                                                        <td className="py-2 px-2.5 font-bold font-mono">{item.batch_no}</td>
                                                        <td className="py-2 px-2.5 font-mono text-emerald-800 font-semibold">{item.ref_doc_no || '-'}</td>
                                                        <td className="py-2 px-2.5">{item.transfer_date || item.posting_date}</td>
                                                        <td className="py-2 px-2.5">
                                                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                {item.fund_name || item.budget_source}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 px-2.5 text-right font-black text-emerald-700">{formatMoney(item.total)}</td>
                                                        <td className="py-2 px-2.5 text-center">
                                                            {item.has_pdf && item.pdf_url ? (
                                                                <a
                                                                    href={item.pdf_url}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-800 font-semibold underline"
                                                                >
                                                                    <FileCheck className="w-3.5 h-3.5" />
                                                                    เปิด PDF สลิป
                                                                </a>
                                                            ) : (
                                                                <span className="text-[11px] text-slate-400">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}

                                    {/* Tab 3: REP Cases */}
                                    {drillTab === 'rep_cases' && (
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                                    <th className="py-2 px-2.5">REP No</th>
                                                    <th className="py-2 px-2.5">วันที่รับบริการ</th>
                                                    <th className="py-2 px-2.5">HN</th>
                                                    <th className="py-2 px-2.5">ชื่อ-นามสกุล</th>
                                                    <th className="py-2 px-2.5 text-right">ยอดเรียกเก็บ (฿)</th>
                                                    <th className="py-2 px-2.5 text-right">ยอดอนุมัติ (฿)</th>
                                                    <th className="py-2 px-2.5 text-center">สถานะ / C-Deny</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                                {drillItems.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50">
                                                        <td className="py-2 px-2.5 font-mono font-semibold">{item.rep_no || '-'}</td>
                                                        <td className="py-2 px-2.5 whitespace-nowrap">{item.visit_date}</td>
                                                        <td className="py-2 px-2.5 font-mono">{item.hn}</td>
                                                        <td className="py-2 px-2.5">{item.patient_name}</td>
                                                        <td className="py-2 px-2.5 text-right">{formatMoney(item.amount_claim)}</td>
                                                        <td className="py-2 px-2.5 text-right font-bold text-slate-900">{formatMoney(item.amount_approved)}</td>
                                                        <td className="py-2 px-2.5 text-center">
                                                            {item.c_deny_code ? (
                                                                <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                                                    {item.c_deny_code}
                                                                </span>
                                                            ) : (
                                                                <span className="text-emerald-600 font-semibold text-[11px]">ผ่านอนุมัติ</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}

                                    {/* Tab 4: C-Deny */}
                                    {drillTab === 'c_deny' && (
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                                    <th className="py-2 px-2.5">รหัส C-Deny</th>
                                                    <th className="py-2 px-2.5">คำอธิบายข้อติดขัด</th>
                                                    <th className="py-2 px-2.5">HN</th>
                                                    <th className="py-2 px-2.5">วันที่</th>
                                                    <th className="py-2 px-2.5 text-right">ยอดเรียกเก็บ (฿)</th>
                                                    <th className="py-2 px-2.5 text-right">ยอดที่ถูกตัด (฿)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                                {drillItems.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50">
                                                        <td className="py-2 px-2.5 font-bold font-mono text-rose-700">{item.c_deny_code}</td>
                                                        <td className="py-2 px-2.5 text-slate-600">{item.c_deny_descr || '-'}</td>
                                                        <td className="py-2 px-2.5 font-mono">{item.hn}</td>
                                                        <td className="py-2 px-2.5 whitespace-nowrap">{item.visit_date}</td>
                                                        <td className="py-2 px-2.5 text-right">{formatMoney(item.amount_claim)}</td>
                                                        <td className="py-2 px-2.5 text-right font-bold text-rose-600">{formatMoney(item.shortfall)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setDrillModalOpen(false)}
                                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                            >
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </RcmLayout>
    );
}
