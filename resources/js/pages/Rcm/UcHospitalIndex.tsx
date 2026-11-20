import React, { useState } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import RcmLayout from './RcmLayout';
import {
    Building2,
    FileSpreadsheet,
    FileText,
    CheckCircle2,
    AlertCircle,
    Clock,
    Search,
    X,
    Filter,
    HelpCircle,
    ChevronRight,
    AlertTriangle,
    Receipt,
    Banknote,
    FileCheck,
    RefreshCw,
    Shield,
    ExternalLink,
    DownloadCloud,
    Info,
    FolderDown,
    Heart,
} from 'lucide-react';

interface UcHospitalRow {
    month_key: string;
    month_label_th: string;
    year_th: number;
    short_label_th: string;
    full_label_th: string;
    hosxp_cases: number;
    hosxp_income: number;
    hosxp_uc_money: number;
    hosxp_cash: number;
    hosxp_drug: number;
    rep_cases: number;
    rep_claim: number;
    rep_approved: number;
    rep_drug: number;
    rep_c_deny_cases: number;
    rep_c_deny_amount: number;
    stm_cases?: number;
    stm_claim?: number;
    stm_approved?: number;
    stm_batches?: number;
    smt_batches: number;
    smt_total_transferred: number;
    diff_hosxp_rep: number;
    diff_rep_stm?: number;
    diff_hosxp_stm?: number;
    diff_rep_smt: number;
    diff_hosxp_smt: number;
    unclaimed_cases: number;
    recovery_rate: number;
    status: string;
    status_label: string;
}

interface UcHospitalTotals {
    hosxp_cases: number;
    hosxp_income: number;
    hosxp_uc_money: number;
    hosxp_cash: number;
    hosxp_drug: number;
    rep_cases: number;
    rep_claim: number;
    rep_approved: number;
    rep_drug: number;
    rep_c_deny_cases: number;
    rep_c_deny_amount: number;
    stm_cases?: number;
    stm_claim?: number;
    stm_approved?: number;
    stm_batches?: number;
    smt_batches: number;
    smt_total_transferred: number;
    diff_hosxp_rep: number;
    diff_rep_stm?: number;
    diff_hosxp_stm?: number;
    diff_rep_smt: number;
    diff_hosxp_smt: number;
    unclaimed_cases: number;
    recovery_rate: number;
}

interface UcHospitalComparisonData {
    period_mode: string | number;
    claim_type: string;
    start_date: string;
    end_date: string;
    hosxp_ready: boolean;
    rows: UcHospitalRow[];
    totals: UcHospitalTotals;
}

interface UcHospitalIndexProps {
    filters: {
        period_mode: string | number;
        claim_type: string;
    };
    comparison: UcHospitalComparisonData;
    hosxp_ready: boolean;
}

