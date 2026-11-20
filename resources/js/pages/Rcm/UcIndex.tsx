import React, { useState } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import RcmLayout from './RcmLayout';
import {
    Heart,
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
    Building2,
    AlertTriangle,
    Receipt,
    Banknote,
    FileCheck,
    RefreshCw,
    Shield,
    Ambulance,
    UserCheck,
    Droplets,
    ExternalLink,
    UploadCloud,
    DownloadCloud,
    FileUp,
    Info,
    FolderDown,
    KeyRound,
} from 'lucide-react';

interface UcRow {
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

interface UcTotals {
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

interface UcComparisonData {
    period_mode: string | number;
    sub_scheme: string;
    claim_type: string;
    start_date: string;
    end_date: string;
    hosxp_ready: boolean;
    rows: UcRow[];
    totals: UcTotals;
}

interface UcIndexProps {
    filters: {
        period_mode: string | number;
        sub_scheme: string;
        claim_type: string;
    };
    comparison: UcComparisonData;
    hosxp_ready: boolean;
}

export default function UcIndex({ filters, comparison, hosxp_ready }: UcIndexProps) {
    const { flash } = usePage().props as any;

    const [periodMode, setPeriodMode] = useState<string | number>(filters.period_mode || 'since_jan_68');
    const [subScheme, setSubScheme] = useState<string>(filters.sub_scheme || 'all');
    const [claimType, setClaimType] = useState<string>(filters.claim_type || 'all');

    // Drill-Down Modal State
    const [selectedMonth, setSelectedMonth] = useState<UcRow | null>(null);
    const [drillDownTab, setDrillDownTab] = useState<'hosxp_visits' | 'rep_cases' | 'stm_items' | 'c_deny'>('hosxp_visits');
    const [drillDownLoading, setDrillDownLoading] = useState<boolean>(false);
    const [drillDownData, setDrillDownData] = useState<any[]>([]);
    const [drillDownSearch, setDrillDownSearch] = useState<string>('');
    const [hosxpMatchFilter, setHosxpMatchFilter] = useState<'all' | 'settled' | 'waiting_stm' | 'c_deny' | 'unclaimed'>('all');

    // STM Sync Modal State
    const [showStmModal, setShowStmModal] = useState<boolean>(false);
    const [syncingStm, setSyncingStm] = useState<boolean>(false);
    const [syncYear, setSyncYear] = useState<string>('2570');
    const [syncMonth, setSyncMonth] = useState<string>('10');

    // REP Sync Modal State
    const [showRepModal, setShowRepModal] = useState<boolean>(false);
    const [syncingRep, setSyncingRep] = useState<boolean>(false);
    const [repSyncYear, setRepSyncYear] = useState<string>('2570');
    const [repSyncMonth, setRepSyncMonth] = useState<string>('10');
    const [repForce, setRepForce] = useState<boolean>(false);

    const handleFilterChange = (newPeriod: string | number, newSubScheme: string, newClaimType: string) => {
        router.get(
            route('rcm.uc.index'),
            {
                period_mode: newPeriod,
                sub_scheme: newSubScheme,
                claim_type: newClaimType,
            },
            { preserveState: true, preserveScroll: true }
        );
    };

    const openDrillDown = async (row: UcRow, tab: 'hosxp_visits' | 'rep_cases' | 'stm_items' | 'c_deny' = 'hosxp_visits') => {
        setSelectedMonth(row);
        setDrillDownTab(tab);
        setDrillDownSearch('');
        setHosxpMatchFilter('all');
        setDrillDownLoading(true);

        try {
            const resp = await fetch(
                route('rcm.uc.drill-down', {
                    month_key: row.month_key,
                    sub_scheme: subScheme,
                    claim_type: claimType,
                    tab: tab,
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
                route('rcm.uc.drill-down', {
                    month_key: selectedMonth.month_key,
                    sub_scheme: subScheme,
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
            route('rcm.uc.sync-stm'),
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
            route('rcm.uc.sync-portal'),
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
        // Sub-filter สำหรับแท็บ HOSxP (จับคู่ 1-to-1)
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
            (item.stm_doc_no && item.stm_doc_no.toLowerCase().includes(q))
        );
    });

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('th-TH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(val || 0);
    };

    const formatNumber = (val: number) => {
        return new Intl.NumberFormat('th-TH').format(val || 0);
    };

    return (
        <RcmLayout title="บัตรทอง (UC / สปสช.)" active="uc">
            {/* Flash Messages */}
            {flash?.success && (
                <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 shadow-2xs">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-emerald-800 font-medium">{flash.success}</div>
                </div>
            )}
            {flash?.error && (
                <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 shadow-2xs">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-rose-800 font-medium">{flash.error}</div>
                </div>
            )}

            {/* Header & Main Actions */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 mb-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-tr from-rose-500 to-pink-500 rounded-xl text-white shadow-md shadow-rose-200">
                            <Heart className="w-6 h-6 fill-rose-100/20" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                                    ระบบบัตรทอง (Universal Coverage - UC)
                                </h1>
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                                    3-Way Reconciliation
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                เปรียบเทียบข้อมูล 3 ฝ่าย (HOSxP vs e-Claim REP vs e-Claim Statement STM อนุมัติจ่าย) สิทธิบัตรทองฉุกเฉิน, รพ.ค่าย, พลทหารและวิวัฒน์
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href={route('rcm.import.index', { scheme: 'ucs' })}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors cursor-pointer"
                            title="ไปยังศูนย์รวมนำเข้าข้อมูลและดึงไฟล์ e-Claim / STM อัตโนมัติ"
                        >
                            <FolderDown className="w-3.5 h-3.5 text-amber-700" />
                            ศูนย์นำเข้าข้อมูล (Import Hub)
                        </Link>
                        <button
                            onClick={() => setShowRepModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors cursor-pointer"
                            title="ดึงไฟล์ผลการตรวจรับส่งเบิก (eclaim_14689_OP) จากเว็บ e-Claim สปสช. (ValidationMainAction.do?maininscl=ucs)"
                        >
                            <DownloadCloud className="w-3.5 h-3.5 text-sky-600" />
                            ซิงค์ e-Claim REP
                        </button>
                        <button
                            onClick={() => setShowStmModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                            title="ดึงไฟล์ผลการอนุมัติจ่ายจริง (14689_OPUCS) จากเว็บ e-Claim สปสช. (statementUCSAction.do)"
                        >
                            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                            ดึงข้อมูล STM ล่าสุด
                        </button>
                        <a
                            href={route('rcm.uc.export-excel', {
                                period_mode: periodMode,
                                sub_scheme: subScheme,
                                claim_type: claimType,
                            })}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors"
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                            ส่งออก Excel
                        </a>
                        <a
                            href={route('rcm.uc.export-pdf', {
                                period_mode: periodMode,
                                sub_scheme: subScheme,
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
                <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3">
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
                                handleFilterChange(e.target.value, subScheme, claimType);
                            }}
                            className="w-full text-xs font-medium bg-slate-50/70 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                        >
                            <option value="since_jan_68">⭐ ย้อนหลังตั้งแต่ ม.ค.68 ถึงปัจจุบัน</option>
                            <option value="2570">ปีงบประมาณ 2570 (ต.ค.69 - ก.ย.70)</option>
                            <option value="2569">ปีงบประมาณ 2569 (ต.ค.68 - ก.ย.69)</option>
                            <option value="2568">ปีงบประมาณ 2568 (ต.ค.67 - ก.ย.68)</option>
                        </select>
                    </div>

                    {/* 2. Sub-Scheme Filter */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                            <Filter className="w-3.5 h-3.5 text-slate-400" />
                            กลุ่มสิทธิบัตรทอง (Sub-Scheme)
                        </label>
                        <select
                            value={subScheme}
                            onChange={(e) => {
                                setSubScheme(e.target.value);
                                handleFilterChange(periodMode, e.target.value, claimType);
                            }}
                            className="w-full text-xs font-medium bg-slate-50/70 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                        >
                            <option value="all">สิทธิบัตรทองทั้งหมด (ไม่รวม รพ.ค่าย และไตเทียม)</option>
                            <option value="emergency">🚑 บัตรทองฉุกเฉิน (04)</option>
                            <option value="soldier_civic">🎖️ พลทหารและวิวัฒน์พลเมือง (19)</option>
                        </select>
                    </div>

                    {/* 3. Claim Type Filter */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            ประเภทบริการ (Claim Type)
                        </label>
                        <select
                            value={claimType}
                            onChange={(e) => {
                                setClaimType(e.target.value);
                                handleFilterChange(periodMode, subScheme, e.target.value);
                            }}
                            className="w-full text-xs font-medium bg-slate-50/70 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                        >
                            <option value="all">ทั้งหมด (OPD + IPD)</option>
                            <option value="opd">ผู้ป่วยนอก (OPD)</option>
                            <option value="ipd">ผู้ป่วยใน (IPD)</option>
                        </select>
                    </div>
                </div>

                {/* Sub-bar: Hospital UC & Hemodialysis segregation notice & e-Claim Direct Links */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-slate-600">
                        <div className="flex items-center gap-1.5">
                            <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                                <strong className="text-slate-800">แยกสิทธิบัตรทอง รพ.ค่าย (03):</strong> ไปบริหารจัดการในโมดูล{' '}
                                <a href="/rcm/uc-hospital" className="text-emerald-700 font-semibold underline hover:text-emerald-800">
                                    บัตรทอง รพ
                                </a>
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Info className="w-4 h-4 text-rose-500 shrink-0" />
                            <span>
                                <strong className="text-slate-800">ไม่รวมไตเทียม:</strong> แยกไปโมดูล{' '}
                                <a href="/rcm/dialysis" className="text-rose-600 font-semibold underline hover:text-rose-700">
                                    RCM ไตเทียม
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
                            เว็บ e-Claim STM (สปสช.)
                        </a>
                    </div>
                </div>

                {/* Banner when no REP files have been imported yet */}
                {comparison.totals.rep_cases === 0 && (
                    <div className="mt-4 p-4 bg-amber-50/90 border border-amber-200/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
                        <div className="flex items-start gap-2.5">
                            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold text-sm text-amber-950">
                                    ยังไม่พบข้อมูลผลการตรวจ e-Claim (REP) ของสิทธิบัตรทองในระบบ
                                </span>
                                <p className="text-amber-800 text-xs mt-0.5 leading-relaxed">
                                    ยอดส่งเบิก e-Claim และ C-Deny จะแสดงผลเมื่อมีการนำเข้าไฟล์ REP (เช่น <code className="bg-amber-100/70 px-1 py-0.5 rounded text-amber-900 font-mono">eclaim_14689_OP_...ecd</code> หรือ <code className="bg-amber-100/70 px-1 py-0.5 rounded text-amber-900 font-mono">eclaim_14689_IP_...ecd</code>) ท่านสามารถกดนำเข้าไฟล์ที่บันทึกไว้ หรือเชื่อมต่อดึงไฟล์อัตโนมัติจากเว็บ e-Claim สปสช.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Link
                                href={route('rcm.import.index', { scheme: 'ucs' })}
                                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer text-xs"
                            >
                                <FolderDown className="w-4 h-4" />
                                ไปที่ศูนย์นำเข้าข้อมูล (Data Import Hub)
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                {/* 1. HOSxP Card */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-sky-700 uppercase tracking-wider flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            [1] HOSxP ลูกหนี้สิทธิ
                        </span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 font-semibold border border-sky-200">
                            {formatNumber(comparison.totals.hosxp_cases)} เคส
                        </span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 tracking-tight">
                        ฿{formatCurrency(comparison.totals.hosxp_uc_money)}
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>ค่ารักษารวม: ฿{formatCurrency(comparison.totals.hosxp_income)}</span>
                        <span>เงินสด: ฿{formatCurrency(comparison.totals.hosxp_cash)}</span>
                    </div>
                </div>

                {/* 2. e-Claim REP Card */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                            <Receipt className="w-3.5 h-3.5" />
                            [2] e-Claim / REP ส่งเบิก
                        </span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                            {formatNumber(comparison.totals.rep_cases)} เคส
                        </span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 tracking-tight">
                        ฿{formatCurrency(comparison.totals.rep_claim)}
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>ผ่านอนุมัติ: ฿{formatCurrency(comparison.totals.rep_approved)}</span>
                        {comparison.totals.rep_c_deny_cases > 0 && (
                            <span className="text-rose-600 font-medium">
                                ติด C: {comparison.totals.rep_c_deny_cases} เคส
                            </span>
                        )}
                    </div>
                </div>

                {/* 3. e-Claim Statement (STM) Card */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                            <Banknote className="w-3.5 h-3.5" />
                            [3] e-Claim Statement (STM)
                        </span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                            {formatNumber(comparison.totals.stm_cases ?? 0)} เคส ({comparison.totals.stm_batches ?? comparison.totals.smt_batches} งวด)
                        </span>
                    </div>
                    <div className="text-2xl font-black text-emerald-600 tracking-tight">
                        ฿{formatCurrency(comparison.totals.stm_approved ?? comparison.totals.smt_total_transferred)}
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>ยอดอนุมัติจ่ายชดเชยจริง</span>
                        <span className="text-emerald-700 font-semibold">e-Claim สปสช.</span>
                    </div>
                </div>

                {/* 4. Variance & Recovery Card */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                            <Shield className="w-3.5 h-3.5" />
                            [4] อัตราคืนทุน & ผลต่าง
                        </span>
                        <span
                            className={`text-[11px] px-1.5 py-0.5 rounded font-bold ${
                                comparison.totals.recovery_rate >= 90
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                            }`}
                        >
                            {comparison.totals.recovery_rate}% Recovery
                        </span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 tracking-tight">
                        ฿{formatCurrency(comparison.totals.diff_hosxp_stm ?? comparison.totals.diff_hosxp_smt)}
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>ผลต่าง HOSxP vs STM</span>
                        {comparison.totals.unclaimed_cases > 0 && (
                            <span className="text-amber-600 font-medium">
                                ค้างส่ง: {comparison.totals.unclaimed_cases} เคส
                            </span>
                        )}
                    </div>
                </div>

                {/* Banner when no REP files have been imported yet */}
                {comparison.totals.rep_cases === 0 && (
                    <div className="mt-4 p-4 bg-amber-50/90 border border-amber-200/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
                        <div className="flex items-start gap-2.5">
                            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold text-sm text-amber-950">
                                    ยังไม่พบข้อมูลผลการตรวจ e-Claim (REP) ของสิทธิบัตรทองในระบบ
                                </span>
                                <p className="text-amber-800 text-xs mt-0.5 leading-relaxed">
                                    ยอดส่งเบิก e-Claim และ C-Deny จะแสดงผลเมื่อมีการนำเข้าไฟล์ REP (เช่น <code className="bg-amber-100/70 px-1 py-0.5 rounded text-amber-900 font-mono">eclaim_14689_OP_...ecd</code> หรือ <code className="bg-amber-100/70 px-1 py-0.5 rounded text-amber-900 font-mono">eclaim_14689_IP_...ecd</code>) ท่านสามารถกดนำเข้าไฟล์ที่บันทึกไว้ หรือเชื่อมต่อดึงไฟล์อัตโนมัติจากเว็บ e-Claim สปสช.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Link
                                href={route('rcm.import.index', { scheme: 'ucs' })}
                                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer text-xs"
                            >
                                <FolderDown className="w-4 h-4" />
                                ไปที่ศูนย์นำเข้าข้อมูล (Data Import Hub)
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            {/* 3-Way Reconciliation Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden mb-5">
                <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-rose-600" />
                        <h2 className="text-sm font-bold text-slate-800">
                            ตารางเปรียบเทียบข้อมูลรายเดือน 3 ฝ่าย (สิทธิบัตรทอง)
                        </h2>
                    </div>
                    <span className="text-xs text-slate-500">
                        {comparison.rows.length} เดือนที่แสดงผล
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-100/90 text-slate-700 font-semibold border-b border-slate-200">
                                <th rowSpan={2} className="px-3 py-3 border-r border-slate-200 text-center w-28">
                                    เดือน/ปี
                                </th>
                                <th colSpan={3} className="px-3 py-2 text-center bg-sky-50 text-sky-900 border-r border-slate-200">
                                    [1] HOSxP สิทธิบัตรทอง
                                </th>
                                <th colSpan={3} className="px-3 py-2 text-center bg-amber-50 text-amber-900 border-r border-slate-200">
                                    [2] e-Claim / REP ส่งเบิก
                                </th>
                                <th colSpan={2} className="px-3 py-2 text-center bg-emerald-50 text-emerald-900 border-r border-slate-200">
                                    [3] e-Claim Statement (STM)
                                </th>
                                <th colSpan={2} className="px-3 py-2 text-center bg-slate-100 text-slate-900 border-r border-slate-200">
                                    [4] ผลต่าง & คืนทุน
                                </th>
                                <th rowSpan={2} className="px-3 py-3 text-center w-24">
                                    การจัดการ
                                </th>
                            </tr>
                            <tr className="bg-slate-50 text-[11px] text-slate-600 border-b border-slate-200">
                                <th className="px-2.5 py-1.5 text-right bg-sky-50/50">เคส</th>
                                <th className="px-2.5 py-1.5 text-right bg-sky-50/50">ลูกหนี้สิทธิ (฿)</th>
                                <th className="px-2.5 py-1.5 text-right bg-sky-50/50 border-r border-slate-200">เงินสด (฿)</th>

                                <th className="px-2.5 py-1.5 text-right bg-amber-50/50">เคสเบิก</th>
                                <th className="px-2.5 py-1.5 text-right bg-amber-50/50">ยอดตั้งเบิก (฿)</th>
                                <th className="px-2.5 py-1.5 text-right bg-amber-50/50 border-r border-slate-200">ยอดอนุมัติ (฿)</th>

                                <th className="px-2.5 py-1.5 text-right bg-emerald-50/50">งวด STM</th>
                                <th className="px-2.5 py-1.5 text-right bg-emerald-50/50 border-r border-slate-200">อนุมัติจ่าย (฿)</th>

                                <th className="px-2.5 py-1.5 text-right bg-slate-100/50">ผลต่างรวม (฿)</th>
                                <th className="px-2.5 py-1.5 text-center bg-slate-100/50 border-r border-slate-200">คืนทุน %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                            {comparison.rows.map((row) => (
                                <tr key={row.month_key} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-3 py-2.5 border-r border-slate-200 text-center font-sans font-medium text-slate-800">
                                        {row.short_label_th}
                                    </td>

                                    {/* HOSxP */}
                                    <td className="px-2.5 py-2.5 text-right text-slate-700">
                                        {formatNumber(row.hosxp_cases)}
                                    </td>
                                    <td className="px-2.5 py-2.5 text-right font-medium text-slate-900">
                                        {formatCurrency(row.hosxp_uc_money)}
                                    </td>
                                    <td className="px-2.5 py-2.5 text-right text-slate-500 border-r border-slate-200">
                                        {formatCurrency(row.hosxp_cash)}
                                    </td>

                                    {/* e-Claim REP */}
                                    <td className="px-2.5 py-2.5 text-right text-slate-700">
                                        {formatNumber(row.rep_cases)}
                                    </td>
                                    <td className="px-2.5 py-2.5 text-right font-medium text-slate-900">
                                        {formatCurrency(row.rep_claim)}
                                    </td>
                                    <td className="px-2.5 py-2.5 text-right text-slate-700 border-r border-slate-200">
                                        {formatCurrency(row.rep_approved)}
                                    </td>

                                    {/* e-Claim STM */}
                                    <td className="px-2.5 py-2.5 text-right text-slate-700">
                                        {(row.stm_batches ?? row.smt_batches) > 0 ? (
                                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold" title={`${row.stm_cases ?? 0} เคสที่อนุมัติ`}>
                                                {row.stm_batches ?? row.smt_batches} งวด{row.stm_cases ? ` (${row.stm_cases} เคส)` : ''}
                                            </span>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                    <td className="px-2.5 py-2.5 text-right font-bold text-emerald-600 border-r border-slate-200">
                                        {formatCurrency(row.stm_approved ?? row.smt_total_transferred)}
                                    </td>

                                    {/* Variance & Recovery */}
                                    <td className="px-2.5 py-2.5 text-right font-medium text-slate-800">
                                        {formatCurrency(row.diff_hosxp_stm ?? row.diff_hosxp_smt)}
                                    </td>
                                    <td className="px-2.5 py-2.5 text-center border-r border-slate-200 font-sans">
                                        <div className="flex flex-col items-center">
                                            <span className="text-[11px] font-bold text-slate-800">
                                                {row.recovery_rate}%
                                            </span>
                                            <div className="w-14 bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                                                <div
                                                    className={`h-full ${
                                                        row.recovery_rate >= 90
                                                            ? 'bg-emerald-500'
                                                            : row.recovery_rate >= 50
                                                            ? 'bg-amber-500'
                                                            : 'bg-rose-500'
                                                    }`}
                                                    style={{ width: `${Math.min(100, Math.max(0, row.recovery_rate))}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-3 py-2.5 text-center font-sans">
                                        <button
                                            onClick={() => openDrillDown(row)}
                                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors cursor-pointer"
                                        >
                                            เจาะลึก
                                            <ChevronRight className="w-3 h-3" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {/* Totals Footer */}
                        <tfoot>
                            <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 font-mono text-xs">
                                <td className="px-3 py-3 border-r border-slate-300 text-center font-sans text-slate-900">
                                    รวมทั้งสิ้น
                                </td>
                                <td className="px-2.5 py-3 text-right">
                                    {formatNumber(comparison.totals.hosxp_cases)}
                                </td>
                                <td className="px-2.5 py-3 text-right text-slate-900">
                                    {formatCurrency(comparison.totals.hosxp_uc_money)}
                                </td>
                                <td className="px-2.5 py-3 text-right text-slate-600 border-r border-slate-300">
                                    {formatCurrency(comparison.totals.hosxp_cash)}
                                </td>
                                <td className="px-2.5 py-3 text-right">
                                    {formatNumber(comparison.totals.rep_cases)}
                                </td>
                                <td className="px-2.5 py-3 text-right text-slate-900">
                                    {formatCurrency(comparison.totals.rep_claim)}
                                </td>
                                <td className="px-2.5 py-3 text-right text-slate-700 border-r border-slate-300">
                                    {formatCurrency(comparison.totals.rep_approved)}
                                </td>
                                <td className="px-2.5 py-3 text-right text-emerald-700">
                                    {comparison.totals.stm_batches ?? comparison.totals.smt_batches} งวด
                                </td>
                                <td className="px-2.5 py-3 text-right text-emerald-700 border-r border-slate-300">
                                    {formatCurrency(comparison.totals.stm_approved ?? comparison.totals.smt_total_transferred)}
                                </td>
                                <td className="px-2.5 py-3 text-right text-slate-900">
                                    {formatCurrency(comparison.totals.diff_hosxp_stm ?? comparison.totals.diff_hosxp_smt)}
                                </td>
                                <td className="px-2.5 py-3 text-center border-r border-slate-300 font-sans text-emerald-800">
                                    {comparison.totals.recovery_rate}%
                                </td>
                                <td className="px-3 py-3 text-center font-sans text-slate-400">
                                    -
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Drill-Down Modal */}
            {selectedMonth && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                        {/* Modal Header */}
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
                                    <Heart className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">
                                        เจาะลึกข้อมูลสิทธิบัตรทอง (UC) — ประจำเดือน {selectedMonth.full_label_th}
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        HOSxP: ฿{formatCurrency(selectedMonth.hosxp_uc_money)} | e-Claim: ฿{formatCurrency(selectedMonth.rep_claim)} | SMT โอนจริง: ฿{formatCurrency(selectedMonth.smt_total_transferred)}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedMonth(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Tabs & Search */}
                        <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
                                <button
                                    onClick={() => handleTabChange('hosxp_visits')}
                                    className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                                        drillDownTab === 'hosxp_visits'
                                            ? 'bg-white text-rose-700 shadow-2xs font-bold'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    [1] HOSxP ผู้รับบริการ ({selectedMonth.hosxp_cases})
                                </button>
                                <button
                                    onClick={() => handleTabChange('rep_cases')}
                                    className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                                        drillDownTab === 'rep_cases'
                                            ? 'bg-white text-rose-700 shadow-2xs font-bold'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    [2] e-Claim ส่งเบิก ({selectedMonth.rep_cases})
                                </button>
                                <button
                                    onClick={() => handleTabChange('stm_items')}
                                    className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                                        drillDownTab === 'stm_items'
                                            ? 'bg-white text-rose-700 shadow-2xs font-bold'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    [3] e-Claim STM ({selectedMonth.stm_cases ?? selectedMonth.smt_batches ?? 0} รายการ)
                                </button>
                                <button
                                    onClick={() => handleTabChange('c_deny')}
                                    className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                                        drillDownTab === 'c_deny'
                                            ? 'bg-white text-rose-700 shadow-2xs font-bold'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    [4] ติด C-Deny ({selectedMonth.rep_c_deny_cases})
                                </button>
                            </div>

                            {/* Search box inside modal */}
                            <div className="relative w-full sm:w-64">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                <input
                                    type="text"
                                    placeholder="ค้นหา VN, HN, ชื่อ หรือเลขที่..."
                                    value={drillDownSearch}
                                    onChange={(e) => setDrillDownSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                                />
                            </div>
                        </div>

                        {/* Modal Content Table */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {drillDownLoading ? (
                                <div className="py-16 text-center text-slate-400">
                                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-rose-500" />
                                    <p className="text-sm font-medium">กำลังโหลดข้อมูลเจาะลึก...</p>
                                </div>
                            ) : filteredDrillDownItems.length === 0 ? (
                                <div className="py-16 text-center text-slate-400">
                                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                    <p className="text-sm font-medium">ไม่พบข้อมูลในหมวดนี้</p>
                                </div>
                            ) : drillDownTab === 'hosxp_visits' ? (
                                <div>
                                    {/* Sub-Filters for HOSxP 1-to-1 Matching */}
                                    <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                            <span className="text-slate-500 text-[11px] font-semibold mr-1">สถานะจับคู่:</span>
                                            <button
                                                type="button"
                                                onClick={() => setHosxpMatchFilter('all')}
                                                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                                                    hosxpMatchFilter === 'all'
                                                        ? 'bg-slate-800 text-white'
                                                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                                }`}
                                            >
                                                ทั้งหมด ({drillDownData.length})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setHosxpMatchFilter('settled')}
                                                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                                                    hosxpMatchFilter === 'settled'
                                                        ? 'bg-emerald-600 text-white'
                                                        : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                                                }`}
                                            >
                                                ชดเชยแล้ว ({drillDownData.filter((i) => i.match_status === 'settled').length})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setHosxpMatchFilter('waiting_stm')}
                                                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                                                    hosxpMatchFilter === 'waiting_stm'
                                                        ? 'bg-amber-600 text-white'
                                                        : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
                                                }`}
                                            >
                                                รอ Statement ({drillDownData.filter((i) => i.match_status === 'waiting_stm').length})
                                            </button>
                                            {drillDownData.some((i) => i.match_status === 'c_deny') && (
                                                <button
                                                    type="button"
                                                    onClick={() => setHosxpMatchFilter('c_deny')}
                                                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                                                        hosxpMatchFilter === 'c_deny'
                                                            ? 'bg-rose-600 text-white'
                                                            : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
                                                    }`}
                                                >
                                                    ติด C-Deny ({drillDownData.filter((i) => i.match_status === 'c_deny').length})
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setHosxpMatchFilter('unclaimed')}
                                                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                                                    hosxpMatchFilter === 'unclaimed'
                                                        ? 'bg-slate-600 text-white'
                                                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                                }`}
                                            >
                                                ยังไม่ส่งเบิก ({drillDownData.filter((i) => i.match_status === 'unclaimed').length})
                                            </button>
                                        </div>
                                        <div className="text-[11px] text-slate-500 font-sans">
                                            HOSxP เป็นตัวตั้ง · จับคู่ตรงกับ SEQ/AN
                                        </div>
                                    </div>

                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                                            <tr>
                                                <th className="px-3 py-2">VN / AN (SEQ)</th>
                                                <th className="px-3 py-2">วันที่</th>
                                                <th className="px-3 py-2">HN</th>
                                                <th className="px-3 py-2">ชื่อ-สกุล (PDPA)</th>
                                                <th className="px-3 py-2">แผนก</th>
                                                <th className="px-3 py-2">สิทธิย่อย</th>
                                                <th className="px-3 py-2 text-right">ยอดเบิก HOSxP (฿)</th>
                                                <th className="px-3 py-2 text-right">ยอดส่ง REP (฿)</th>
                                                <th className="px-3 py-2 text-right">ชดเชย STM (฿)</th>
                                                <th className="px-3 py-2 text-center">สถานะชดเชย</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-mono">
                                            {filteredDrillDownItems.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/80">
                                                    <td className="px-3 py-2 font-bold text-slate-800">{item.vn_an}</td>
                                                    <td className="px-3 py-2 text-slate-600">{item.service_date}</td>
                                                    <td className="px-3 py-2 text-slate-600">{item.hn}</td>
                                                    <td className="px-3 py-2 font-sans font-medium text-slate-900">{item.patient_name}</td>
                                                    <td className="px-3 py-2 font-sans text-slate-500 text-[11px]">{item.department_name || '-'}</td>
                                                    <td className="px-3 py-2 font-sans text-slate-600">{item.pttype_name}</td>
                                                    <td className="px-3 py-2 text-right font-bold text-slate-900">{formatCurrency(item.claim_amount)}</td>
                                                    <td className="px-3 py-2 text-right text-slate-600">
                                                        {item.rep_claim > 0 ? (
                                                            <span title={`REP: ${item.rep_no || '-'}`}>฿{formatCurrency(item.rep_claim)}</span>
                                                        ) : (
                                                            '-'
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-bold text-emerald-600">
                                                        {item.stm_approved > 0 ? (
                                                            <span title={`Statement: ${item.stm_doc_no || '-'}`}>฿{formatCurrency(item.stm_approved)}</span>
                                                        ) : (
                                                            '-'
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-center font-sans">
                                                        {item.match_status === 'settled' ? (
                                                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                                                ชดเชยแล้ว
                                                            </span>
                                                        ) : item.match_status === 'waiting_stm' ? (
                                                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-semibold border border-amber-200">
                                                                รอ Statement
                                                            </span>
                                                        ) : item.match_status === 'c_deny' ? (
                                                            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                                                                ติด C ({item.c_deny_code})
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-medium border border-slate-200">
                                                                ยังไม่ส่งเบิก
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : drillDownTab === 'rep_cases' ? (
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                                        <tr>
                                            <th className="px-3 py-2">เลขที่ REP</th>
                                            <th className="px-3 py-2">SEQ / AN</th>
                                            <th className="px-3 py-2">HN</th>
                                            <th className="px-3 py-2">ชื่อผู้ป่วย</th>
                                            <th className="px-3 py-2">วันที่รับบริการ</th>
                                            <th className="px-3 py-2 text-right">ยอดตั้งเบิก (฿)</th>
                                            <th className="px-3 py-2 text-right">ยอดอนุมัติ (฿)</th>
                                            <th className="px-3 py-2 text-right">ผลต่าง (฿)</th>
                                            <th className="px-3 py-2">สถานะ / ติด C</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-mono">
                                        {filteredDrillDownItems.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/80">
                                                <td className="px-3 py-2 font-bold text-slate-800">{item.rep_no}</td>
                                                <td className="px-3 py-2 text-slate-600">{item.seq_no || item.an}</td>
                                                <td className="px-3 py-2 text-slate-600">{item.hn}</td>
                                                <td className="px-3 py-2 font-sans text-slate-900">{item.patient_name}</td>
                                                <td className="px-3 py-2 text-slate-600">{item.visit_date}</td>
                                                <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.amount_claim)}</td>
                                                <td className="px-3 py-2 text-right text-emerald-600">{formatCurrency(item.amount_approved)}</td>
                                                <td className="px-3 py-2 text-right font-bold text-rose-600">{formatCurrency(item.amount_diff)}</td>
                                                <td className="px-3 py-2 font-sans">
                                                    {item.c_deny_code ? (
                                                        <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold text-[10px]">
                                                            {item.c_deny_code}
                                                        </span>
                                                    ) : (
                                                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold text-[10px]">
                                                            ผ่าน
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (drillDownTab === 'stm_items' || (drillDownTab as string) === 'smt_transfers') ? (
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                                        <tr>
                                            <th className="px-3 py-2">เลขที่ Statement</th>
                                            <th className="px-3 py-2">เลขที่ REP</th>
                                            <th className="px-3 py-2">SEQ / AN</th>
                                            <th className="px-3 py-2">HN</th>
                                            <th className="px-3 py-2">ชื่อผู้ป่วย (PDPA)</th>
                                            <th className="px-3 py-2">วันที่รับบริการ</th>
                                            <th className="px-3 py-2 text-right">ยอดตั้งเบิก (฿)</th>
                                            <th className="px-3 py-2 text-right">ยอดอนุมัติ (฿)</th>
                                            <th className="px-3 py-2 text-right">ผลต่าง (฿)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-mono">
                                        {filteredDrillDownItems.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/80">
                                                <td className="px-3 py-2 font-bold text-slate-800 text-[11px]">{item.claim_submission_no || item.filename}</td>
                                                <td className="px-3 py-2 text-slate-600">{item.rep_no || '-'}</td>
                                                <td className="px-3 py-2 text-slate-600">{item.seq_no || item.an}</td>
                                                <td className="px-3 py-2 text-slate-600">{item.hn}</td>
                                                <td className="px-3 py-2 font-sans font-medium text-slate-900">{item.patient_name}</td>
                                                <td className="px-3 py-2 text-slate-600">{item.visit_date}</td>
                                                <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.amount_claim)}</td>
                                                <td className="px-3 py-2 text-right font-bold text-emerald-600">{formatCurrency(item.amount_approved)}</td>
                                                <td className="px-3 py-2 text-right font-bold text-rose-600">{formatCurrency(item.amount_diff)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                                        <tr>
                                            <th className="px-3 py-2">รหัสติด C</th>
                                            <th className="px-3 py-2">คำอธิบายข้อผิดพลาด</th>
                                            <th className="px-3 py-2">เลขที่ REP</th>
                                            <th className="px-3 py-2">HN</th>
                                            <th className="px-3 py-2">ชื่อผู้ป่วย</th>
                                            <th className="px-3 py-2 text-right">ยอดตัดจ่าย (฿)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-mono">
                                        {filteredDrillDownItems.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/80">
                                                <td className="px-3 py-2 font-bold text-rose-600">{item.c_deny_code}</td>
                                                <td className="px-3 py-2 font-sans text-slate-700">{item.c_deny_descr || '-'}</td>
                                                <td className="px-3 py-2 text-slate-800">{item.rep_no}</td>
                                                <td className="px-3 py-2 text-slate-600">{item.hn}</td>
                                                <td className="px-3 py-2 font-sans text-slate-900">{item.patient_name}</td>
                                                <td className="px-3 py-2 text-right font-bold text-rose-600">{formatCurrency(item.shortfall)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                            <span>แสดงผลสูงสุด {filteredDrillDownItems.length} รายการ (ปกป้องข้อมูลส่วนบุคคลตาม PDPA)</span>
                            <button
                                onClick={() => setSelectedMonth(null)}
                                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                            >
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* STM Sync Modal */}
            {showStmModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                                <Banknote className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    ดึง Statement (STM) จากเว็บ e-Claim สปสช.
                                </h3>
                                <p className="text-xs text-slate-500">
                                    เชื่อมต่อ eclaim.nhso.go.th (statementUCSAction.do)
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSyncStmSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        ปีงบประมาณ
                                    </label>
                                    <select
                                        value={syncYear}
                                        onChange={(e) => setSyncYear(e.target.value)}
                                        className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                    >
                                        <option value="2570">2570 (ปีปัจจุบัน)</option>
                                        <option value="2569">2569</option>
                                        <option value="2568">2568</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        เดือน
                                    </label>
                                    <select
                                        value={syncMonth}
                                        onChange={(e) => setSyncMonth(e.target.value)}
                                        className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                    >
                                        <option value="10">10 (ตุลาคม)</option>
                                        <option value="11">11 (พฤศจิกายน)</option>
                                        <option value="12">12 (ธันวาคม)</option>
                                        <option value="01">01 (มกราคม)</option>
                                        <option value="02">02 (กุมภาพันธ์)</option>
                                        <option value="03">03 (มีนาคม)</option>
                                        <option value="04">04 (เมษายน)</option>
                                        <option value="05">05 (พฤษภาคม)</option>
                                        <option value="06">06 (มิถุนายน)</option>
                                        <option value="07">07 (กรกฎาคม)</option>
                                        <option value="08">08 (สิงหาคม)</option>
                                        <option value="09">09 (กันยายน)</option>
                                    </select>
                                </div>
                            </div>

                            <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                                ระบบจะเรียกบริการ e-Claim สปสช. เพื่อสแกนและดาวน์โหลดไฟล์ Statement (STM) สิทธิบัตรทอง (UC) ทั้งผู้ป่วยนอก (OP) และผู้ป่วยใน (IP) พร้อมนำเข้าข้อมูลรายเคสและยอดอนุมัติจ่ายจริงเข้าสู่ระบบโดยอัตโนมัติ
                            </p>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowStmModal(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={syncingStm}
                                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                                >
                                    {syncingStm ? (
                                        <>
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            กำลังดึงข้อมูล...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="w-3.5 h-3.5" />
                                            เริ่มดึงข้อมูลทันที
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* REP Sync Modal */}
            {showRepModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-sky-100 text-sky-700 rounded-xl">
                                <DownloadCloud className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    ดึงไฟล์ส่งเบิก e-Claim REP (สปสช.)
                                </h3>
                                <p className="text-xs text-slate-500">
                                    ValidationMainAction.do?maininscl=ucs
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSyncRepSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        ปี พ.ศ. (ค.ศ.)
                                    </label>
                                    <select
                                        value={repSyncYear}
                                        onChange={(e) => setRepSyncYear(e.target.value)}
                                        className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                                    >
                                        <option value="2570">2570 (2027)</option>
                                        <option value="2569">2569 (2026)</option>
                                        <option value="2568">2568 (2025)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        เดือน
                                    </label>
                                    <select
                                        value={repSyncMonth}
                                        onChange={(e) => setRepSyncMonth(e.target.value)}
                                        className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                                    >
                                        <option value="10">10 (ตุลาคม)</option>
                                        <option value="11">11 (พฤศจิกายน)</option>
                                        <option value="12">12 (ธันวาคม)</option>
                                        <option value="1">01 (มกราคม)</option>
                                        <option value="2">02 (กุมภาพันธ์)</option>
                                        <option value="3">03 (มีนาคม)</option>
                                        <option value="4">04 (เมษายน)</option>
                                        <option value="5">05 (พฤษภาคม)</option>
                                        <option value="6">06 (มิถุนายน)</option>
                                        <option value="7">07 (กรกฎาคม)</option>
                                        <option value="8">08 (สิงหาคม)</option>
                                        <option value="9">09 (กันยายน)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 bg-sky-50/70 p-3 rounded-lg border border-sky-100">
                                <input
                                    type="checkbox"
                                    id="repForce"
                                    checked={repForce}
                                    onChange={(e) => setRepForce(e.target.checked)}
                                    className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                                />
                                <label htmlFor="repForce" className="text-xs text-sky-950 font-medium cursor-pointer">
                                    บังคับดาวน์โหลดและนำเข้าใหม่ (แม้ไฟล์มีอยู่ในระบบแล้ว)
                                </label>
                            </div>

                            <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                                ระบบจะดึงไฟล์ผลการตรวจรับส่งเบิก (REP) สิทธิบัตรทองที่ขึ้นต้นด้วย <code className="bg-slate-200/80 px-1 py-0.5 rounded font-mono text-slate-800">eclaim_14689_OP_</code> จากหน้า Validation ของ สปสช. พร้อมนำเข้าเลข SEQ และผลตรวจส่งเบิกมาจับคู่กับ HOSxP อัตโนมัติ
                            </p>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowRepModal(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={syncingRep}
                                    className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                                >
                                    {syncingRep ? (
                                        <>
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            กำลังดึงข้อมูล REP...
                                        </>
                                    ) : (
                                        <>
                                            <DownloadCloud className="w-3.5 h-3.5" />
                                            เริ่มดึงข้อมูลทันที
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </RcmLayout>
    );
}
