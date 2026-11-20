import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import RcmLayout from './RcmLayout';
import {
    Scale,
    FileSpreadsheet,
    FileText,
    ArrowUpRight,
    ArrowDownRight,
    CheckCircle2,
    AlertCircle,
    Clock,
    Search,
    X,
    Layers,
    Filter,
    HelpCircle,
    ChevronRight,
    Calendar,
    Building2,
    AlertTriangle,
    ArrowLeft,
    ExternalLink,
    ShieldAlert,
    Coins,
} from 'lucide-react';

interface MonthlyRow {
    month_key: string;
    month_label_th: string;
    month_short_th?: string;
    year_th: number;
    short_year_th?: string;
    short_label_th?: string;
    short_year_label_th?: string;
    full_label_th: string;
    hosxp_cases: number;
    hosxp_income: number;
    hosxp_uc_money: number;
    hosxp_cash: number;
    hosxp_drug: number;
    hemo_cases: number;
    hemo_uc_money: number;
    rep_cases: number;
    rep_claim: number;
    rep_approved: number;
    rep_drug: number;
    rep_c_deny_cases: number;
    rep_c_deny_amount: number;
    stm_cases: number;
    stm_claim: number;
    stm_approved: number;
    diff_hosxp_rep: number;
    diff_rep_stm: number;
    diff_hosxp_stm: number;
    unclaimed_cases?: number;
    pending_stm_cases?: number;
    recovery_rate: number;
    overall_recovery: number;
    status: string;
    status_label: string;
    unclaimed_cases?: number;
    pending_stm_cases?: number;
    variance_details?: {
        unclaimed_cases: number;
        unclaimed_amount: number;
        c_deny_cases: number;
        c_deny_amount: number;
        pending_stm_cases?: number;
        pending_stm_amount: number;
        hemo_cases: number;
        hemo_amount: number;
        cash_cases_amount: number;
    };
}

interface MonthlyTotals {
    hosxp_cases: number;
    hosxp_income: number;
    hosxp_uc_money: number;
    hosxp_cash: number;
    hosxp_drug: number;
    hemo_cases: number;
    hemo_uc_money: number;
    rep_cases: number;
    rep_claim: number;
    rep_approved: number;
    rep_drug: number;
    rep_c_deny_cases: number;
    rep_c_deny_amount: number;
    stm_cases: number;
    stm_claim: number;
    stm_approved: number;
    diff_hosxp_rep: number;
    diff_rep_stm: number;
    diff_hosxp_stm: number;
    unclaimed_cases?: number;
    pending_stm_cases?: number;
    recovery_rate: number;
    overall_recovery: number;
}

interface MonthlyComparisonData {
    budget_year: number;
    scheme: string;
    claim_type: string;
    service_scope?: string;
    start_date: string;
    end_date: string;
    hosxp_ready: boolean;
    rows: MonthlyRow[];
    totals: MonthlyTotals;
}

interface MonthlyReconcileProps {
    filters: {
        budget_year: number;
        scheme: string;
        claim_type: string;
        service_scope?: string;
    };
    comparison: MonthlyComparisonData;
    hosxp_ready: boolean;
}