export default function UcHospitalIndex({ filters, comparison, hosxp_ready }: UcHospitalIndexProps) {
    const { flash } = usePage().props as any;

    const [periodMode, setPeriodMode] = useState<string | number>(filters.period_mode || 'since_jan_68');
    const [claimType, setClaimType] = useState<string>(filters.claim_type || 'all');

    // Drill-Down Modal State
    const [selectedMonth, setSelectedMonth] = useState<UcHospitalRow | null>(null);
    const [drillDownLoading, setDrillDownLoading] = useState(false);
    const [drillDownTab, setDrillDownTab] = useState<'hosxp_visits' | 'rep_cases' | 'stm_items' | 'c_deny'>('hosxp_visits');
    const [drillDownData, setDrillDownData] = useState<any[]>([]);
    const [drillDownSearch, setDrillDownSearch] = useState('');
    const [hosxpMatchFilter, setHosxpMatchFilter] = useState<'all' | 'settled' | 'waiting_stm' | 'c_deny' | 'unclaimed'>('all');

    // Sync STM Modal
    const [showStmModal, setShowStmModal] = useState(false);
    const [syncYear, setSyncYear] = useState<number>(2570);
    const [syncMonth, setSyncMonth] = useState<number>(10);
    const [syncingStm, setSyncingStm] = useState(false);

    // Sync REP Modal
    const [showRepModal, setShowRepModal] = useState(false);
    const [repSyncYear, setRepSyncYear] = useState<number>(2570);
    const [repSyncMonth, setRepSyncMonth] = useState<number>(10);
    const [repForce, setRepForce] = useState<boolean>(false);
    const [syncingRep, setSyncingRep] = useState(false);

    const handleFilterChange = (newPeriod: string | number, newClaim: string) => {
        router.get(
            route('rcm.uc-hospital.index'),
            {
                period_mode: newPeriod,
                claim_type: newClaim,
            },
            { preserveState: true, preserveScroll: true }
        );
    };

    const openDrillDown = async (row: UcHospitalRow, initialTab: 'hosxp_visits' | 'rep_cases' | 'stm_items' | 'c_deny' = 'hosxp_visits') => {
        setSelectedMonth(row);
        setDrillDownTab(initialTab);
        setDrillDownSearch('');
        setHosxpMatchFilter('all');
        setDrillDownLoading(true);

        try {
            const resp = await fetch(
                route('rcm.uc-hospital.drill-down', {
                    month_key: row.month_key,
                    claim_type: claimType,
                    tab: initialTab,
                    limit: 300,
                })
            );
            const json = await resp.json();
            setDrillDownData(json.items || []);
        } catch (err) {
            console.error('Failed to load drill down:', err);
            setDrillDownData([]);
        } finally {
            setDrillDownLoading(false);
        }
    };

    const handleTabChange = async (tab: 'hosxp_visits' | 'rep_cases' | 'stm_items' | 'c_deny') => {
        if (!selectedMonth) return;
        setDrillDownTab(tab);
        setDrillDownSearch('');
        setHosxpMatchFilter('all');
        setDrillDownLoading(true);

        try {
            const resp = await fetch(
                route('rcm.uc-hospital.drill-down', {
                    month_key: selectedMonth.month_key,
                    claim_type: claimType,
                    tab: tab,
                    limit: 300,
                })
            );
            const json = await resp.json();
            setDrillDownData(json.items || []);
        } catch (err) {
            console.error('Failed to switch tab:', err);
            setDrillDownData([]);
        } finally {
            setDrillDownLoading(false);
        }
    };

    const handleSyncStmSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSyncingStm(true);
        router.post(
            route('rcm.uc-hospital.sync-stm'),
            { year: syncYear, month: syncMonth },
            {
                onFinish: () => {
                    setSyncingStm(false);
                    setShowStmModal(false);
                },
            }
        );
    };

    const handleSyncRepSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSyncingRep(true);
        router.post(
            route('rcm.uc-hospital.sync-portal'),
            { year: repSyncYear, month: repSyncMonth, force: repForce },
            {
                onFinish: () => {
                    setSyncingRep(false);
                    setShowRepModal(false);
                },
            }
        );
    };

    const filteredDrillDownItems = drillDownData.filter((item) => {
        if (drillDownTab === 'hosxp_visits' && hosxpMatchFilter !== 'all') {
            if (hosxpMatchFilter === 'settled' && item.match_status !== 'settled') return false;
            if (hosxpMatchFilter === 'waiting_stm' && item.match_status !== 'waiting_stm') return false;
            if (hosxpMatchFilter === 'c_deny' && item.match_status !== 'c_deny') return false;
            if (hosxpMatchFilter === 'unclaimed' && item.match_status !== 'unclaimed') return false;
        }

        if (!drillDownSearch.trim()) return true;
        const q = drillDownSearch.toLowerCase();
        return (
            (item.vn_an && item.vn_an.toLowerCase().includes(q)) ||
            (item.hn && item.hn.toLowerCase().includes(q)) ||
            (item.patient_name && item.patient_name.toLowerCase().includes(q)) ||
            (item.rep_no && item.rep_no.toLowerCase().includes(q)) ||
            (item.claim_submission_no && item.claim_submission_no.toLowerCase().includes(q)) ||
            (item.filename && item.filename.toLowerCase().includes(q)) ||
            (item.c_deny_code && item.c_deny_code.toLowerCase().includes(q)) ||
            (item.department_name && item.department_name.toLowerCase().includes(q)) ||
            (item.pdx && item.pdx.toLowerCase().includes(q))
        );
    });

    const formatMoney = (val: number | undefined | null) => {
        if (val === undefined || val === null) return '0.00';
        return Number(val).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formatInt = (val: number | undefined | null) => {
        if (val === undefined || val === null) return '0';
        return Number(val).toLocaleString('th-TH');
    };

    return (
        <RcmLayout active="uc-hospital" title="บัตรทอง รพ">
            {/* Flash Messages */}
            {flash?.success && (
                <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>{flash.success}</span>
                </div>
            )}
            {flash?.error && (
                <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>{flash.error}</span>
                </div>
            )}
            {flash?.info && (
                <div className="mb-4 p-4 bg-sky-50 border border-sky-200 rounded-xl text-sky-800 text-sm flex items-center gap-2">
                    <Info className="w-5 h-5 text-sky-600 shrink-0" />
                    <span>{flash.info}</span>
                </div>
            )}

            {/* Header Card */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 md:p-6 mb-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
                            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                            ระบบบริหารวงจรรายได้ (RCM) • สิทธิบัตรทอง รพ.ค่าย (03)
                        </div>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            บัตรทอง รพ
                            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                บัตรทอง รพ.ค่ายฯ (สิทธิ 03)
                            </span>
                        </h1>
                        <p className="text-xs md:text-sm text-slate-500 mt-1">
                            ติดตามและเปรียบเทียบข้อมูล 3 ฝ่าย: [1] บริการ HOSxP (สิทธิ 03) ⟷ [2] ส่งเบิก e-Claim REP ⟷ [3] Statement (STM) เงินโอนจริง
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowRepModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors shadow-2xs"
                        >
                            <RefreshCw className="w-3.5 h-3.5 text-sky-600" />
                            ซิงค์ e-Claim REP
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowStmModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors shadow-2xs"
                        >
                            <DownloadCloud className="w-3.5 h-3.5 text-emerald-600" />
                            ซิงค์ Statement (STM)
                        </button>

                        <a
                            href={route('rcm.uc-hospital.export-excel', {
                                period_mode: periodMode,
                                claim_type: claimType,
                            })}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors"
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                            ส่งออก Excel
                        </a>

                        <a
                            href={route('rcm.uc-hospital.export-pdf', {
                                period_mode: periodMode,
                                claim_type: claimType,
                            })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors"
                        >
                            <FileText className="w-3.5 h-3.5 text-rose-600" />
                            ส่งออก PDF
                        </a>
                    </div>
                </div>

                {/* Filter Controls Bar */}
                <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* 1. Period Filter */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            ช่วงเวลา / ปีงบประมาณ
                        </label>
                        <select
                            value={periodMode}
                            onChange={(e) => {
                                setPeriodMode(e.target.value);
                                handleFilterChange(e.target.value, claimType);
                            }}
                            className="w-full text-xs font-medium bg-slate-50/70 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                            <option value="since_jan_68">⭐ ย้อนหลังตั้งแต่ ม.ค.68 ถึงปัจจุบัน</option>
                            <option value="2570">ปีงบประมาณ 2570 (ต.ค.69 - ก.ย.70)</option>
                            <option value="2569">ปีงบประมาณ 2569 (ต.ค.68 - ก.ย.69)</option>
                            <option value="2568">ปีงบประมาณ 2568 (ต.ค.67 - ก.ย.68)</option>
                        </select>
                    </div>

                    {/* 2. Claim Type Filter */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            ประเภทบริการ (Claim Type)
                        </label>
                        <select
                            value={claimType}
                            onChange={(e) => {
                                setClaimType(e.target.value);
                                handleFilterChange(periodMode, e.target.value);
                            }}
                            className="w-full text-xs font-medium bg-slate-50/70 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                            <option value="all">ทั้งหมด (OPD + IPD)</option>
                            <option value="opd">ผู้ป่วยนอก (OPD)</option>
                            <option value="ipd">ผู้ป่วยใน (IPD)</option>
                        </select>
                    </div>
                </div>

                {/* Sub-bar: Information & Cross Navigation */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-slate-600">
                        <div className="flex items-center gap-1.5">
                            <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                                <strong className="text-slate-800">เฉพาะสิทธิบัตรทอง รพ.ค่าย (03):</strong> หากต้องการดูสิทธิบัตรทองทั่วไป (ฉุกเฉิน 04, พลทหาร 19 ฯลฯ) ไปที่โมดูล{' '}
                                <a href="/rcm/uc" className="text-rose-600 font-semibold underline hover:text-rose-700">
                                    บัตรทอง (UC ทั่วไป)
                                </a>
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                        <a
                            href="https://eclaim.nhso.go.th/webComponent/validation/ValidationMainAction.do?maininscl=ucs"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-800 underline font-semibold"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            เว็บ e-Claim REP (สปสช.)
                        </a>
                        <span className="text-slate-300">|</span>
                        <a
                            href="https://eclaim.nhso.go.th/webComponent/ucs/statementUCSAction.do"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 underline font-semibold"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            เว็บ e-Claim Statement (UCS)
                        </a>
                    </div>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* 1. HOSxP Service */}
                <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-4 border-l-4 border-l-indigo-500">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                            [1] บริการใน รพ.ค่าย (HOSxP)
                        </span>
                        <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            สิทธิ 03
                        </span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                        {formatMoney(comparison.totals.hosxp_uc_money)} <span className="text-xs font-normal text-slate-500">฿</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
                        <span>จำนวนผู้รับบริการ:</span>
                        <span className="font-semibold text-slate-800">{formatInt(comparison.totals.hosxp_cases)} เคส</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-between mt-1">
                        <span>ค่ารักษาทั้งหมด:</span>
                        <span>{formatMoney(comparison.totals.hosxp_income)} ฿</span>
                    </div>
                </div>

                {/* 2. e-Claim REP */}
                <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-4 border-l-4 border-l-sky-500">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <Receipt className="w-3.5 h-3.5 text-sky-600" />
                            [2] e-Claim REP ส่งเบิก
                        </span>
                        <span className="text-[11px] font-medium text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">
                            {formatInt(comparison.totals.rep_cases)} เคส
                        </span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                        {formatMoney(comparison.totals.rep_claim)} <span className="text-xs font-normal text-slate-500">฿</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
                        <span>ผ่านการตรวจ (REP):</span>
                        <span className="font-semibold text-sky-700">{formatMoney(comparison.totals.rep_approved)} ฿</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-between mt-1">
                        <span>ติด C-Deny:</span>
                        <span className={comparison.totals.rep_c_deny_cases > 0 ? 'text-rose-600 font-semibold' : ''}>
                            {formatInt(comparison.totals.rep_c_deny_cases)} เคส ({formatMoney(comparison.totals.rep_c_deny_amount)} ฿)
                        </span>
                    </div>
                </div>

                {/* 3. e-Claim STM */}
                <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-4 border-l-4 border-l-emerald-500">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                            [3] Statement (STM) เงินโอนจริง
                        </span>
                        <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {formatInt(comparison.totals.stm_cases || 0)} เคส
                        </span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-700 mt-1">
                        {formatMoney(comparison.totals.stm_approved || comparison.totals.smt_total_transferred)} <span className="text-xs font-normal text-slate-500">฿</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
                        <span>จำนวนงวด Statement:</span>
                        <span className="font-semibold text-slate-800">{formatInt(comparison.totals.stm_batches || comparison.totals.smt_batches)} งวด</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-between mt-1">
                        <span>เทียบยอดส่งเบิก REP:</span>
                        <span className={comparison.totals.diff_rep_stm && comparison.totals.diff_rep_stm > 0 ? 'text-amber-600 font-medium' : 'text-slate-600'}>
                            ผลต่าง {formatMoney(comparison.totals.diff_rep_stm || 0)} ฿
                        </span>
                    </div>
                </div>

                {/* 4. Recovery & Discrepancy */}
                <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-4 border-l-4 border-l-teal-500">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <Shield className="w-3.5 h-3.5 text-teal-600" />
                            ชดเชยคืนทุน (Recovery)
                        </span>
                        <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                            {comparison.totals.recovery_rate}%
                        </span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                        {comparison.totals.recovery_rate}%
                    </div>
                    <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
                        <span>ผลต่างสุทธิ (HOSxP - STM):</span>
                        <span className="font-semibold text-slate-800">{formatMoney(comparison.totals.diff_hosxp_stm || 0)} ฿</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-between mt-1">
                        <span>บริการ รพ.ค่าย (ไม่ได้ส่ง REP):</span>
                        <span className="font-semibold text-indigo-700">{formatInt(comparison.totals.unclaimed_cases)} เคส</span>
                    </div>
                </div>
            </div>

            {/* Main Monthly Comparison Table */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden mb-8">
                <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-emerald-600" />
                        <h2 className="text-sm font-bold text-slate-800">
                            ตารางเปรียบเทียบข้อมูลรายเดือน 3 ฝ่าย (สิทธิบัตรทอง รพ.ค่ายฯ 03)
                        </h2>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>แสดง {comparison.rows.length} เดือน</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider">
                                <th rowSpan={2} className="px-3 py-3 text-center border-r border-slate-200 w-24">เดือน / ปี</th>
                                <th colSpan={3} className="px-3 py-2 text-center border-r border-slate-200 bg-indigo-50/70 text-indigo-900">
                                    [1] บริการใน รพ.ค่าย (HOSxP)
                                </th>
                                <th colSpan={3} className="px-3 py-2 text-center border-r border-slate-200 bg-sky-50/70 text-sky-900">
                                    [2] e-Claim REP ส่งเบิก
                                </th>
                                <th colSpan={2} className="px-3 py-2 text-center border-r border-slate-200 bg-emerald-50/70 text-emerald-900">
                                    [3] e-Claim STM เงินโอนจริง
                                </th>
                                <th colSpan={3} className="px-3 py-2 text-center bg-slate-100 text-slate-800">
                                    ผลต่าง & ประเมินผล
                                </th>
                                <th rowSpan={2} className="px-3 py-3 text-center w-20">เจาะลึก</th>
                            </tr>
                            <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10px]">
                                {/* HOSxP */}
                                <th className="px-2.5 py-1.5 text-right font-medium">เคส</th>
                                <th className="px-2.5 py-1.5 text-right font-medium">ค่ารักษา (฿)</th>
                                <th className="px-2.5 py-1.5 text-right font-medium border-r border-slate-200">สิทธิเบิก (฿)</th>

                                {/* REP */}
                                <th className="px-2.5 py-1.5 text-right font-medium">เคส</th>
                                <th className="px-2.5 py-1.5 text-right font-medium">ส่งเบิก (฿)</th>
                                <th className="px-2.5 py-1.5 text-right font-medium border-r border-slate-200">C-Deny</th>

                                {/* STM */}
                                <th className="px-2.5 py-1.5 text-right font-medium">เคส</th>
                                <th className="px-2.5 py-1.5 text-right font-medium border-r border-slate-200">ชดเชยสุทธิ (฿)</th>

                                {/* KPIs */}
                                <th className="px-2.5 py-1.5 text-right font-medium">HOSxP - REP</th>
                                <th className="px-2.5 py-1.5 text-center font-medium">% ชดเชย</th>
                                <th className="px-2.5 py-1.5 text-center font-medium">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {comparison.rows.length === 0 ? (
                                <tr>
                                    <td colSpan={13} className="px-4 py-8 text-center text-slate-400">
                                        ไม่พบข้อมูลในช่วงเวลาที่เลือก
                                    </td>
                                </tr>
                            ) : (
                                comparison.rows.map((row) => (
                                    <tr key={row.month_key} className="hover:bg-slate-50/80 transition-colors">
                                        {/* Month Label */}
                                        <td className="px-3 py-2.5 text-center font-medium text-slate-900 border-r border-slate-100 whitespace-nowrap bg-slate-50/40">
                                            {row.short_label_th}
                                        </td>

                                        {/* [1] HOSxP */}
                                        <td className="px-2.5 py-2.5 text-right font-medium text-slate-700">
                                            {formatInt(row.hosxp_cases)}
                                        </td>
                                        <td className="px-2.5 py-2.5 text-right text-slate-500">
                                            {formatMoney(row.hosxp_income)}
                                        </td>
                                        <td className="px-2.5 py-2.5 text-right font-semibold text-indigo-700 border-r border-slate-100">
                                            {formatMoney(row.hosxp_uc_money)}
                                        </td>

                                        {/* [2] REP */}
                                        <td className="px-2.5 py-2.5 text-right font-medium text-slate-700">
                                            {formatInt(row.rep_cases)}
                                        </td>
                                        <td className="px-2.5 py-2.5 text-right font-semibold text-sky-700">
                                            {formatMoney(row.rep_claim)}
                                        </td>
                                        <td className="px-2.5 py-2.5 text-right border-r border-slate-100">
                                            {row.rep_c_deny_cases > 0 ? (
                                                <button
                                                    type="button"
                                                    onClick={() => openDrillDown(row, 'c_deny')}
                                                    className="inline-flex items-center gap-0.5 text-rose-600 font-semibold hover:underline"
                                                >
                                                    <AlertTriangle className="w-3 h-3" />
                                                    {row.rep_c_deny_cases}
                                                </button>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </td>

                                        {/* [3] STM */}
                                        <td className="px-2.5 py-2.5 text-right font-medium text-slate-700">
                                            {formatInt(row.stm_cases || 0)}
                                        </td>
                                        <td className="px-2.5 py-2.5 text-right font-semibold text-emerald-700 border-r border-slate-100">
                                            {formatMoney(row.stm_approved || row.smt_total_transferred)}
                                        </td>

                                        {/* KPIs */}
                                        <td className="px-2.5 py-2.5 text-right font-mono text-[11px] text-slate-600">
                                            {formatMoney(row.diff_hosxp_rep)}
                                        </td>
                                        <td className="px-2.5 py-2.5 text-center font-bold text-slate-800">
                                            {row.recovery_rate}%
                                        </td>
                                        <td className="px-2.5 py-2.5 text-center whitespace-nowrap">
                                            <span
                                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                    row.status === 'settled_full'
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                        : row.status === 'partially_settled'
                                                        ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                                        : row.status === 'awaiting_stm'
                                                        ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                                        : row.status === 'unclaimed'
                                                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                                        : 'bg-slate-100 text-slate-500'
                                                }`}
                                            >
                                                {row.status_label}
                                            </span>
                                        </td>

                                        {/* Drill-down action */}
                                        <td className="px-2.5 py-2.5 text-center whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => openDrillDown(row, 'hosxp_visits')}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                                            >
                                                <Search className="w-3 h-3" />
                                                เจาะลึก
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {/* Totals Row */}
                        <tfoot>
                            <tr className="bg-slate-100/90 text-slate-900 font-bold border-t-2 border-slate-300 text-xs">
                                <td className="px-3 py-3 text-center border-r border-slate-300 bg-slate-200/60">รวมทั้งสิ้น</td>
                                {/* HOSxP */}
                                <td className="px-2.5 py-3 text-right">{formatInt(comparison.totals.hosxp_cases)}</td>
                                <td className="px-2.5 py-3 text-right text-slate-600">{formatMoney(comparison.totals.hosxp_income)}</td>
                                <td className="px-2.5 py-3 text-right text-indigo-800 border-r border-slate-300">{formatMoney(comparison.totals.hosxp_uc_money)}</td>

                                {/* REP */}
                                <td className="px-2.5 py-3 text-right">{formatInt(comparison.totals.rep_cases)}</td>
                                <td className="px-2.5 py-3 text-right text-sky-800">{formatMoney(comparison.totals.rep_claim)}</td>
                                <td className="px-2.5 py-3 text-right text-rose-700 border-r border-slate-300">
                                    {comparison.totals.rep_c_deny_cases > 0 ? `${formatInt(comparison.totals.rep_c_deny_cases)} เคส` : '-'}
                                </td>

                                {/* STM */}
                                <td className="px-2.5 py-3 text-right">{formatInt(comparison.totals.stm_cases || 0)}</td>
                                <td className="px-2.5 py-3 text-right text-emerald-800 border-r border-slate-300">
                                    {formatMoney(comparison.totals.stm_approved || comparison.totals.smt_total_transferred)}
                                </td>

                                {/* KPIs */}
                                <td className="px-2.5 py-3 text-right font-mono">{formatMoney(comparison.totals.diff_hosxp_rep)}</td>
                                <td className="px-2.5 py-3 text-center text-teal-800">{comparison.totals.recovery_rate}%</td>
                                <td colSpan={2} className="px-2.5 py-3 text-center text-slate-400 font-normal text-[11px]">-</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Drill-Down Modal */}
            {selectedMonth && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                            <div>
                                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mb-1">
                                    <Building2 className="w-3 h-3 text-emerald-600" />
                                    เจาะลึกข้อมูลบัตรทอง รพ.ค่าย (03) • {selectedMonth.full_label_th}
                                </div>
                                <h3 className="text-base font-bold text-slate-900">
                                    รายการผู้รับบริการและการจับคู่ผลส่งเบิก/ชดเชย
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedMonth(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Tabs & Search Bar */}
                        <div className="px-6 py-3 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            {/* Tabs */}
                            <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => handleTabChange('hosxp_visits')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                                        drillDownTab === 'hosxp_visits'
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                                    }`}
                                >
                                    <Building2 className="w-3.5 h-3.5" />
                                    [1] ข้อมูลรับบริการ HOSxP (ตัวตั้ง)
                                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                                        {selectedMonth.hosxp_cases}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleTabChange('rep_cases')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                                        drillDownTab === 'rep_cases'
                                            ? 'bg-sky-600 text-white shadow-xs'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                                    }`}
                                >
                                    <Receipt className="w-3.5 h-3.5" />
                                    [2] e-Claim REP ส่งเบิก
                                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                                        {selectedMonth.rep_cases}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleTabChange('stm_items')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                                        drillDownTab === 'stm_items'
                                            ? 'bg-emerald-600 text-white shadow-xs'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                                    }`}
                                >
                                    <Banknote className="w-3.5 h-3.5" />
                                    [3] รายการ Statement (STM)
                                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                                        {selectedMonth.stm_cases || 0}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleTabChange('c_deny')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                                        drillDownTab === 'c_deny'
                                            ? 'bg-rose-600 text-white shadow-xs'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                                    }`}
                                >
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    [4] รายการติด C-Deny
                                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                                        {selectedMonth.rep_c_deny_cases}
                                    </span>
                                </button>
                            </div>

                            {/* Search */}
                            <div className="relative w-full sm:w-64">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={drillDownSearch}
                                    onChange={(e) => setDrillDownSearch(e.target.value)}
                                    placeholder="ค้นหา VN, HN, ชื่อ, แผนก..."
                                    className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Sub-filter Pills for HOSxP Tab */}
                        {drillDownTab === 'hosxp_visits' && (
                            <div className="px-6 py-2 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                                <span className="text-slate-500 font-medium">กรองสถานะจับคู่:</span>
                                <button
                                    type="button"
                                    onClick={() => setHosxpMatchFilter('all')}
                                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
                                        hosxpMatchFilter === 'all'
                                            ? 'bg-slate-800 text-white'
                                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    ทั้งหมด ({drillDownData.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setHosxpMatchFilter('settled')}
                                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                                        hosxpMatchFilter === 'settled'
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                    }`}
                                >
                                    <CheckCircle2 className="w-3 h-3" />
                                    ชดเชยแล้ว ({drillDownData.filter((i) => i.match_status === 'settled').length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setHosxpMatchFilter('waiting_stm')}
                                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                                        hosxpMatchFilter === 'waiting_stm'
                                            ? 'bg-sky-600 text-white'
                                            : 'bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100'
                                    }`}
                                >
                                    <Clock className="w-3 h-3" />
                                    รอ Statement ({drillDownData.filter((i) => i.match_status === 'waiting_stm').length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setHosxpMatchFilter('unclaimed')}
                                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                                        hosxpMatchFilter === 'unclaimed'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                                    }`}
                                >
                                    <Building2 className="w-3 h-3" />
                                    บริการ รพ.ค่าย ({drillDownData.filter((i) => i.match_status === 'unclaimed').length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setHosxpMatchFilter('c_deny')}
                                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                                        hosxpMatchFilter === 'c_deny'
                                            ? 'bg-rose-600 text-white'
                                            : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                    }`}
                                >
                                    <AlertTriangle className="w-3 h-3" />
                                    ติด C-Deny ({drillDownData.filter((i) => i.match_status === 'c_deny').length})
                                </button>
                            </div>
                        )}

                        {/* Modal Body Table */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                            {drillDownLoading ? (
                                <div className="py-16 text-center">
                                    <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
                                    <div className="text-xs text-slate-500 font-medium">กำลังโหลดข้อมูลเจาะลึก 1-to-1...</div>
                                </div>
                            ) : filteredDrillDownItems.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 text-xs">
                                    ไม่พบรายการข้อมูลตามเงื่อนไขที่เลือก
                                </div>
                            ) : (
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
                                            {drillDownTab === 'hosxp_visits' && (
                                                <tr>
                                                    <th className="px-3 py-2 text-center w-12">#</th>
                                                    <th className="px-3 py-2">วันที่</th>
                                                    <th className="px-3 py-2">VN / AN</th>
                                                    <th className="px-3 py-2">HN</th>
                                                    <th className="px-3 py-2">ชื่อ-สกุล (PDPA)</th>
                                                    <th className="px-3 py-2">แผนก</th>
                                                    <th className="px-3 py-2 text-right">ค่ารักษา (฿)</th>
                                                    <th className="px-3 py-2 text-right">สิทธิ รพ.ค่าย (฿)</th>
                                                    <th className="px-3 py-2 text-right text-sky-700">ยอดส่ง REP (฿)</th>
                                                    <th className="px-3 py-2 text-right text-emerald-700">ชดเชย STM (฿)</th>
                                                    <th className="px-3 py-2 text-center">สถานะชดเชย</th>
                                                </tr>
                                            )}
                                            {drillDownTab === 'rep_cases' && (
                                                <tr>
                                                    <th className="px-3 py-2 text-center w-12">#</th>
                                                    <th className="px-3 py-2">วันที่รับบริการ</th>
                                                    <th className="px-3 py-2">เลขที่ REP</th>
                                                    <th className="px-3 py-2">SEQ / AN</th>
                                                    <th className="px-3 py-2">HN</th>
                                                    <th className="px-3 py-2">ชื่อ-สกุล (PDPA)</th>
                                                    <th className="px-3 py-2 text-right">ยอดส่งเบิก (฿)</th>
                                                    <th className="px-3 py-2 text-right">อนุมัติเบื้องต้น (฿)</th>
                                                    <th className="px-3 py-2 text-center">รหัส C-Deny</th>
                                                    <th className="px-3 py-2">ชื่อไฟล์ REP</th>
                                                </tr>
                                            )}
                                            {drillDownTab === 'stm_items' && (
                                                <tr>
                                                    <th className="px-3 py-2 text-center w-12">#</th>
                                                    <th className="px-3 py-2">วันที่รับบริการ</th>
                                                    <th className="px-3 py-2">เลขที่หนังสือ STM</th>
                                                    <th className="px-3 py-2">เลขที่ REP</th>
                                                    <th className="px-3 py-2">SEQ / AN</th>
                                                    <th className="px-3 py-2">HN</th>
                                                    <th className="px-3 py-2">ชื่อ-สกุล (PDPA)</th>
                                                    <th className="px-3 py-2 text-right">ยอดเรียกเก็บ (฿)</th>
                                                    <th className="px-3 py-2 text-right">ชดเชยจริง (฿)</th>
                                                    <th className="px-3 py-2 text-right">ผลต่าง (฿)</th>
                                                    <th className="px-3 py-2">ไฟล์ Statement</th>
                                                </tr>
                                            )}
                                            {drillDownTab === 'c_deny' && (
                                                <tr>
                                                    <th className="px-3 py-2 text-center w-12">#</th>
                                                    <th className="px-3 py-2">วันที่</th>
                                                    <th className="px-3 py-2">เลขที่ REP</th>
                                                    <th className="px-3 py-2">SEQ / AN</th>
                                                    <th className="px-3 py-2">HN</th>
                                                    <th className="px-3 py-2">ชื่อ-สกุล (PDPA)</th>
                                                    <th className="px-3 py-2 text-center text-rose-600">รหัส Error</th>
                                                    <th className="px-3 py-2">คำอธิบาย</th>
                                                    <th className="px-3 py-2 text-right">ยอดส่งเบิก (฿)</th>
                                                    <th className="px-3 py-2">ไฟล์</th>
                                                </tr>
                                            )}
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredDrillDownItems.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="px-3 py-2 text-center text-slate-400 text-[11px]">{idx + 1}</td>

                                                    {drillDownTab === 'hosxp_visits' && (
                                                        <>
                                                            <td className="px-3 py-2 whitespace-nowrap text-slate-600">{item.service_date}</td>
                                                            <td className="px-3 py-2 font-mono font-medium text-slate-900">{item.vn_an}</td>
                                                            <td className="px-3 py-2 font-mono text-slate-600">{item.hn}</td>
                                                            <td className="px-3 py-2 font-medium text-slate-800">{item.patient_name}</td>
                                                            <td className="px-3 py-2 text-slate-500 text-[11px]">{item.department_name}</td>
                                                            <td className="px-3 py-2 text-right text-slate-500">{formatMoney(item.income)}</td>
                                                            <td className="px-3 py-2 text-right font-semibold text-indigo-700">{formatMoney(item.claim_amount)}</td>
                                                            <td className="px-3 py-2 text-right font-semibold text-sky-700">
                                                                {item.matched_rep ? formatMoney(item.rep_claim) : <span className="text-slate-300 font-normal">-</span>}
                                                            </td>
                                                            <td className="px-3 py-2 text-right font-semibold text-emerald-700">
                                                                {item.matched_stm ? formatMoney(item.stm_approved) : <span className="text-slate-300 font-normal">-</span>}
                                                            </td>
                                                            <td className="px-3 py-2 text-center whitespace-nowrap">
                                                                <span
                                                                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                                        item.match_status === 'settled'
                                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                            : item.match_status === 'waiting_stm'
                                                                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                                                            : item.match_status === 'c_deny'
                                                                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                                                    }`}
                                                                >
                                                                    {item.match_status_label}
                                                                </span>
                                                            </td>
                                                        </>
                                                    )}

                                                    {drillDownTab === 'rep_cases' && (
                                                        <>
                                                            <td className="px-3 py-2 whitespace-nowrap text-slate-600">{item.visit_date}</td>
                                                            <td className="px-3 py-2 font-mono font-medium text-sky-800">{item.rep_no}</td>
                                                            <td className="px-3 py-2 font-mono text-slate-600">{item.seq_no || item.an}</td>
                                                            <td className="px-3 py-2 font-mono text-slate-600">{item.hn}</td>
                                                            <td className="px-3 py-2 font-medium text-slate-800">{item.patient_name}</td>
                                                            <td className="px-3 py-2 text-right font-semibold text-slate-900">{formatMoney(item.amount_claim)}</td>
                                                            <td className="px-3 py-2 text-right font-semibold text-sky-700">{formatMoney(item.amount_approved)}</td>
                                                            <td className="px-3 py-2 text-center">
                                                                {item.c_deny_code ? (
                                                                    <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded text-[10px] font-bold">
                                                                        {item.c_deny_code}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-slate-300">-</span>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2 text-slate-400 text-[11px] truncate max-w-xs">{item.filename}</td>
                                                        </>
                                                    )}

                                                    {drillDownTab === 'stm_items' && (
                                                        <>
                                                            <td className="px-3 py-2 whitespace-nowrap text-slate-600">{item.visit_date}</td>
                                                            <td className="px-3 py-2 font-mono font-medium text-emerald-800">{item.claim_submission_no}</td>
                                                            <td className="px-3 py-2 font-mono text-slate-600">{item.rep_no}</td>
                                                            <td className="px-3 py-2 font-mono text-slate-600">{item.seq_no || item.an}</td>
                                                            <td className="px-3 py-2 font-mono text-slate-600">{item.hn}</td>
                                                            <td className="px-3 py-2 font-medium text-slate-800">{item.patient_name}</td>
                                                            <td className="px-3 py-2 text-right text-slate-600">{formatMoney(item.amount_claim)}</td>
                                                            <td className="px-3 py-2 text-right font-semibold text-emerald-700">{formatMoney(item.amount_approved)}</td>
                                                            <td className="px-3 py-2 text-right text-amber-700">{formatMoney(item.amount_diff)}</td>
                                                            <td className="px-3 py-2 text-slate-400 text-[11px] truncate max-w-xs">{item.filename}</td>
                                                        </>
                                                    )}

                                                    {drillDownTab === 'c_deny' && (
                                                        <>
                                                            <td className="px-3 py-2 whitespace-nowrap text-slate-600">{item.visit_date}</td>
                                                            <td className="px-3 py-2 font-mono font-medium text-slate-900">{item.rep_no}</td>
                                                            <td className="px-3 py-2 font-mono text-slate-600">{item.seq_no || item.an}</td>
                                                            <td className="px-3 py-2 font-mono text-slate-600">{item.hn}</td>
                                                            <td className="px-3 py-2 font-medium text-slate-800">{item.patient_name}</td>
                                                            <td className="px-3 py-2 text-center">
                                                                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-xs">
                                                                    {item.c_deny_code}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2 text-slate-600 text-[11px]">{item.c_deny_descr || '-'}</td>
                                                            <td className="px-3 py-2 text-right font-semibold text-slate-900">{formatMoney(item.amount_claim)}</td>
                                                            <td className="px-3 py-2 text-slate-400 text-[11px] truncate max-w-xs">{item.filename}</td>
                                                        </>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
                            <div>แสดง {filteredDrillDownItems.length} รายการ (จำกัดสูงสุด 300 รายการ)</div>
                            <button
                                type="button"
                                onClick={() => setSelectedMonth(null)}
                                className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors"
                            >
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sync STM Modal */}
            {showStmModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <DownloadCloud className="w-5 h-5 text-emerald-600" />
                                <h3 className="text-base font-bold text-slate-900">ซิงค์ Statement (STM) e-Claim</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowStmModal(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">
                            ระบบจะเชื่อมต่อเว็บ e-Claim สปสช. (UCS) เพื่อดาวน์โหลดและนำเข้า Statement อัตโนมัติ
                        </p>
                        <form onSubmit={handleSyncStmSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">ปีงบประมาณ</label>
                                    <input
                                        type="number"
                                        value={syncYear}
                                        onChange={(e) => setSyncYear(parseInt(e.target.value) || 2570)}
                                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">งวดเดือน (1-12)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={12}
                                        value={syncMonth}
                                        onChange={(e) => setSyncMonth(parseInt(e.target.value) || 1)}
                                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg"
                                    />
                                </div>
                            </div>
                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowStmModal(false)}
                                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={syncingStm}
                                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {syncingStm ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <DownloadCloud className="w-3.5 h-3.5" />}
                                    เริ่มซิงค์ข้อมูล
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Sync REP Modal */}
            {showRepModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <RefreshCw className="w-5 h-5 text-sky-600" />
                                <h3 className="text-base font-bold text-slate-900">ซิงค์ e-Claim REP</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowRepModal(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">
                            ระบบจะเชื่อมต่อไปยัง e-Claim Validation Portal เพื่อดาวน์โหลดไฟล์ REP ที่ขึ้นต้นด้วย <code>eclaim_14689_OP_...</code>
                        </p>
                        <form onSubmit={handleSyncRepSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">ปีงบประมาณ</label>
                                    <input
                                        type="number"
                                        value={repSyncYear}
                                        onChange={(e) => setRepSyncYear(parseInt(e.target.value) || 2570)}
                                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">งวดเดือน (1-12)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={12}
                                        value={repSyncMonth}
                                        onChange={(e) => setRepSyncMonth(parseInt(e.target.value) || 1)}
                                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="repForce"
                                    checked={repForce}
                                    onChange={(e) => setRepForce(e.target.checked)}
                                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                />
                                <label htmlFor="repForce" className="text-xs text-slate-600">
                                    บังคับดาวน์โหลดใหม่ทั้งหมด (Force Re-download)
                                </label>
                            </div>
                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowRepModal(false)}
                                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={syncingRep}
                                    className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {syncingRep ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                    เริ่มซิงค์ REP
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </RcmLayout>
    );
}