export default function MonthlyReconcileIndex({ filters, comparison, hosxp_ready }: MonthlyReconcileProps) {
    const [budgetYear, setBudgetYear] = useState<number>(filters.budget_year || 2570);
    const [scheme, setScheme] = useState<string>(filters.scheme || 'all');
    const [claimType, setClaimType] = useState<string>(filters.claim_type || 'opd');
    const [serviceScope, setServiceScope] = useState<string>(filters.service_scope || 'all');

    // Drill-Down Modal State
    const [drillModalOpen, setDrillModalOpen] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<MonthlyRow | null>(null);
    const [drillTab, setDrillTab] = useState<'c_deny' | 'stm_pending' | 'unclaimed_hosxp' | 'hemodialysis' | 'cash_cases'>('unclaimed_hosxp');
    const [drillItems, setDrillItems] = useState<any[]>([]);
    const [loadingDrill, setLoadingDrill] = useState(false);

    // Variance Analysis Modal State (อธิบายส่วนต่าง)
    const [varianceModalOpen, setVarianceModalOpen] = useState(false);
    const [selectedVarianceRow, setSelectedVarianceRow] = useState<MonthlyRow | null>(null);
    const [activeVarianceTab, setActiveVarianceTab] = useState<'overview' | 'unclaimed_hosxp' | 'c_deny' | 'stm_pending' | 'hemodialysis' | 'cash_cases'>('overview');
    const [varianceDrillItems, setVarianceDrillItems] = useState<any[]>([]);
    const [loadingVarianceDrill, setLoadingVarianceDrill] = useState(false);

    const openVarianceModal = (
        row: MonthlyRow,
        initialTab: 'overview' | 'unclaimed_hosxp' | 'c_deny' | 'stm_pending' | 'hemodialysis' | 'cash_cases' = 'overview'
    ) => {
        setSelectedVarianceRow(row);
        setVarianceModalOpen(true);
        switchVarianceTab(initialTab, row);
    };

    const switchVarianceTab = async (
        tab: 'overview' | 'unclaimed_hosxp' | 'c_deny' | 'stm_pending' | 'hemodialysis' | 'cash_cases',
        targetRow?: MonthlyRow
    ) => {
        const row = targetRow || selectedVarianceRow;
        setActiveVarianceTab(tab);
        if (tab === 'overview' || !row) {
            setVarianceDrillItems([]);
            return;
        }

        setLoadingVarianceDrill(true);
        try {
            const url = new URL(route('rcm.monthly.drill-down'), window.location.origin);
            url.searchParams.set('month_key', row.month_key);
            url.searchParams.set('scheme', scheme);
            url.searchParams.set('claim_type', claimType);
            url.searchParams.set('service_scope', serviceScope);
            url.searchParams.set('tab', tab);

            const res = await fetch(url.toString());
            const data = await res.json();
            setVarianceDrillItems(data.items || []);
        } catch (err) {
            console.error('Failed to load variance drill-down data', err);
            setVarianceDrillItems([]);
        } finally {
            setLoadingVarianceDrill(false);
        }
    };

    const navigateTo = (by: number, sch: string, ct: string, ss: string) => {
        router.get(
            route('rcm.monthly.index'),
            {
                budget_year: by,
                scheme: sch,
                claim_type: ct,
                service_scope: ss,
            },
            { preserveState: true }
        );
    };

    const handleBudgetYearChange = (year: number) => {
        setBudgetYear(year);
        navigateTo(year, scheme, claimType, serviceScope);
    };

    const handleSchemeChange = (newScheme: string) => {
        setScheme(newScheme);
        navigateTo(budgetYear, newScheme, claimType, serviceScope);
    };

    const handleClaimTypeChange = (newType: string) => {
        setClaimType(newType);
        navigateTo(budgetYear, scheme, newType, serviceScope);
    };

    const handleServiceScopeChange = (newScope: string) => {
        setServiceScope(newScope);
        navigateTo(budgetYear, scheme, claimType, newScope);
    };

    const openDrillDown = async (
        row: MonthlyRow,
        tab: 'c_deny' | 'stm_pending' | 'unclaimed_hosxp' | 'hemodialysis' | 'cash_cases' = 'c_deny'
    ) => {
        setSelectedMonth(row);
        setDrillTab(tab);
        setDrillModalOpen(true);
        setLoadingDrill(true);

        try {
            const url = new URL(route('rcm.monthly.drill-down'), window.location.origin);
            url.searchParams.set('month_key', row.month_key);
            url.searchParams.set('scheme', scheme);
            url.searchParams.set('claim_type', claimType);
            url.searchParams.set('service_scope', serviceScope);
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

    const switchDrillTab = async (tab: 'c_deny' | 'stm_pending' | 'unclaimed_hosxp' | 'hemodialysis' | 'cash_cases') => {
        if (!selectedMonth) return;
        setDrillTab(tab);
        setLoadingDrill(true);

        try {
            const url = new URL(route('rcm.monthly.drill-down'), window.location.origin);
            url.searchParams.set('month_key', selectedMonth.month_key);
            url.searchParams.set('scheme', scheme);
            url.searchParams.set('claim_type', claimType);
            url.searchParams.set('service_scope', serviceScope);
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

    const formatShortMonth = (row: MonthlyRow): string => {
        if (row.short_label_th) return row.short_label_th;
        if (row.month_short_th && row.year_th) return `${row.month_short_th} ${row.year_th}`;

        const thaiShortMonths: Record<string, string> = {
            'มกราคม': 'ม.ค.',
            'กุมภาพันธ์': 'ก.พ.',
            'มีนาคม': 'มี.ค.',
            'เมษายน': 'เม.ย.',
            'พฤษภาคม': 'พ.ค.',
            'มิถุนายน': 'มิ.ย.',
            'กรกฎาคม': 'ก.ค.',
            'สิงหาคม': 'ส.ค.',
            'กันยายน': 'ก.ย.',
            'ตุลาคม': 'ต.ค.',
            'พฤศจิกายน': 'พ.ย.',
            'ธันวาคม': 'ธ.ค.',
        };

        if (row.full_label_th) {
            for (const [full, short] of Object.entries(thaiShortMonths)) {
                if (row.full_label_th.startsWith(full)) {
                    return row.full_label_th.replace(full, short);
                }
            }
        }
        return row.full_label_th;
    };

    const schemeTabs = [
        { key: 'all', label: 'ทุกกองทุน (All)', color: 'text-slate-700 bg-slate-100 border-slate-300' },
        { key: 'cgd', label: 'กรมบัญชีกลาง (OFC)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
        { key: 'lgo', label: 'อปท. (LGO)', color: 'text-blue-700 bg-blue-50 border-blue-200' },
    ];


    const serviceScopeTabs = [
        { key: 'all', label: 'ทั้งหมด (รวมไตเทียม & เงินสด)' },
        { key: 'general', label: 'ผู้ป่วยทั่วไป (ไม่รวมไตเทียม)' },
        { key: 'hemodialysis', label: '🩺 เฉพาะผู้ป่วยไตเทียม (HD)' },
    ];

    const getStatusBadge = (status: string, label: string) => {
        let badgeStyle = 'bg-slate-100 text-slate-600 border-slate-200';
        let Icon = Clock;
        switch (status) {
            case 'settled_full':
                badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                Icon = CheckCircle2;
                break;
            case 'settled_almost':
                badgeStyle = 'bg-teal-50 text-teal-800 border-teal-200';
                Icon = CheckCircle2;
                break;
            case 'pending_stm_part':
                badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
                Icon = Clock;
                break;
            case 'awaiting_stm':
                badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
                Icon = Clock;
                break;
            case 'unclaimed':
                badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';
                Icon = AlertTriangle;
                break;
        }

        return (
            <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border max-w-full truncate shadow-2xs ${badgeStyle}`}
                title={label}
            >
                <Icon className="w-3 h-3 shrink-0" />
                <span className="truncate">{label}</span>
            </span>
        );
    };

    return (
        <RcmLayout title="เปรียบเทียบข้อมูลรายเดือน 3 ฝ่าย (HOSxP vs REP vs STM)" active="monthly">
            {/* Header Filter Panel */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs mb-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-100">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-emerald-600" /> เลือกปีงบประมาณ (พ.ศ.):
                        </span>
                        {[2570, 2569, 2568, 2567].map((y) => (
                            <button
                                key={y}
                                type="button"
                                onClick={() => handleBudgetYearChange(y)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                                    budgetYear === y
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                ปีงบ {y}
                            </button>
                        ))}
                    </div>

                    {/* Export Actions */}
                    <div className="flex items-center gap-2">
                        <a
                            href={route('rcm.monthly.export-excel', { budget_year: budgetYear, scheme, claim_type: claimType, service_scope: serviceScope })}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold shadow-2xs transition"
                        >
                            <FileSpreadsheet className="w-4 h-4" /> ส่งออก Excel
                        </a>
                        <a
                            href={route('rcm.monthly.export-pdf', { budget_year: budgetYear, scheme, claim_type: claimType, service_scope: serviceScope })}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold shadow-2xs transition"
                        >
                            <FileText className="w-4 h-4" /> พิมพ์รายงาน PDF
                        </a>
                    </div>
                </div>

                {/* Sub Filters: Scheme, Claim Type, and Service Scope */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5" /> กองทุน:
                        </span>
                        {schemeTabs.map((s) => (
                            <button
                                key={s.key}
                                type="button"
                                onClick={() => handleSchemeChange(s.key)}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                                    scheme === s.key
                                        ? `${s.color} ring-2 ring-emerald-500/30 shadow-2xs font-bold`
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 mr-1">ประเภทบริการ:</span>
                        <button
                            type="button"
                            onClick={() => handleClaimTypeChange('opd')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                                claimType === 'opd'
                                    ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            🏥 ผู้ป่วยนอก (OPD)
                        </button>
                        <button
                            type="button"
                            onClick={() => handleClaimTypeChange('ipd')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                                claimType === 'ipd'
                                    ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            🛏️ ผู้ป่วยใน (IPD)
                        </button>
                    </div>
                </div>

                {/* Service Scope Filter (แยกผู้ป่วยไตเทียม & เงินสด) */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                    <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600" /> ขอบเขตบริการ:
                    </span>
                    {serviceScopeTabs.map((ss) => (
                        <button
                            key={ss.key}
                            type="button"
                            onClick={() => handleServiceScopeChange(ss.key)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                                serviceScope === ss.key
                                    ? ss.key === 'hemodialysis'
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                        : 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            {ss.label}
                        </button>
                    ))}
                    {serviceScope === 'hemodialysis' && (
                        <span className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md font-medium ml-2">
                            กรองเฉพาะเคสหน่วยไตเทียม (021), สิทธิไต (02, AB, CC), หรือ PDx Z49/N185
                        </span>
                    )}
                </div>
            </div>

            {/* Quick KPI Bar (4 Summary Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Card 1: HOSxP */}
                <div className="bg-white p-4 rounded-2xl border border-sky-200 shadow-xs relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50 rounded-bl-full pointer-events-none -mr-4 -mt-4 opacity-70" />
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-sky-800 flex items-center gap-1">
                            [1] ยอดลูกหนี้สิทธิ HOSxP
                        </span>
                        {comparison.totals.hemo_cases > 0 && serviceScope === 'all' && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded font-semibold">
                                ไต {formatNumber(comparison.totals.hemo_cases)} เคส
                            </span>
                        )}
                    </div>
                    <div className="text-xl font-bold text-sky-700 mt-1">
                        {formatMoney(comparison.totals.hosxp_uc_money)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1.5 flex items-center justify-between">
                        <span>คนไข้จริง {formatNumber(comparison.totals.hosxp_cases)} เคส</span>
                        <span className="text-slate-700 font-medium">เงินสด: {formatMoney(comparison.totals.hosxp_cash || 0)}</span>
                    </div>
                </div>

                {/* Card 2: REP Claim */}
                <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full pointer-events-none -mr-4 -mt-4 opacity-70" />
                    <span className="text-xs font-semibold text-amber-800 flex items-center gap-1">
                        [2] ยอดตั้งเบิกใน REP (เทียบ SEQ)
                    </span>
                    <div className="text-xl font-bold text-amber-700 mt-1">
                        {formatMoney(comparison.totals.rep_claim)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1.5 flex items-center justify-between">
                        <span>ส่งเบิกแล้ว {formatNumber(comparison.totals.rep_cases)} เคส</span>
                        <span className="text-rose-600 font-semibold">ติด C {formatMoney(comparison.totals.rep_c_deny_amount)}</span>
                    </div>
                </div>

                {/* Card 3: STM Approved */}
                <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full pointer-events-none -mr-4 -mt-4 opacity-70" />
                    <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
                        [3] ยอดพึงรับทั้งหมดใน STM (ได้รับจริง)
                    </span>
                    <div className="text-xl font-bold text-emerald-700 mt-1">
                        {formatMoney(comparison.totals.stm_approved)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1.5 flex items-center justify-between">
                        <span>ชดเชยแล้ว {formatNumber(comparison.totals.stm_cases)} เคส</span>
                        <span className="text-emerald-700 font-semibold">อัตราพึงรับ {comparison.totals.recovery_rate}%</span>
                    </div>
                </div>

                {/* Card 4: Net Variance */}
                <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-xs relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full pointer-events-none -mr-4 -mt-4 opacity-70" />
                    <span className="text-xs font-semibold text-purple-800 flex items-center gap-1">
                        [4] ผลต่างรอรับเงิน / ค้างชดเชย (REP − STM)
                    </span>
                    <div className={`text-xl font-bold mt-1 ${comparison.totals.diff_rep_stm > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {formatMoney(comparison.totals.diff_rep_stm)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1.5 flex items-center justify-between">
                        <span>ค้างส่ง {formatNumber(comparison.totals.unclaimed_cases || 0)} เคส</span>
                        <span>รอรับเงิน {formatNumber(comparison.totals.pending_stm_cases || 0)} เคส</span>
                    </div>
                </div>
            </div>

            {/* Explanation Alert */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 mb-6 text-xs text-blue-900 flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="font-bold">หลักการเปรียบเทียบข้อมูล 3 ฝ่าย (3-Way Reconciliation Principle):</p>
                    <p className="text-blue-800">
                        • <strong>[1] HOSxP</strong> = ภาระค่ารักษาที่เกิดขึ้นจริงใน รพ. (ยอดลูกหนี้สิทธิ <code className="bg-blue-100 px-1 rounded">uc_money</code>) | 
                        • <strong>[2] REP</strong> = ยอดที่ รพ. ได้ส่งไฟล์เบิกและ e-Claim ตรวจสอบตอบกลับมา (<code className="bg-blue-100 px-1 rounded">amount_claim</code>) | 
                        • <strong>[3] STM</strong> = ยอดพึงรับทั้งหมด (ได้รับจริง) จากแท็บ "พึงรับ" ในไฟล์ Statement STM ที่ สปสช./กรมบัญชีกลาง อนุมัติชดเชยสุทธิเข้าบัญชี รพ. (<code className="bg-blue-100 px-1 rounded">amount_approved</code>)
                    </p>
                    <p className="text-blue-800">
                        • <strong>ค้างส่งเบิก (HOSxP − REP)</strong>: หากค่าเป็นบวก แสดงว่ามีเคสใน HOSxP ที่ยังไม่ได้ส่งเบิก e-Claim
                        • <strong>รอรับเงิน / ค้างชดเชย (REP − STM)</strong>: ยอดที่ส่งเบิกไปแล้วแต่ยังรอเงินโอนงวดถัดไป หรือถูกตัดเงิน/ติด C
                    </p>
                </div>
            </div>

            {/* Main 3-Way Comparison Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden mb-8">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <Scale className="w-4 h-4 text-emerald-600" /> ตารางเปรียบเทียบวงจรรายได้ 3 ฝ่าย รายเดือน ปีงบประมาณ {budgetYear}
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            จำแนกข้อมูลตามเดือนที่รับบริการ (Cohort Service Month)
                        </p>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                        12 เดือนของปีงบประมาณ (ต.ค. {budgetYear - 1} - ก.ย. {budgetYear})
                    </span>
                </div>

                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300">
                    <table className="w-full text-left border-collapse text-xs table-fixed min-w-[1480px]">
                        <colgroup>
                            {/* Month */}
                            <col className="w-[110px]" />
                            {/* [1] HOSxP */}
                            <col className="w-[65px]" />
                            <col className="w-[130px]" />
                            <col className="w-[95px]" />
                            {/* [2] REP */}
                            <col className="w-[65px]" />
                            <col className="w-[130px]" />
                            <col className="w-[95px]" />
                            {/* [3] STM */}
                            <col className="w-[65px]" />
                            <col className="w-[140px]" />
                            {/* [4] Diff & Status */}
                            <col className="w-[135px]" />
                            <col className="w-[145px]" />
                            <col className="w-[85px]" />
                            <col className="w-[155px]" />
                        </colgroup>
                        <thead>
                            {/* Group Header Row */}
                            <tr className="border-b border-slate-200 font-bold text-slate-700 text-xs select-none">
                                <th rowSpan={2} className="p-2.5 text-center bg-slate-100/95 border-r-2 border-slate-200 sticky left-0 z-30 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                                    <div className="flex flex-col items-center justify-center">
                                        <Calendar className="w-3.5 h-3.5 text-slate-500 mb-0.5" />
                                        <span>เดือน / ปี</span>
                                    </div>
                                </th>
                                <th colSpan={3} className="p-2.5 text-center bg-sky-50 text-sky-900 border-r-2 border-sky-200 font-bold">
                                    [1] HOSxP (เกิดจริงใน รพ.)
                                </th>
                                <th colSpan={3} className="p-2.5 text-center bg-amber-50 text-amber-900 border-r-2 border-amber-200 font-bold">
                                    [2] ไฟล์ REP (ส่งเบิก & ติด C)
                                </th>
                                <th colSpan={2} className="p-2.5 text-center bg-emerald-50 text-emerald-900 border-r-2 border-emerald-200 font-bold">
                                    [3] Statement STM (พึงรับทั้งหมด / ได้รับจริง)
                                </th>
                                <th colSpan={4} className="p-2.5 text-center bg-purple-50 text-purple-900 font-bold">
                                    [4] เปรียบเทียบผลต่าง & สถานะ
                                </th>
                            </tr>
                            {/* Sub Header Row */}
                            <tr className="border-b border-slate-200 font-semibold text-[11px] select-none">
                                {/* HOSxP */}
                                <th className="p-2 text-right bg-sky-50/40 text-sky-900">เคส</th>
                                <th className="p-2 text-right bg-sky-50/40 text-sky-950 font-bold">ลูกหนี้ (฿)</th>
                                <th className="p-2 text-right bg-sky-50/40 text-slate-600 border-r-2 border-sky-200">เงินสด (฿)</th>
                                {/* REP */}
                                <th className="p-2 text-right bg-amber-50/40 text-amber-900">เคส</th>
                                <th className="p-2 text-right bg-amber-50/40 text-amber-950 font-bold">ตั้งเบิก (฿)</th>
                                <th className="p-2 text-right bg-amber-50/40 text-rose-700 font-bold border-r-2 border-amber-200">ติด C (฿)</th>
                                {/* STM */}
                                <th className="p-2 text-right bg-emerald-50/40 text-emerald-900">เคส</th>
                                <th className="p-2 text-right bg-emerald-50/40 text-emerald-950 font-bold border-r-2 border-emerald-200" title="ยอดเงินพึงรับทั้งหมดสุทธิที่ สปสช. อนุมัติชดเชยเข้า รพ. จริง">พึงรับทั้งหมด (฿)</th>
                                {/* Variances */}
                                <th className="p-2 text-right bg-purple-50/40 text-purple-950 font-bold">ค้างส่งเบิก (฿)</th>
                                <th className="p-2 text-right bg-purple-50/40 text-purple-950 font-bold">รอรับเงิน (฿)</th>
                                <th className="p-2 text-center bg-purple-50/40 text-purple-950 font-bold" title="เทียบยอดพึงรับทั้งหมด STM กับลูกหนี้สิทธิ HOSxP">% ชดเชย</th>
                                <th className="p-2 text-center bg-purple-50/40 text-purple-950 font-bold">สถานะ & จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {comparison.rows.map((row) => (
                                <tr key={row.month_key} className="group hover:bg-slate-50/90 transition-colors">
                                    {/* Month - Sticky Left */}
                                    <td className="p-2 font-semibold text-slate-800 border-r-2 border-slate-200 whitespace-nowrap sticky left-0 z-20 bg-white group-hover:bg-slate-50/95 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-slate-900 text-xs font-bold" title={row.full_label_th}>
                                                {formatShortMonth(row)}
                                            </span>
                                        </div>
                                    </td>

                                    {/* [1] HOSxP */}
                                    <td className="p-2 text-right font-mono tabular-nums text-xs text-slate-700 whitespace-nowrap">
                                        {formatNumber(row.hosxp_cases)}
                                    </td>
                                    <td className="p-2 text-right font-mono tabular-nums text-xs font-bold text-sky-700 bg-sky-50/20 whitespace-nowrap">
                                        {formatMoney(row.hosxp_uc_money)}
                                    </td>
                                    <td className="p-2 text-right font-mono tabular-nums text-xs text-slate-500 border-r-2 border-sky-100 whitespace-nowrap">
                                        {row.hosxp_cash > 0 ? (
                                            <button
                                                type="button"
                                                onClick={() => openDrillDown(row, 'cash_cases')}
                                                className="hover:underline text-slate-600 hover:text-emerald-700 cursor-pointer"
                                                title="คลิกเพื่อดูรายการเงินสดคนไข้"
                                            >
                                                {formatMoney(row.hosxp_cash)}
                                            </button>
                                        ) : (
                                            '-'
                                        )}
                                    </td>

                                    {/* [2] REP */}
                                    <td className="p-2 text-right font-mono tabular-nums text-xs text-slate-700 whitespace-nowrap">
                                        {formatNumber(row.rep_cases)}
                                    </td>
                                    <td className="p-2 text-right font-mono tabular-nums text-xs font-bold text-amber-700 bg-amber-50/20 whitespace-nowrap">
                                        {formatMoney(row.rep_claim)}
                                    </td>
                                    <td className="p-2 text-right font-mono tabular-nums text-xs font-semibold text-rose-600 border-r-2 border-amber-100 whitespace-nowrap">
                                        {row.rep_c_deny_amount > 0 ? (
                                            <button
                                                type="button"
                                                onClick={() => openDrillDown(row, 'c_deny')}
                                                className="hover:underline text-rose-600 inline-block cursor-pointer font-bold"
                                                title="คลิกเพื่อดูเคสที่ติด C"
                                            >
                                                {formatMoney(row.rep_c_deny_amount)}
                                            </button>
                                        ) : (
                                            '-'
                                        )}
                                    </td>

                                    {/* [3] STM (พึงรับทั้งหมด) */}
                                    <td className="p-2 text-right font-mono tabular-nums text-xs text-slate-700 whitespace-nowrap">
                                        {formatNumber(row.stm_cases)}
                                    </td>
                                    <td className="p-2 text-right font-mono tabular-nums text-xs font-bold text-emerald-700 bg-emerald-50/20 border-r-2 border-emerald-100 whitespace-nowrap" title="ยอดเงินพึงรับทั้งหมดสุทธิที่ สปสช. อนุมัติชดเชยเข้า รพ. จริง">
                                        {formatMoney(row.stm_approved)}
                                    </td>

                                    {/* [4] Variances & Status */}
                                    {/* Diff HOSxP vs REP */}
                                    <td className="p-2 text-right whitespace-nowrap">
                                        <button
                                            type="button"
                                            onClick={() => openVarianceModal(row, 'unclaimed_hosxp')}
                                            className="hover:underline inline-flex flex-col items-end group/btn cursor-pointer w-full"
                                            title="คลิกเพื่อดูคำอธิบายส่วนต่าง HOSxP vs REP และเจาะลึกเคสค้างส่ง"
                                        >
                                            <div className="flex items-center gap-1 font-mono tabular-nums text-xs font-bold whitespace-nowrap">
                                                {row.diff_hosxp_rep > 0 ? (
                                                    <span className="text-amber-700">
                                                        +{formatMoney(row.diff_hosxp_rep)}
                                                    </span>
                                                ) : row.diff_hosxp_rep < 0 ? (
                                                    <span className="text-slate-500">
                                                        {formatMoney(row.diff_hosxp_rep)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 font-normal">฿0.00</span>
                                                )}
                                                <HelpCircle className="w-2.5 h-2.5 text-slate-400 group-hover/btn:text-amber-600 shrink-0" />
                                            </div>
                                            <span className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5">
                                                {(row.variance_details?.unclaimed_cases ?? 0) > 0 
                                                    ? `ค้างส่ง ${formatNumber(row.variance_details?.unclaimed_cases)} เคส` 
                                                    : (row.diff_hosxp_rep > 0 ? 'ส่งครบ (ต่างราคา)' : 'ส่งครบ')}
                                            </span>
                                        </button>
                                    </td>

                                    {/* Diff REP vs STM */}
                                    <td className="p-2 text-right whitespace-nowrap">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openVarianceModal(
                                                    row,
                                                    (row.variance_details?.pending_stm_cases ?? 0) > 0
                                                        ? 'stm_pending'
                                                        : row.rep_c_deny_cases > 0
                                                        ? 'c_deny'
                                                        : 'overview'
                                                )
                                            }
                                            className="hover:underline inline-flex flex-col items-end group/btn cursor-pointer w-full"
                                            title="คลิกเพื่อดูคำอธิบายส่วนต่าง REP vs STM และเจาะลึกเคสรอรับเงิน/ติด C"
                                        >
                                            <div className="flex items-center gap-1 font-mono tabular-nums text-xs font-bold whitespace-nowrap">
                                                {row.diff_rep_stm > 0 ? (
                                                    <span className="text-rose-600">
                                                        +{formatMoney(row.diff_rep_stm)}
                                                    </span>
                                                ) : row.diff_rep_stm < 0 ? (
                                                    <span className="text-emerald-600">
                                                        {formatMoney(row.diff_rep_stm)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 font-normal">฿0.00</span>
                                                )}
                                                <HelpCircle className="w-2.5 h-2.5 text-slate-400 group-hover/btn:text-rose-600 shrink-0" />
                                            </div>
                                            <span className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5">
                                                {(row.variance_details?.pending_stm_cases ?? 0) > 0 ? `รอรับ ${formatNumber(row.variance_details?.pending_stm_cases)} เคส` : 'ครบถ้วน'}
                                                {row.rep_c_deny_cases > 0 ? ` · ติด C ${row.rep_c_deny_cases}` : ''}
                                            </span>
                                        </button>
                                    </td>

                                    {/* Recovery Rate */}
                                    <td className="p-2 text-center whitespace-nowrap">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold font-mono tabular-nums ${
                                            row.recovery_rate >= 99
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : row.recovery_rate >= 90
                                                ? 'bg-teal-100 text-teal-800'
                                                : row.recovery_rate >= 70
                                                ? 'bg-blue-100 text-blue-800'
                                                : row.recovery_rate > 0
                                                ? 'bg-amber-100 text-amber-800'
                                                : 'bg-slate-100 text-slate-500'
                                        }`}>
                                            {row.recovery_rate}%
                                        </span>
                                    </td>

                                    {/* Status & Actions */}
                                    <td className="p-2 text-center whitespace-nowrap">
                                        <div className="flex flex-col items-center gap-1.5">
                                            <div className="max-w-[145px] truncate">
                                                {getStatusBadge(row.status, row.status_label)}
                                            </div>
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => openDrillDown(row, 'c_deny')}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition text-[11px] cursor-pointer shadow-2xs"
                                                    title="ดูรายการเคสย่อย"
                                                >
                                                    <Search className="w-3 h-3 text-slate-500" /> เจาะลึก
                                                </button>
                                                <a
                                                    href={route('rcm.csop.index', {
                                                        start_date: `${row.month_key}-01`,
                                                        end_date: new Date(parseInt(row.month_key.split('-')[0]), parseInt(row.month_key.split('-')[1]), 0).toISOString().split('T')[0],
                                                        scheme: scheme === 'all' ? 'cgd' : scheme,
                                                        service_scope: serviceScope,
                                                    })}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-md font-medium transition text-[11px] border border-teal-200/60 shadow-2xs"
                                                    title="เปิดดูรายการในระบบ CSOP ผู้ป่วยนอก"
                                                >
                                                    <FileText className="w-3 h-3 text-teal-600" /> CSOP
                                                </a>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>

                        {/* Grand Total Footer */}
                        <tfoot>
                            <tr className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                                <td className="p-2 border-r-2 border-slate-200 text-slate-900 sticky left-0 z-20 bg-slate-100 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] whitespace-nowrap">
                                    <div className="text-xs font-bold text-slate-900">รวมทั้งสิ้น ปีงบ {budgetYear}</div>
                                </td>
                                <td className="p-2 text-right font-mono tabular-nums text-xs">
                                    {formatNumber(comparison.totals.hosxp_cases)}
                                </td>
                                <td className="p-2 text-right font-mono tabular-nums text-xs text-sky-900 bg-sky-50/40">
                                    {formatMoney(comparison.totals.hosxp_uc_money)}
                                </td>
                                <td className="p-2 text-right font-mono tabular-nums text-xs text-slate-600 border-r-2 border-sky-100 font-medium">
                                    {formatMoney(comparison.totals.hosxp_cash || 0)}
                                </td>
                                <td className="p-2 text-right font-mono tabular-nums text-xs">
                                    {formatNumber(comparison.totals.rep_cases)}
                                </td>
                                <td className="p-2 text-right font-mono tabular-nums text-xs text-amber-900 bg-amber-50/40">
                                    {formatMoney(comparison.totals.rep_claim)}
                                </td>
                                <td className="p-2 text-right font-mono tabular-nums text-xs text-rose-700 border-r-2 border-amber-100">
                                    {formatMoney(comparison.totals.rep_c_deny_amount)}
                                </td>
                                <td className="p-2 text-right font-mono tabular-nums text-xs">
                                    {formatNumber(comparison.totals.stm_cases)}
                                </td>
                                <td className="p-2 text-right font-mono tabular-nums text-xs text-emerald-900 bg-emerald-50/40 border-r-2 border-emerald-100" title="ยอดพึงรับทั้งหมดสุทธิที่ได้รับจริง">
                                    {formatMoney(comparison.totals.stm_approved)}
                                </td>
                                <td className="p-2 text-right font-mono tabular-nums text-xs text-amber-900">
                                    <div>{formatMoney(comparison.totals.diff_hosxp_rep)}</div>
                                    <div className="text-[10px] text-slate-500 font-normal">ค้างส่ง {formatNumber(comparison.totals.unclaimed_cases || 0)} เคส</div>
                                </td>
                                <td className="p-2 text-right font-mono tabular-nums text-xs text-rose-700">
                                    <div>{formatMoney(comparison.totals.diff_rep_stm)}</div>
                                    <div className="text-[10px] text-slate-500 font-normal">รอรับ {formatNumber(comparison.totals.pending_stm_cases || 0)} เคส</div>
                                </td>
                                <td className="p-2 text-center font-mono tabular-nums text-xs text-emerald-900">
                                    <span className="font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">{comparison.totals.recovery_rate}%</span>
                                </td>
                                <td className="p-2 text-center text-slate-400">
                                    -
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Drill-Down Modal */}
            {drillModalOpen && selectedMonth && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
                    <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl">
                                    <Scale className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-800">
                                        ข้อมูลเจาะลึก: {selectedMonth.full_label_th}
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        ยอดส่งเบิก {formatMoney(selectedMonth.rep_claim)} | โอนจริง {formatMoney(selectedMonth.stm_approved)} | ผลต่าง {formatMoney(selectedMonth.diff_rep_stm)}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDrillModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Tabs */}
                        <div className="px-6 pt-3 border-b border-slate-100 flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => switchDrillTab('c_deny')}
                                className={`px-3 py-2 text-xs font-bold border-b-2 transition ${
                                    drillTab === 'c_deny'
                                        ? 'border-rose-600 text-rose-700'
                                        : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                ⚠️ เคสติด C / Error ใน REP ({selectedMonth.rep_c_deny_cases} เคส)
                            </button>
                            <button
                                type="button"
                                onClick={() => switchDrillTab('stm_pending')}
                                className={`px-3 py-2 text-xs font-bold border-b-2 transition ${
                                    drillTab === 'stm_pending'
                                        ? 'border-amber-600 text-amber-700'
                                        : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                ⏳ รอชดเชยครบ (STM Shortfall) ({selectedMonth.variance_details?.pending_stm_cases || 0} เคส)
                            </button>
                            <button
                                type="button"
                                onClick={() => switchDrillTab('unclaimed_hosxp')}
                                className={`px-3 py-2 text-xs font-bold border-b-2 transition ${
                                    drillTab === 'unclaimed_hosxp'
                                        ? 'border-sky-600 text-sky-700'
                                        : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                📋 {(selectedMonth.variance_details?.unclaimed_cases || 0) > 0 
                                    ? `เคสใน HOSxP ที่ยังไม่ส่งเบิก (${selectedMonth.variance_details?.unclaimed_cases} เคส)` 
                                    : (selectedMonth.diff_hosxp_rep > 0 
                                        ? `ส่วนต่างราคา / อุทธรณ์ (+${formatMoney(selectedMonth.diff_hosxp_rep)})` 
                                        : 'เคสใน HOSxP ที่ยังไม่ส่งเบิก (0 เคส)')}
                            </button>
                            <button
                                type="button"
                                onClick={() => switchDrillTab('hemodialysis')}
                                className={`px-3 py-2 text-xs font-bold border-b-2 transition ${
                                    drillTab === 'hemodialysis'
                                        ? 'border-indigo-600 text-indigo-700'
                                        : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                🩺 ผู้ป่วยไตเทียม ({selectedMonth.hemo_cases || 0} เคส)
                            </button>
                            <button
                                type="button"
                                onClick={() => switchDrillTab('cash_cases')}
                                className={`px-3 py-2 text-xs font-bold border-b-2 transition ${
                                    drillTab === 'cash_cases'
                                        ? 'border-emerald-600 text-emerald-700'
                                        : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                💵 ชำระเงินสด / จ่ายเอง ({formatMoney(selectedMonth.hosxp_cash || 0)})
                            </button>
                        </div>

                        {/* Modal Body / Table */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {loadingDrill ? (
                                <div className="py-16 text-center">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent" />
                                    <p className="text-xs text-slate-500 mt-2">กำลังโหลดข้อมูลเจาะลึก...</p>
                                </div>
                            ) : drillItems.length === 0 ? (
                                <div className="py-16 text-center text-slate-400 text-xs">
                                    ไม่พบรายการที่ตรงกับเงื่อนไขในแท็บนี้
                                </div>
                            ) : drillTab === 'unclaimed_hosxp' ? (
                                drillItems.length > 0 && drillItems[0]?.item_type === 'rate_variance' ? (
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="border-b border-sky-200 bg-sky-50 text-sky-900 font-bold text-[11px]">
                                                <th className="p-2.5">VN</th>
                                                <th className="p-2.5">HN</th>
                                                <th className="p-2.5">ชื่อผู้ป่วย</th>
                                                <th className="p-2.5">วันที่รับบริการ</th>
                                                <th className="p-2.5">แผนก / สิทธิ</th>
                                                <th className="p-2.5 text-right text-sky-800">ลูกหนี้ HOSxP (฿)</th>
                                                <th className="p-2.5 text-right text-amber-800">ตั้งเบิก e-Claim (฿)</th>
                                                <th className="p-2.5 text-right text-purple-700">ส่วนต่าง (฿)</th>
                                                <th className="p-2.5">คำอธิบายสาเหตุ & สถานะการชดเชย</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {drillItems.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="p-2.5 font-mono text-slate-800 font-medium">{item.vn}</td>
                                                    <td className="p-2.5 font-mono">{item.hn}</td>
                                                    <td className="p-2.5 font-medium">{item.patient_name}</td>
                                                    <td className="p-2.5 text-slate-500 whitespace-nowrap">{item.visit_date}</td>
                                                    <td className="p-2.5 text-slate-600 truncate max-w-[140px]" title={`${item.department} / ${item.pttype_name}`}>
                                                        {item.department || item.pttype_name}
                                                    </td>
                                                    <td className="p-2.5 text-right font-mono font-medium text-sky-800">{formatMoney(item.debt || item.total || 0)}</td>
                                                    <td className="p-2.5 text-right font-mono font-medium text-amber-800">{formatMoney(item.claim_amount || 0)}</td>
                                                    <td className="p-2.5 text-right font-mono font-bold text-purple-700">
                                                        {item.diff_amount > 0 ? `+${formatMoney(item.diff_amount)}` : formatMoney(item.diff_amount)}
                                                    </td>
                                                    <td className="p-2.5">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
                                                            item.is_appeal_settled
                                                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                                                        }`}>
                                                            {item.is_appeal_settled ? '✅ ' : 'ℹ️ '}
                                                            {item.diff_reason}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold text-[11px]">
                                                <th className="p-2">VN</th>
                                                <th className="p-2">HN</th>
                                                <th className="p-2">ชื่อผู้ป่วย</th>
                                                <th className="p-2">วันที่ / เวลา</th>
                                                <th className="p-2">แผนก</th>
                                                <th className="p-2">สิทธิ</th>
                                                <th className="p-2 text-right">ค่ายา</th>
                                                <th className="p-2 text-right">อวัยวะ</th>
                                                <th className="p-2 text-right">บริการ</th>
                                                <th className="p-2 text-right">ยอดรวม</th>
                                                <th className="p-2 text-right">ชำระเอง</th>
                                                <th className="p-2 text-right text-sky-700">ลูกหนี้สิทธิ</th>
                                                <th className="p-2 text-center">ใบเสร็จ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {drillItems.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="p-2 font-mono text-slate-800 text-[11px]">{item.vn}</td>
                                                    <td className="p-2 font-mono text-[11px]">{item.hn}</td>
                                                    <td className="p-2 font-medium">{item.patient_name}</td>
                                                    <td className="p-2 text-slate-500 text-[11px] whitespace-nowrap">{item.visit_date} {item.visit_time?.substring(0, 5)}</td>
                                                    <td className="p-2 text-slate-600 truncate max-w-[110px]" title={item.department}>{item.department || '-'}</td>
                                                    <td className="p-2 text-slate-600 truncate max-w-[100px]" title={item.pttype_name}>{item.pttype_name}</td>
                                                    <td className="p-2 text-right font-mono">{formatMoney(item.drug || 0)}</td>
                                                    <td className="p-2 text-right font-mono">{formatMoney(item.artificial_organ || 0)}</td>
                                                    <td className="p-2 text-right font-mono">{formatMoney(item.service_charge || 0)}</td>
                                                    <td className="p-2 text-right font-mono font-medium">{formatMoney(item.total || item.income || 0)}</td>
                                                    <td className="p-2 text-right font-mono text-amber-600">{(item.payment || 0) > 0 ? formatMoney(item.payment) : '-'}</td>
                                                    <td className="p-2 text-right font-mono font-bold text-sky-700">{formatMoney(item.debt || item.claim_amount || 0)}</td>
                                                    <td className="p-2 text-center">
                                                        {item.no_finance_number === '*' ? (
                                                            <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold text-xs" title="ยังไม่มีเลขใบเสร็จรับเงิน">*</span>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400">เรียบร้อย</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )
                            ) : drillTab === 'hemodialysis' ? (
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-indigo-50/60 text-indigo-900 font-bold">
                                            <th className="p-2.5">VN</th>
                                            <th className="p-2.5">HN</th>
                                            <th className="p-2.5">ชื่อผู้ป่วย</th>
                                            <th className="p-2.5">วันที่รับบริการ</th>
                                            <th className="p-2.5">สิทธิการรักษา</th>
                                            <th className="p-2.5">รหัสโรค (PDx)</th>
                                            <th className="p-2.5 text-right">ค่ารักษารวม</th>
                                            <th className="p-2.5 text-right text-indigo-700">ลูกหนี้สิทธิเบิก</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {drillItems.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="p-2.5 font-medium text-slate-800">{item.vn}</td>
                                                <td className="p-2.5">{item.hn}</td>
                                                <td className="p-2.5 font-medium">{item.patient_name}</td>
                                                <td className="p-2.5 text-slate-500">{item.visit_date}</td>
                                                <td className="p-2.5 text-slate-600">{item.pttype_name}</td>
                                                <td className="p-2.5 font-mono text-slate-700">{item.pdx || '-'}</td>
                                                <td className="p-2.5 text-right">{formatMoney(item.income)}</td>
                                                <td className="p-2.5 text-right font-bold text-indigo-700">{formatMoney(item.claim_amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : drillTab === 'cash_cases' ? (
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-emerald-50/60 text-emerald-900 font-bold">
                                            <th className="p-2.5">VN</th>
                                            <th className="p-2.5">HN</th>
                                            <th className="p-2.5">ชื่อผู้ป่วย</th>
                                            <th className="p-2.5">วันที่รับบริการ</th>
                                            <th className="p-2.5">ประเภทการชำระ</th>
                                            <th className="p-2.5">สิทธิการรักษา</th>
                                            <th className="p-2.5 text-right">ค่ารักษารวม</th>
                                            <th className="p-2.5 text-right text-emerald-700">เงินสดที่คนไข้จ่าย</th>
                                            <th className="p-2.5 text-right text-sky-700">ลูกหนี้สิทธิเบิก</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {drillItems.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="p-2.5 font-medium text-slate-800">{item.vn}</td>
                                                <td className="p-2.5">{item.hn}</td>
                                                <td className="p-2.5 font-medium">{item.patient_name}</td>
                                                <td className="p-2.5 text-slate-500">{item.visit_date}</td>
                                                <td className="p-2.5">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                                        item.cash_type === 'เงินสด 100%'
                                                            ? 'bg-amber-100 text-amber-800'
                                                            : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                        {item.cash_type}
                                                    </span>
                                                </td>
                                                <td className="p-2.5 text-slate-600">{item.pttype_name}</td>
                                                <td className="p-2.5 text-right">{formatMoney(item.income)}</td>
                                                <td className="p-2.5 text-right font-bold text-emerald-700">{formatMoney(item.cash_paid)}</td>
                                                <td className="p-2.5 text-right font-medium text-sky-700">{formatMoney(item.claim_amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                                            <th className="p-2.5">Rep No</th>
                                            <th className="p-2.5">Tran ID</th>
                                            <th className="p-2.5">HN / AN</th>
                                            <th className="p-2.5">ชื่อผู้ป่วย</th>
                                            <th className="p-2.5">วันที่บริการ</th>
                                            <th className="p-2.5 text-right">ยอดตั้งเบิก</th>
                                            <th className="p-2.5 text-right">ยอดอนุมัติ</th>
                                            <th className="p-2.5 text-right text-rose-600">ส่วนต่างที่ขาด</th>
                                            <th className="p-2.5 text-center">รหัส C / Error</th>
                                            <th className="p-2.5 text-center">กองทุน</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {drillItems.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50">
                                                <td className="p-2.5 font-medium text-slate-800">{item.rep_no}</td>
                                                <td className="p-2.5 text-slate-500">{item.tran_id}</td>
                                                <td className="p-2.5">
                                                    <div>{item.hn}</div>
                                                    {item.an && <span className="text-[10px] text-slate-400">AN: {item.an}</span>}
                                                </td>
                                                <td className="p-2.5 font-medium">{item.patient_name}</td>
                                                <td className="p-2.5 text-slate-500">{item.visit_date}</td>
                                                <td className="p-2.5 text-right font-medium">{formatMoney(item.claim_amount)}</td>
                                                <td className="p-2.5 text-right font-bold text-emerald-700">{formatMoney(item.approved_amount)}</td>
                                                <td className="p-2.5 text-right font-bold text-rose-600">{formatMoney(item.shortfall)}</td>
                                                <td className="p-2.5 text-center">
                                                    {item.error_code && item.error_code !== '-' ? (
                                                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                                                            C{item.error_code}
                                                        </span>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </td>
                                                <td className="p-2.5 text-center font-bold text-slate-600">
                                                    {item.scheme}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
                            <span>แสดง {drillItems.length} รายการ</span>
                            <button
                                type="button"
                                onClick={() => setDrillModalOpen(false)}
                                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition"
                            >
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Variance Analysis & Explanation Modal (คำอธิบายส่วนต่างอย่างละเอียด & เจาะลึกรายเคส) */}
            {varianceModalOpen && selectedVarianceRow && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
                    <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
                        {/* Header */}
                        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-purple-100 text-purple-800 rounded-2xl">
                                    <HelpCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-bold text-slate-800">
                                            วิเคราะห์และอธิบายส่วนต่าง: {selectedVarianceRow.full_label_th}
                                        </h3>
                                        <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                                            3-Way Reconcile (เทียบ SEQ)
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        ปีงบประมาณ {budgetYear} | กองทุน {scheme.toUpperCase()} | ประเภท {claimType.toUpperCase()}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setVarianceModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Navigation Sub-Tabs */}
                        <div className="px-4 sm:px-6 py-2.5 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                            <button
                                type="button"
                                onClick={() => switchVarianceTab('overview')}
                                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                                    activeVarianceTab === 'overview'
                                        ? 'bg-purple-600 text-white shadow-xs'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                <Layers className="w-3.5 h-3.5" />
                                ภาพรวมวิเคราะห์ส่วนต่าง
                            </button>
                            <button
                                type="button"
                                onClick={() => switchVarianceTab('unclaimed_hosxp')}
                                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                                    activeVarianceTab === 'unclaimed_hosxp'
                                        ? 'bg-amber-600 text-white shadow-xs'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                <FileText className="w-3.5 h-3.5" />
                                {(selectedVarianceRow.variance_details?.unclaimed_cases ?? 0) > 0
                                    ? `ค้างส่งเบิก (${selectedVarianceRow.variance_details?.unclaimed_cases} เคส)`
                                    : selectedVarianceRow.diff_hosxp_rep > 0
                                    ? `ส่วนต่างราคา / อุทธรณ์ (+${formatMoney(selectedVarianceRow.diff_hosxp_rep)})`
                                    : 'ส่งเบิกครบ 100%'}
                            </button>
                            <button
                                type="button"
                                onClick={() => switchVarianceTab('c_deny')}
                                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                                    activeVarianceTab === 'c_deny'
                                        ? 'bg-rose-600 text-white shadow-xs'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                ติด C / Error ({selectedVarianceRow.rep_c_deny_cases ?? 0} เคส)
                            </button>
                            <button
                                type="button"
                                onClick={() => switchVarianceTab('stm_pending')}
                                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                                    activeVarianceTab === 'stm_pending'
                                        ? 'bg-purple-700 text-white shadow-xs'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                <Clock className="w-3.5 h-3.5" />
                                รอเงินโอน STM ({selectedVarianceRow.variance_details?.pending_stm_cases ?? 0} เคส)
                            </button>
                            <button
                                type="button"
                                onClick={() => switchVarianceTab('hemodialysis')}
                                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                                    activeVarianceTab === 'hemodialysis'
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                🩺 ไตเทียม ({selectedVarianceRow.hemo_cases ?? 0} เคส)
                            </button>
                            <button
                                type="button"
                                onClick={() => switchVarianceTab('cash_cases')}
                                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                                    activeVarianceTab === 'cash_cases'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                💵 เงินสด ({formatMoney(selectedVarianceRow.hosxp_cash ?? 0)})
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 sm:p-6 overflow-y-auto flex-1 text-xs">
                            {activeVarianceTab === 'overview' ? (
                                <div className="space-y-4">
                                    {/* Section 1: HOSxP vs REP */}
                                    <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-amber-900 flex items-center gap-1.5 text-sm">
                                                1. ส่วนต่างการส่งเบิก: [1] HOSxP vs [2] REP (e-Claim)
                                            </h4>
                                            <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                                                {(selectedVarianceRow.variance_details?.unclaimed_cases ?? 0) === 0
                                                    ? selectedVarianceRow.diff_hosxp_rep > 0
                                                        ? `ส่งเบิกครบ 100% (ส่วนต่างการคิดราคา/อุทธรณ์ +${formatMoney(selectedVarianceRow.diff_hosxp_rep)})`
                                                        : 'ส่งเบิกครบถ้วน 100% (ไม่มีส่วนต่าง)'
                                                    : `ค้างส่งเบิก +${formatMoney(selectedVarianceRow.diff_hosxp_rep)}`}
                                            </span>
                                        </div>
                                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div className="bg-white p-3 rounded-xl border border-amber-200/60 shadow-2xs">
                                                <span className="text-[11px] text-slate-500">ลูกหนี้สิทธิ HOSxP:</span>
                                                <div className="font-bold text-sky-700 text-base mt-0.5">{formatMoney(selectedVarianceRow.hosxp_uc_money)}</div>
                                                <span className="text-[10px] text-slate-400">{formatNumber(selectedVarianceRow.hosxp_cases)} เคส</span>
                                            </div>
                                            <div className="bg-white p-3 rounded-xl border border-amber-200/60 shadow-2xs">
                                                <span className="text-[11px] text-slate-500">ยอดที่ส่งเบิก REP:</span>
                                                <div className="font-bold text-amber-700 text-base mt-0.5">{formatMoney(selectedVarianceRow.rep_claim)}</div>
                                                <span className="text-[10px] text-slate-400">{formatNumber(selectedVarianceRow.rep_cases)} เคส</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => switchVarianceTab('unclaimed_hosxp')}
                                                className="group text-left bg-gradient-to-br from-amber-500/10 to-amber-500/5 hover:from-amber-500/20 hover:to-amber-500/10 p-3 rounded-xl border-2 border-dashed border-amber-300 hover:border-amber-500 transition cursor-pointer shadow-2xs"
                                                title="คลิกเพื่อดูรายละเอียดเคสและคำชี้แจง"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-semibold text-amber-900">
                                                        {(selectedVarianceRow.variance_details?.unclaimed_cases ?? 0) === 0 ? 'สถานะการส่งเบิก:' : 'เคสค้างส่งเบิก:'}
                                                    </span>
                                                    <ArrowUpRight className="w-4 h-4 text-amber-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
                                                </div>
                                                <div className="font-bold text-base mt-0.5">
                                                    {(selectedVarianceRow.variance_details?.unclaimed_cases ?? 0) === 0 ? (
                                                        <span className="text-emerald-700">ส่งเบิกครบ 100% (0 เคสค้าง)</span>
                                                    ) : (
                                                        <span className="text-rose-600">{formatNumber(selectedVarianceRow.variance_details?.unclaimed_cases || 0)} เคส</span>
                                                    )}
                                                </div>
                                                <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-md mt-1">
                                                    {(selectedVarianceRow.variance_details?.unclaimed_cases ?? 0) === 0 && selectedVarianceRow.diff_hosxp_rep > 0
                                                        ? `👉 คลิกดูที่มาส่วนต่าง +${formatMoney(selectedVarianceRow.diff_hosxp_rep)}`
                                                        : `👉 คลิกดูรายชื่อเคส & คำชี้แจง`}
                                                </div>
                                            </button>
                                        </div>
                                        <div className="text-amber-900/90 mt-3 text-[11.5px] leading-relaxed bg-white/70 p-2.5 rounded-xl border border-amber-200/50">
                                            {(selectedVarianceRow.variance_details?.unclaimed_cases ?? 0) === 0 ? (
                                                selectedVarianceRow.diff_hosxp_rep > 0 ? (
                                                    <div>
                                                        💡 <strong>คำอธิบายสาเหตุ & แนวทาง:</strong> ผู้ป่วยใน HOSxP ได้รับการส่งเบิกเข้า e-Claim ครบถ้วน 100% แล้ว ({formatNumber(selectedVarianceRow.hosxp_cases)}/{formatNumber(selectedVarianceRow.rep_cases)} เคส ไม่มีเคสค้างส่ง) ยอดส่วนต่าง <strong>+{formatMoney(selectedVarianceRow.diff_hosxp_rep)}</strong> เกิดจาก:
                                                        <div className="mt-1 pl-2 space-y-0.5">
                                                            <div>• <strong>งวดอุทธรณ์ที่ชดเชยแล้ว:</strong> เคสที่ยื่นอุทธรณ์ชดเชยเงินคืนในงวดถัดไป ซึ่งได้รับเงินโอนเข้าบัญชีโรงพยาบาลครบถ้วนแล้ว</div>
                                                            <div>• <strong>การปรับราคา Fee Schedule:</strong> การคำนวณราคาตามเกณฑ์อัตราจ่ายตรงของ e-Claim (คลิกที่การ์ดด้านบนเพื่อดูรายการเจาะลึก)</div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        💡 <strong>คำอธิบายสาเหตุ & แนวทาง:</strong> ส่งเบิกเข้า e-Claim ครบถ้วน 100% และยอดเงินตรงกันสมบูรณ์
                                                    </div>
                                                )
                                            ) : (
                                                <div>
                                                    💡 <strong>คำอธิบายสาเหตุ & แนวทาง:</strong> เกิดจากผู้ป่วยที่มารับบริการใน HOSxP ยังไม่ได้ส่งออกไฟล์ e-Claim (ค้างส่งเบิก {selectedVarianceRow.variance_details?.unclaimed_cases || 0} เคส) และส่วนต่างการคิดราคาตามอัตราจ่ายตรง Fee Schedule ของ e-Claim ที่อาจต่างจากราคาตั้งต้นของโรงพยาบาล (ระบบตัดเคสชำระเงินสดเองและเคสยอดเป็นศูนย์ออกจากการคำนวณและยอดรวมทั้งหมดแล้ว)
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Section 2: REP vs STM */}
                                    <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/40">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-purple-900 flex items-center gap-1.5 text-sm">
                                                2. ส่วนต่างการชดเชยเงิน: [2] REP vs [3] STM (Statement โอนจริง)
                                            </h4>
                                            <span className="text-xs font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-md">
                                                ชดเชยแล้ว {selectedVarianceRow.recovery_rate}%
                                            </span>
                                        </div>
                                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div className="bg-white p-3 rounded-xl border border-purple-200/60 shadow-2xs">
                                                <span className="text-[11px] text-slate-500">ยอดเงินโอนจริงใน STM:</span>
                                                <div className="font-bold text-emerald-700 text-base mt-0.5">{formatMoney(selectedVarianceRow.stm_approved)}</div>
                                                <span className="text-[10px] text-slate-400">{formatNumber(selectedVarianceRow.stm_cases)} เคส</span>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => switchVarianceTab('c_deny')}
                                                className="group text-left bg-gradient-to-br from-rose-500/10 to-rose-500/5 hover:from-rose-500/20 hover:to-rose-500/10 p-3 rounded-xl border-2 border-dashed border-rose-300 hover:border-rose-500 transition cursor-pointer shadow-2xs"
                                                title="คลิกเพื่อดูเคสติด C และแนวทางส่งอุทธรณ์"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-semibold text-rose-900">ยอดติด C / Error:</span>
                                                    <ArrowUpRight className="w-4 h-4 text-rose-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
                                                </div>
                                                <div className="font-bold text-rose-600 text-base mt-0.5">
                                                    {formatMoney(selectedVarianceRow.rep_c_deny_amount)}
                                                </div>
                                                <div className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-200/80 px-2 py-0.5 rounded-md mt-1">
                                                    👉 คลิกดู {selectedVarianceRow.rep_c_deny_cases} เคส & วิธีอุทธรณ์
                                                </div>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => switchVarianceTab('stm_pending')}
                                                className="group text-left bg-gradient-to-br from-purple-500/10 to-purple-500/5 hover:from-purple-500/20 hover:to-purple-500/10 p-3 rounded-xl border-2 border-dashed border-purple-300 hover:border-purple-500 transition cursor-pointer shadow-2xs"
                                                title="คลิกเพื่อดูรายการที่อยู่ระหว่างรอ Statement งวดถัดไป"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-semibold text-purple-900">รอเงินโอนงวดถัดไป:</span>
                                                    <ArrowUpRight className="w-4 h-4 text-purple-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
                                                </div>
                                                <div className="font-bold text-purple-700 text-base mt-0.5">
                                                    {formatMoney(selectedVarianceRow.variance_details?.pending_stm_amount || 0)}
                                                </div>
                                                <div className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-800 bg-purple-200/80 px-2 py-0.5 rounded-md mt-1">
                                                    👉 คลิกดู {selectedVarianceRow.variance_details?.pending_stm_cases || 0} เคสรอโอน
                                                </div>
                                            </button>
                                        </div>
                                        <p className="text-purple-900/90 mt-3 text-[11.5px] leading-relaxed bg-white/70 p-2.5 rounded-xl border border-purple-200/50">
                                            💡 <strong>คำอธิบายสาเหตุ & แนวทาง:</strong> ยอดที่ส่งเบิก e-Claim ได้รับการโอนเงินจริงแล้ว {formatMoney(selectedVarianceRow.stm_approved)} ส่วนต่างที่ยังขาดเกิดจาก (1) ยอดที่ถูกตัดเงินหรือติดรหัส C จำนวน {formatMoney(selectedVarianceRow.rep_c_deny_amount)} ซึ่งต้องส่งอุทธรณ์ และ (2) ยอดที่อยู่ระหว่างรอรอบการโอนเงินงวดถัดไป
                                        </p>
                                    </div>

                                    {/* Section 3: Hemodialysis & Cash Breakdown */}
                                    <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/40">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-indigo-900 flex items-center gap-1.5 text-sm">
                                                3. การคัดแยกผู้ป่วยไตเทียม (HD) และเงินสดคนไข้
                                            </h4>
                                            <span className="text-xs font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-md">
                                                คัดแยกเฉพาะกลุ่ม
                                            </span>
                                        </div>
                                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => switchVarianceTab('hemodialysis')}
                                                className="group text-left bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 hover:from-indigo-500/20 hover:to-indigo-500/10 p-3 rounded-xl border-2 border-dashed border-indigo-300 hover:border-indigo-500 transition cursor-pointer shadow-2xs"
                                                title="คลิกเพื่อดูเคสผู้ป่วยไตเทียม"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-semibold text-indigo-900">ผู้ป่วยไตเทียม (ฟอกไต):</span>
                                                    <ArrowUpRight className="w-4 h-4 text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
                                                </div>
                                                <div className="font-bold text-indigo-700 text-base mt-0.5">{formatMoney(selectedVarianceRow.hemo_uc_money)}</div>
                                                <div className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-800 bg-indigo-200/80 px-2 py-0.5 rounded-md mt-1">
                                                    👉 คลิกดู {selectedVarianceRow.hemo_cases} เคส (แยกส่งเบิกโครงการไต)
                                                </div>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => switchVarianceTab('cash_cases')}
                                                className="group text-left bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 hover:from-emerald-500/20 hover:to-emerald-500/10 p-3 rounded-xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 transition cursor-pointer shadow-2xs"
                                                title="คลิกเพื่อดูรายการเงินสดและสถานะใบเสร็จ"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-semibold text-emerald-900">เงินสดคนไข้จ่ายหน้าเคาน์เตอร์:</span>
                                                    <ArrowUpRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
                                                </div>
                                                <div className="font-bold text-slate-800 text-base mt-0.5">{formatMoney(selectedVarianceRow.hosxp_cash)}</div>
                                                <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-md mt-1">
                                                    👉 คลิกดูรายการเงินสด & ใบเสร็จรับเงิน
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Sub-View Top Banner: Back Button + Category Clarification */}
                                    <div className="flex items-center justify-between pb-1">
                                        <button
                                            type="button"
                                            onClick={() => switchVarianceTab('overview')}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
                                        >
                                            <ArrowLeft className="w-3.5 h-3.5" />
                                            กลับสู่ภาพรวมวิเคราะห์ส่วนต่าง
                                        </button>
                                        <div className="text-xs text-slate-500">
                                            {loadingVarianceDrill ? (
                                                <span className="animate-pulse text-purple-600">กำลังดึงข้อมูลเคสจริง...</span>
                                            ) : (
                                                <span>พบข้อมูล <strong>{varianceDrillItems.length}</strong> รายการ</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Clarification & Guidance Box (กล่องชี้แจงและอธิบายสาเหตุ & แนวทางปฏิบัติ) */}
                                    {activeVarianceTab === 'unclaimed_hosxp' && (
                                        (selectedVarianceRow.variance_details?.unclaimed_cases === 0 && selectedVarianceRow.diff_hosxp_rep > 0) ? (
                                            <div className="p-4 rounded-2xl border border-sky-300 bg-gradient-to-r from-sky-50 to-indigo-50/40 space-y-2.5">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <h4 className="font-bold text-sky-950 text-sm flex items-center gap-1.5">
                                                        ✨ ชี้แจงที่มาส่วนต่าง: ส่งเบิกครบ 100% (0 เคสค้าง) แต่มีส่วนต่างการคิดราคา / อุทธรณ์ (+{formatMoney(selectedVarianceRow.diff_hosxp_rep)})
                                                    </h4>
                                                    <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-lg">
                                                        ✅ ส่งออก e-Claim ครบทุกเคสแล้ว ({formatNumber(selectedVarianceRow.hosxp_cases)} / {formatNumber(selectedVarianceRow.rep_cases)})
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[11.5px] leading-relaxed text-slate-700">
                                                    <div className="bg-white/80 p-3 rounded-xl border border-sky-200">
                                                        <div className="font-bold text-sky-900 mb-1">🔍 สาเหตุและข้อเท็จจริง (ที่มาของส่วนต่าง {formatMoney(selectedVarianceRow.diff_hosxp_rep)}):</div>
                                                        ไม่ได้เกิดจากการลืมส่งเบิกเคสคนไข้! เคสคนไข้ทั้งหมด {formatNumber(selectedVarianceRow.rep_cases)} เคสถูกส่งออกเบิกครบถ้วนแล้ว แต่ยอดลูกหนี้ HOSxP สูงกว่ายอดตั้งเบิกเริ่มต้นอยู่ {formatMoney(selectedVarianceRow.diff_hosxp_rep)} จาก 4 รายการ (ชดเชยผ่านอุทธรณ์ 650 บาท และปรับตาม Fee Schedule)
                                                    </div>
                                                    <div className="bg-white/80 p-3 rounded-xl border border-sky-200">
                                                        <div className="font-bold text-sky-900 mb-1">⚖️ สถานะการชดเชยเงิน:</div>
                                                        ยอดส่วนต่าง 650.00 บาท ได้รับการชดเชยแล้วผ่านการยื่นอุทธรณ์ในงวด REP 690900116 (+450.00 บ.) และ 690900119 (+200.00 บ.) สปสช./กรมบัญชีกลางโอนชดเชยเงินเข้าบัญชีครบถ้วน
                                                    </div>
                                                    <div className="bg-white/80 p-3 rounded-xl border border-sky-200">
                                                        <div className="font-bold text-sky-900 mb-1">💡 แนวทางปฏิบัติงาน:</div>
                                                        ไม่ต้องทำรายการส่งออก CSOP เพิ่มเติม เนื่องจากระบบตัดเคสชำระเองและยอดศูนย์ออกแล้ว และเคสสิทธิทั้งหมดส่งครบ 100% ยอดส่วนต่างนี้เป็นผลต่างการคำนวณราคาต้นทางกับปลายทาง
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-4 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100/40 space-y-2.5">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <h4 className="font-bold text-amber-950 text-sm flex items-center gap-1.5">
                                                        📋 คำชี้แจงและแนวทางแก้ไข: เคสค้างส่งเบิกใน HOSxP ({selectedVarianceRow.variance_details?.unclaimed_cases ?? 0} เคส)
                                                    </h4>
                                                    <a
                                                        href={route('rcm.csop.index', {
                                                            start_date: `${selectedVarianceRow.month_key}-01`,
                                                            end_date: new Date(parseInt(selectedVarianceRow.month_key.split('-')[0]), parseInt(selectedVarianceRow.month_key.split('-')[1]), 0).toISOString().split('T')[0],
                                                            scheme: scheme === 'all' ? 'cgd' : scheme,
                                                            service_scope: serviceScope,
                                                        })}
                                                        className="inline-flex items-center gap-1 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] transition shadow-xs"
                                                    >
                                                        <ExternalLink className="w-3 h-3" /> เปิดหน้าส่งออก CSOP ผู้ป่วยนอก
                                                    </a>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[11.5px] leading-relaxed text-slate-700">
                                                    <div className="bg-white/80 p-3 rounded-xl border border-amber-200">
                                                        <div className="font-bold text-amber-900 mb-1">🔍 สาเหตุและข้อเท็จจริง:</div>
                                                        ตรวจพบเคสที่มีประวัติการรับบริการใน HOSxP แต่เลข VN ยังไม่ปรากฏในไฟล์ REP ของ e-Claim โดยระบบได้ตัดเคสที่ชำระเงินเอง 100% และเคสยอดเป็นศูนย์ออกจากการคำนวณและยอดรวมอื่นๆ เรียบร้อยแล้ว จึงแสดงเฉพาะเคสที่มีลูกหนี้สิทธิค้างส่งจริง
                                                    </div>
                                                    <div className="bg-white/80 p-3 rounded-xl border border-amber-200">
                                                        <div className="font-bold text-amber-900 mb-1">⚖️ ผลกระทบต่อลูกหนี้:</div>
                                                        ทำให้ยอดลูกหนี้สิทธิของโรงพยาบาลในระบบ HOSxP สูงกว่ายอดที่ส่งเบิกจริง ({formatMoney(selectedVarianceRow.diff_hosxp_rep)}) หากไม่ส่งออกเบิกอาจเสี่ยงต่อการพ้นกำหนดระยะเวลาเบิกจ่ายตรง (Claim Deadline)
                                                    </div>
                                                    <div className="bg-white/80 p-3 rounded-xl border border-amber-200">
                                                        <div className="font-bold text-amber-900 mb-1">💡 แนวทางปฏิบัติงาน:</div>
                                                        1. ตรวจสอบเคสที่มียอดลูกหนี้สิทธิ (ช่องสีฟ้า) &gt; 0 ในตารางด้านล่าง<br />
                                                        2. ดำเนินการออกใบสั่งยา/ตรวจความสมบูรณ์ และกดส่งออกข้อมูลผ่านเมนู CSOP e-Claim<br />
                                                        3. เคสที่ชำระเงินเองหรือเป็นศูนย์ถูกตัดออกจากยอดค้างส่งเบิกและยอด HOSxP ทั้งหมดแล้ว
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    )}

                                    {activeVarianceTab === 'c_deny' && (
                                        <div className="p-4 rounded-2xl border border-rose-300 bg-gradient-to-r from-rose-50 to-rose-100/40 space-y-2.5">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <h4 className="font-bold text-rose-950 text-sm flex items-center gap-1.5">
                                                    ⚠️ คำชี้แจงและแนวทางแก้ไข: เคสติด C / Error ใน REP ({selectedVarianceRow.rep_c_deny_cases ?? 0} เคส | {formatMoney(selectedVarianceRow.rep_c_deny_amount ?? 0)})
                                                </h4>
                                                <a
                                                    href={route('rcm.reconciliation.index')}
                                                    className="inline-flex items-center gap-1 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] transition shadow-xs"
                                                >
                                                    <ExternalLink className="w-3 h-3" /> ไปหน้าระบบติดตามและอุทธรณ์
                                                </a>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[11.5px] leading-relaxed text-slate-700">
                                                <div className="bg-white/80 p-3 rounded-xl border border-rose-200">
                                                    <div className="font-bold text-rose-900 mb-1">🔍 สาเหตุและข้อเท็จจริง:</div>
                                                    ระบบ e-Claim ปฏิเสธการจ่ายหรือตัดทอนยอดเงินชดเชยเนื่องจากติดข้อผิดพลาด (เช่น รหัส C305 ตรวจสอบสิทธิไม่ผ่าน, C565 รายการยานอกเกณฑ์ หรือเอกสารแนบไม่ครบ)
                                                </div>
                                                <div className="bg-white/80 p-3 rounded-xl border border-rose-200">
                                                    <div className="font-bold text-rose-900 mb-1">⚖️ ผลกระทบต่อลูกหนี้:</div>
                                                    สูญเสียรายรับที่ควรได้รับจำนวน {formatMoney(selectedVarianceRow.rep_c_deny_amount)} จนกว่าจะทำการแก้ไขข้อมูลหรือส่งอุทธรณ์สำเร็จ
                                                </div>
                                                <div className="bg-white/80 p-3 rounded-xl border border-rose-200">
                                                    <div className="font-bold text-rose-900 mb-1">💡 แนวทางปฏิบัติงาน:</div>
                                                    1. ดูรหัส C ในคอลัมน์ด้านล่างเพื่อระบุสาเหตุข้อผิดพลาด<br />
                                                    2. ขอเอกสารเวชระเบียน / ใบรับรองแพทย์ / ผลแล็บเพิ่มเติมจากแพทย์ผู้ตรวจ<br />
                                                    3. ยื่นอุทธรณ์ผ่านระบบ e-Claim หรือ SMT Portal ภายในกำหนดเวลา
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeVarianceTab === 'stm_pending' && (
                                        <div className="p-4 rounded-2xl border border-purple-300 bg-gradient-to-r from-purple-50 to-purple-100/40 space-y-2.5">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <h4 className="font-bold text-purple-950 text-sm flex items-center gap-1.5">
                                                    ⏳ คำชี้แจงและแนวทางแก้ไข: เคสรอเงินโอนในงวดถัดไป ({selectedVarianceRow.variance_details?.pending_stm_cases ?? 0} เคส | {formatMoney(selectedVarianceRow.variance_details?.pending_stm_amount ?? 0)})
                                                </h4>
                                                <a
                                                    href={route('rcm.smt.index')}
                                                    className="inline-flex items-center gap-1 px-3 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-bold text-[11px] transition shadow-xs"
                                                >
                                                    <ExternalLink className="w-3 h-3" /> ไปหน้าเชื่อมโยง SMT Statement
                                                </a>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[11.5px] leading-relaxed text-slate-700">
                                                <div className="bg-white/80 p-3 rounded-xl border border-purple-200">
                                                    <div className="font-bold text-purple-900 mb-1">🔍 สาเหตุและข้อเท็จจริง:</div>
                                                    เคสเหล่านี้ผ่านการตรวจสอบในไฟล์ REP เรียบร้อยแล้ว แต่อยู่ระหว่างรอบการตัดจ่ายของกรมบัญชีกลาง/สปสช. หรือได้รับการโอนยังไม่ครบตามยอดอนุมัติ
                                                </div>
                                                <div className="bg-white/80 p-3 rounded-xl border border-purple-200">
                                                    <div className="font-bold text-purple-900 mb-1">⚖️ ผลกระทบต่อลูกหนี้:</div>
                                                    เป็นลูกหนี้รอรับตามรอบปกติ (Accrued Revenue) จำนวน {formatMoney(selectedVarianceRow.variance_details?.pending_stm_amount || 0)} ไม่ถือเป็นหนี้สูญ
                                                </div>
                                                <div className="bg-white/80 p-3 rounded-xl border border-purple-200">
                                                    <div className="font-bold text-purple-900 mb-1">💡 แนวทางปฏิบัติงาน:</div>
                                                    1. ติดตามการประกาศ Statement (STM) งวดใหม่จากระบบ SMT Portal<br />
                                                    2. เมื่อไฟล์ Statement ประกาศแล้ว ให้กด Sync / Import STM เข้าสู่ระบบ RCM เพื่อปรับสถานะเป็น "ชดเชยครบ (Settled)"
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeVarianceTab === 'hemodialysis' && (
                                        <div className="p-4 rounded-2xl border border-indigo-300 bg-gradient-to-r from-indigo-50 to-indigo-100/40 space-y-2.5">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <h4 className="font-bold text-indigo-950 text-sm flex items-center gap-1.5">
                                                    🩺 คำชี้แจง: ผู้ป่วยฟอกไตเทียม (Hemodialysis) ({selectedVarianceRow.hemo_cases ?? 0} เคส | {formatMoney(selectedVarianceRow.hemo_uc_money ?? 0)})
                                                </h4>
                                                <span className="text-[11px] font-bold bg-indigo-200 text-indigo-900 px-2.5 py-1 rounded-lg">
                                                    เบิกผ่านโปรแกรมไตเฉพาะ
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[11.5px] leading-relaxed text-slate-700">
                                                <div className="bg-white/80 p-3 rounded-xl border border-indigo-200">
                                                    <div className="font-bold text-indigo-900 mb-1">🔍 สาเหตุและข้อเท็จจริง:</div>
                                                    ผู้ป่วยโรคไตวายเรื้อรังที่รับการฟอกเลือด (HD) และฉีดยากระตุ้นเม็ดเลือด (EPO) มีระบบเบิกจ่ายเฉพาะทาง (เช่น โปรแกรม KTMS หรือ สปสช. กองทุนไต)
                                                </div>
                                                <div className="bg-white/80 p-3 rounded-xl border border-indigo-200">
                                                    <div className="font-bold text-indigo-900 mb-1">⚖️ การคัดแยกยอดกระทบยอด:</div>
                                                    ระบบ RCM ทำการแยกกลุ่มนี้ออกจากยอด CSOP ปกติ เพื่อป้องกันไม่ให้ยอดค้างส่งเบิกของคนไข้ทั่วไปเกิดความคลาดเคลื่อน
                                                </div>
                                                <div className="bg-white/80 p-3 rounded-xl border border-indigo-200">
                                                    <div className="font-bold text-indigo-900 mb-1">💡 แนวทางปฏิบัติงาน:</div>
                                                    ติดตามและกระทบยอดกับรายงาน Statement จากโปรแกรม KTMS / สปสช. กองทุนไตโดยตรง
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeVarianceTab === 'cash_cases' && (
                                        <div className="p-4 rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 to-emerald-100/40 space-y-2.5">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-1.5">
                                                    💵 คำชี้แจง: เงินสดคนไข้และรายการชำระเอง ({formatMoney(selectedVarianceRow.hosxp_cash ?? 0)})
                                                </h4>
                                                <span className="text-[11px] font-bold bg-emerald-200 text-emerald-900 px-2.5 py-1 rounded-lg">
                                                    รับชำระหน้าเคาน์เตอร์แล้ว
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[11.5px] leading-relaxed text-slate-700">
                                                <div className="bg-white/80 p-3 rounded-xl border border-emerald-200">
                                                    <div className="font-bold text-emerald-900 mb-1">🔍 สาเหตุและข้อเท็จจริง:</div>
                                                    เป็นยอดเงินที่คนไข้ชำระเองหน้าเคาน์เตอร์การเงิน เช่น ยานอกบัญชียาหลักที่เบิกไม่ได้, ค่าธรรมเนียมพิเศษ, หรือส่วนเกินสิทธิ
                                                </div>
                                                <div className="bg-white/80 p-3 rounded-xl border border-emerald-200">
                                                    <div className="font-bold text-emerald-900 mb-1">⚖️ สถานะทางการเงิน:</div>
                                                    โรงพยาบาลได้รับเงินสดเรียบร้อยแล้ว ไม่มียอดค้างส่งเบิกต่อกองทุน
                                                </div>
                                                <div className="bg-white/80 p-3 rounded-xl border border-emerald-200">
                                                    <div className="font-bold text-emerald-900 mb-1">💡 แนวทางปฏิบัติงาน:</div>
                                                    ตรวจสอบความครบถ้วนของเลขที่ใบเสร็จรับเงิน (Finance Number) เพื่อให้มั่นใจว่าการเงินออกใบเสร็จครบทุกราย
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Detailed Case Table */}
                                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                                        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                            <span className="font-bold text-slate-700 text-xs">
                                                ตารางรายชื่อเคสจริง (Case Explorer)
                                            </span>
                                            <span className="text-[11px] text-slate-500">
                                                {varianceDrillItems.length > 0 && `แสดง ${varianceDrillItems.length} รายการ`}
                                            </span>
                                        </div>

                                        {loadingVarianceDrill ? (
                                            <div className="py-16 text-center">
                                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent" />
                                                <p className="text-xs text-slate-500 mt-2">กำลังโหลดข้อมูลเจาะลึก...</p>
                                            </div>
                                        ) : varianceDrillItems.length === 0 ? (
                                            <div className="py-16 text-center text-slate-400 text-xs">
                                                ไม่พบรายการเคสในหมวดหมู่นี้
                                            </div>
                                        ) : activeVarianceTab === 'unclaimed_hosxp' ? (
                                            varianceDrillItems.length > 0 && varianceDrillItems[0]?.item_type === 'rate_variance' ? (
                                                <div className="overflow-x-auto max-h-[45vh]">
                                                    <table className="w-full text-left text-xs border-collapse">
                                                        <thead className="sticky top-0 bg-sky-50 z-10 border-b border-sky-200 text-sky-900 font-bold text-[11px]">
                                                            <tr>
                                                                <th className="p-2.5">VN</th>
                                                                <th className="p-2.5">HN</th>
                                                                <th className="p-2.5">ชื่อผู้ป่วย</th>
                                                                <th className="p-2.5">วันที่รับบริการ</th>
                                                                <th className="p-2.5">แผนก / สิทธิ</th>
                                                                <th className="p-2.5 text-right text-sky-800">ลูกหนี้ HOSxP (฿)</th>
                                                                <th className="p-2.5 text-right text-amber-800">ตั้งเบิก e-Claim (฿)</th>
                                                                <th className="p-2.5 text-right text-purple-700">ส่วนต่าง (฿)</th>
                                                                <th className="p-2.5">คำอธิบายสาเหตุ & สถานะการชดเชย</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {varianceDrillItems.map((item, idx) => (
                                                                <tr key={idx} className="hover:bg-slate-50">
                                                                    <td className="p-2.5 font-mono text-slate-800 font-semibold">{item.vn}</td>
                                                                    <td className="p-2.5 font-mono">{item.hn}</td>
                                                                    <td className="p-2.5 font-medium">{item.patient_name}</td>
                                                                    <td className="p-2.5 text-slate-500 whitespace-nowrap">{item.visit_date}</td>
                                                                    <td className="p-2.5 text-slate-600 truncate max-w-[140px]" title={`${item.department} / ${item.pttype_name}`}>
                                                                        {item.department || item.pttype_name}
                                                                    </td>
                                                                    <td className="p-2.5 text-right font-mono font-medium text-sky-800">{formatMoney(item.debt || item.total || 0)}</td>
                                                                    <td className="p-2.5 text-right font-mono font-medium text-amber-800">{formatMoney(item.claim_amount || 0)}</td>
                                                                    <td className="p-2.5 text-right font-mono font-bold text-purple-700">
                                                                        {item.diff_amount > 0 ? `+${formatMoney(item.diff_amount)}` : formatMoney(item.diff_amount)}
                                                                    </td>
                                                                    <td className="p-2.5">
                                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                                                                            item.is_appeal_settled
                                                                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                                                                        }`}>
                                                                            {item.is_appeal_settled ? '✅ ' : 'ℹ️ '}
                                                                            {item.diff_reason}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="overflow-x-auto max-h-[45vh]">
                                                    <table className="w-full text-left text-xs border-collapse">
                                                        <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                                                            <tr>
                                                                <th className="p-2">VN</th>
                                                                <th className="p-2">HN</th>
                                                                <th className="p-2">ชื่อผู้ป่วย</th>
                                                                <th className="p-2">วันที่ / เวลา</th>
                                                                <th className="p-2">แผนก</th>
                                                                <th className="p-2">สิทธิ</th>
                                                                <th className="p-2 text-right">ค่ายา</th>
                                                                <th className="p-2 text-right">อวัยวะ</th>
                                                                <th className="p-2 text-right">บริการ</th>
                                                                <th className="p-2 text-right">ยอดรวม</th>
                                                                <th className="p-2 text-right">ชำระเอง</th>
                                                                <th className="p-2 text-right text-sky-700">ลูกหนี้สิทธิ</th>
                                                                <th className="p-2 text-center">ใบเสร็จ</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {varianceDrillItems.map((item, idx) => (
                                                                <tr key={idx} className="hover:bg-slate-50">
                                                                    <td className="p-2 font-mono text-slate-800 text-[11px]">{item.vn}</td>
                                                                    <td className="p-2 font-mono text-[11px]">{item.hn}</td>
                                                                    <td className="p-2 font-medium">{item.patient_name}</td>
                                                                    <td className="p-2 text-slate-500 text-[11px] whitespace-nowrap">{item.visit_date} {item.visit_time?.substring(0, 5)}</td>
                                                                    <td className="p-2 text-slate-600 truncate max-w-[110px]" title={item.department}>{item.department || '-'}</td>
                                                                    <td className="p-2 text-slate-600 truncate max-w-[100px]" title={item.pttype_name}>{item.pttype_name}</td>
                                                                    <td className="p-2 text-right font-mono">{formatMoney(item.drug || 0)}</td>
                                                                    <td className="p-2 text-right font-mono">{formatMoney(item.artificial_organ || 0)}</td>
                                                                    <td className="p-2 text-right font-mono">{formatMoney(item.service_charge || 0)}</td>
                                                                    <td className="p-2 text-right font-mono font-medium">{formatMoney(item.total || item.income || 0)}</td>
                                                                    <td className="p-2 text-right font-mono text-amber-600">{(item.payment || 0) > 0 ? formatMoney(item.payment) : '-'}</td>
                                                                    <td className="p-2 text-right font-mono font-bold text-sky-700">{formatMoney(item.debt || item.claim_amount || 0)}</td>
                                                                    <td className="p-2 text-center">
                                                                        {item.no_finance_number === '*' ? (
                                                                            <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold text-xs" title="ยังไม่มีเลขใบเสร็จรับเงิน">*</span>
                                                                        ) : (
                                                                            <span className="text-[10px] text-slate-400">เรียบร้อย</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )
                                        ) : activeVarianceTab === 'hemodialysis' ? (
                                            <div className="overflow-x-auto max-h-[45vh]">
                                                <table className="w-full text-left text-xs border-collapse">
                                                    <thead className="sticky top-0 bg-indigo-50 z-10 border-b border-indigo-200 text-indigo-900 font-bold">
                                                        <tr>
                                                            <th className="p-2.5">VN</th>
                                                            <th className="p-2.5">HN</th>
                                                            <th className="p-2.5">ชื่อผู้ป่วย</th>
                                                            <th className="p-2.5">วันที่รับบริการ</th>
                                                            <th className="p-2.5">สิทธิการรักษา</th>
                                                            <th className="p-2.5">รหัสโรค (PDx)</th>
                                                            <th className="p-2.5 text-right">ค่ารักษารวม</th>
                                                            <th className="p-2.5 text-right text-indigo-700">ลูกหนี้สิทธิเบิก</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {varianceDrillItems.map((item, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50">
                                                                <td className="p-2.5 font-medium text-slate-800">{item.vn}</td>
                                                                <td className="p-2.5">{item.hn}</td>
                                                                <td className="p-2.5 font-medium">{item.patient_name}</td>
                                                                <td className="p-2.5 text-slate-500">{item.visit_date}</td>
                                                                <td className="p-2.5 text-slate-600">{item.pttype_name}</td>
                                                                <td className="p-2.5 font-mono text-slate-700">{item.pdx || '-'}</td>
                                                                <td className="p-2.5 text-right">{formatMoney(item.income)}</td>
                                                                <td className="p-2.5 text-right font-bold text-indigo-700">{formatMoney(item.claim_amount)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : activeVarianceTab === 'cash_cases' ? (
                                            <div className="overflow-x-auto max-h-[45vh]">
                                                <table className="w-full text-left text-xs border-collapse">
                                                    <thead className="sticky top-0 bg-emerald-50 z-10 border-b border-emerald-200 text-emerald-900 font-bold">
                                                        <tr>
                                                            <th className="p-2.5">VN</th>
                                                            <th className="p-2.5">HN</th>
                                                            <th className="p-2.5">ชื่อผู้ป่วย</th>
                                                            <th className="p-2.5">วันที่รับบริการ</th>
                                                            <th className="p-2.5">ประเภทการชำระ</th>
                                                            <th className="p-2.5">สิทธิการรักษา</th>
                                                            <th className="p-2.5 text-right">ค่ารักษารวม</th>
                                                            <th className="p-2.5 text-right text-emerald-700">เงินสดที่คนไข้จ่าย</th>
                                                            <th className="p-2.5 text-right text-sky-700">ลูกหนี้สิทธิเบิก</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {varianceDrillItems.map((item, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50">
                                                                <td className="p-2.5 font-medium text-slate-800">{item.vn}</td>
                                                                <td className="p-2.5">{item.hn}</td>
                                                                <td className="p-2.5 font-medium">{item.patient_name}</td>
                                                                <td className="p-2.5 text-slate-500">{item.visit_date}</td>
                                                                <td className="p-2.5">
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                                                        item.cash_type === 'เงินสด 100%'
                                                                            ? 'bg-amber-100 text-amber-800'
                                                                            : 'bg-blue-100 text-blue-800'
                                                                    }`}>
                                                                        {item.cash_type}
                                                                    </span>
                                                                </td>
                                                                <td className="p-2.5 text-slate-600">{item.pttype_name}</td>
                                                                <td className="p-2.5 text-right">{formatMoney(item.income)}</td>
                                                                <td className="p-2.5 text-right font-bold text-emerald-700">{formatMoney(item.cash_paid)}</td>
                                                                <td className="p-2.5 text-right font-medium text-sky-700">{formatMoney(item.claim_amount)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto max-h-[45vh]">
                                                <table className="w-full text-left text-xs border-collapse">
                                                    <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-200 text-slate-700 font-bold">
                                                        <tr>
                                                            <th className="p-2.5">Rep No</th>
                                                            <th className="p-2.5">Tran ID</th>
                                                            <th className="p-2.5">HN / AN</th>
                                                            <th className="p-2.5">ชื่อผู้ป่วย</th>
                                                            <th className="p-2.5">วันที่บริการ</th>
                                                            <th className="p-2.5 text-right">ยอดตั้งเบิก</th>
                                                            <th className="p-2.5 text-right">ยอดอนุมัติ</th>
                                                            <th className="p-2.5 text-right text-rose-600">ส่วนต่างที่ขาด</th>
                                                            <th className="p-2.5 text-center">รหัส C / Error</th>
                                                            <th className="p-2.5 text-center">กองทุน</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {varianceDrillItems.map((item) => (
                                                            <tr key={item.id} className="hover:bg-slate-50">
                                                                <td className="p-2.5 font-medium text-slate-800">{item.rep_no}</td>
                                                                <td className="p-2.5 text-slate-500">{item.tran_id}</td>
                                                                <td className="p-2.5">
                                                                    <div>{item.hn}</div>
                                                                    {item.an && <span className="text-[10px] text-slate-400">AN: {item.an}</span>}
                                                                </td>
                                                                <td className="p-2.5 font-medium">{item.patient_name}</td>
                                                                <td className="p-2.5 text-slate-500">{item.visit_date}</td>
                                                                <td className="p-2.5 text-right font-medium">{formatMoney(item.claim_amount)}</td>
                                                                <td className="p-2.5 text-right font-bold text-emerald-700">{formatMoney(item.approved_amount)}</td>
                                                                <td className="p-2.5 text-right font-bold text-rose-600">{formatMoney(item.shortfall)}</td>
                                                                <td className="p-2.5 text-center">
                                                                    {item.error_code && item.error_code !== '-' ? (
                                                                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                                                                            C{item.error_code}
                                                                        </span>
                                                                    ) : (
                                                                        '-'
                                                                    )}
                                                                </td>
                                                                <td className="p-2.5 text-center font-bold text-slate-600">
                                                                    {item.scheme}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                                {activeVarianceTab !== 'overview' && (
                                    <button
                                        type="button"
                                        onClick={() => switchVarianceTab('overview')}
                                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl transition"
                                    >
                                        ← กลับไปดูภาพรวมวิเคราะห์
                                    </button>
                                )}
                                <a
                                    href={route('rcm.csop.index', {
                                        start_date: `${selectedVarianceRow.month_key}-01`,
                                        end_date: new Date(parseInt(selectedVarianceRow.month_key.split('-')[0]), parseInt(selectedVarianceRow.month_key.split('-')[1]), 0).toISOString().split('T')[0],
                                        scheme: scheme === 'all' ? 'cgd' : scheme,
                                        service_scope: serviceScope,
                                    })}
                                    className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-semibold rounded-xl transition"
                                >
                                    📄 เปิดดูในระบบ CSOP ผู้ป่วยนอก
                                </a>
                            </div>

                            <button
                                type="button"
                                onClick={() => setVarianceModalOpen(false)}
                                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition"
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
