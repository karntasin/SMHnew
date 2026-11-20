import React, { useState, useMemo } from 'react';
import RcmLayout from './RcmLayout';
import { router } from '@inertiajs/react';
import { ThaiDateRangePicker } from '@/components/date-range-picker';
import {
    ShieldCheck,
    AlertOctagon,
    AlertTriangle,
    CheckCircle2,
    Search,
    FileSpreadsheet,
    FileText,
    RefreshCw,
    X,
    CreditCard,
    Layers,
    Pill,
    Stethoscope,
    Building2,
    AlertCircle,
    Info,
    Check,
    Filter,
} from 'lucide-react';

interface Finding {
    rule_code: string;
    rule_name: string;
    severity: 'error' | 'warning';
    message: string;
    fix_instruction: string;
}

interface ErrorBreakdownItem {
    rule_code: string;
    rule_name: string;
    severity: 'error' | 'warning';
    count: number;
    amount: number;
}

interface ScrubberItem {
    vn?: string;
    an?: string;
    hn: string;
    cid: string;
    patient_name: string;
    visit_date?: string;
    dchdate?: string;
    pdx: string;
    pttype: string;
    pttype_name: string;
    claim_amount: number;
    audit_status: 'pass' | 'warning' | 'error';
    findings: Finding[];
    findings_count: number;
    auth_code?: string;
    auth_source?: string;
    drg?: string;
    adj_rw?: number;
    department?: string;
    los?: number;
}

interface NedItem {
    hos_guid?: string;
    vn?: string;
    an?: string;
    service_type: 'OPD' | 'IPD';
    hn: string;
    raw_hn?: string;
    cid: string;
    patient_name: string;
    vstdate: string;
    pttype: string;
    pttype_name: string;
    department: string;
    doctor_code: string;
    doctor_name: string;
    icode: string;
    drug_name: string;
    units: string;
    tmt_code: string;
    qty: number;
    unitprice: number;
    sum_price: number;
    paidst: string;
    has_reason: boolean;
    reason_code: string;
    reason_text: string;
    reason_display: string;
}

interface TopDrug {
    icode: string;
    drug_name: string;
    units: string;
    missing_count: number;
    total_count: number;
    missing_amount: number;
}

interface TopDoctor {
    doctor_code: string;
    doctor_name: string;
    missing_count: number;
    total_count: number;
    missing_amount: number;
}

interface AuditRule {
    id: number;
    rule_code: string;
    name: string;
    category: string;
    severity: string;
    fix_instruction?: string;
}

interface SmartScrubberProps {
    tab?: 'c-audit' | 'ned';
    filters: {
        tab?: 'c-audit' | 'ned';
        start_date: string;
        end_date: string;
        type: 'CSOP' | 'CIPN';
        scheme?: string;
        status?: 'missing' | 'has_reason' | 'all';
        service_type?: 'ALL' | 'CSOP' | 'CIPN';
        error_code?: string;
    };
    items: (ScrubberItem | NedItem)[];
    summary: Record<string, any>;
    error_breakdown?: ErrorBreakdownItem[];
    top_drugs?: TopDrug[];
    top_doctors?: TopDoctor[];
    rules: AuditRule[];
    hosxp_ready: boolean;
}

export default function SmartScrubber({
    tab = 'c-audit',
    filters,
    items,
    summary,
    error_breakdown = [],
    top_drugs = [],
    top_doctors = [],
    hosxp_ready,
}: SmartScrubberProps) {
    const activeTab = filters.tab || tab || 'c-audit';
    const [startDate, setStartDate] = useState(filters.start_date);
    const [endDate, setEndDate] = useState(filters.end_date);
    const [claimType, setClaimType] = useState<'CSOP' | 'CIPN'>(filters.type || 'CSOP');
    const [scheme, setScheme] = useState<string>(filters.scheme || (activeTab === 'ned' ? 'all' : 'cgd'));
    const [statusFilter, setStatusFilter] = useState<string>(filters.status || (activeTab === 'ned' ? 'missing' : 'all'));
    const [serviceType, setServiceType] = useState<'ALL' | 'CSOP' | 'CIPN'>(filters.service_type || 'ALL');
    const [selectedErrorCode, setSelectedErrorCode] = useState<string>(filters.error_code || 'all');
    const [searchTerm, setSearchTerm] = useState('');

    // Modal Details State
    const [selectedScrubberItem, setSelectedScrubberItem] = useState<ScrubberItem | null>(null);
    const [selectedNedItem, setSelectedNedItem] = useState<NedItem | null>(null);

    // Switch between Sub-systems
    const handleSwitchTab = (newTab: 'c-audit' | 'ned') => {
        router.get(
            route('rcm.scrubber'),
            {
                tab: newTab,
                start_date: startDate,
                end_date: endDate,
                scheme: newTab === 'ned' ? 'all' : scheme,
                type: claimType,
                status: newTab === 'ned' ? 'missing' : 'all',
                service_type: serviceType,
            },
            { preserveState: false }
        );
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            route('rcm.scrubber'),
            {
                tab: activeTab,
                start_date: startDate,
                end_date: endDate,
                type: claimType,
                scheme,
                status: statusFilter,
                service_type: serviceType,
            },
            { preserveState: true }
        );
    };

    const handleSchemeChange = (newScheme: string) => {
        setScheme(newScheme);
        router.get(
            route('rcm.scrubber'),
            {
                tab: activeTab,
                start_date: startDate,
                end_date: endDate,
                type: claimType,
                scheme: newScheme,
                status: statusFilter,
                service_type: serviceType,
            },
            { preserveState: true }
        );
    };

    const handleNedStatusChange = (newStatus: 'missing' | 'has_reason' | 'all') => {
        setStatusFilter(newStatus);
        router.get(
            route('rcm.scrubber'),
            {
                tab: 'ned',
                start_date: startDate,
                end_date: endDate,
                scheme,
                status: newStatus,
                service_type: serviceType,
            },
            { preserveState: true }
        );
    };

    const handleServiceTypeChange = (newService: 'ALL' | 'CSOP' | 'CIPN') => {
        setServiceType(newService);
        router.get(
            route('rcm.scrubber'),
            {
                tab: 'ned',
                start_date: startDate,
                end_date: endDate,
                scheme,
                status: statusFilter,
                service_type: newService,
            },
            { preserveState: true }
        );
    };

    const formatMoney = (val: number | undefined) =>
        new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(val || 0);

    const schemeTabs = [
        { key: 'all', label: 'ทุกกองทุน', color: 'text-slate-700 bg-slate-100 border-slate-300' },
        { key: 'cgd', label: 'กรมบัญชีกลาง (OFC)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
        { key: 'lgo', label: 'อปท. (LGO)', color: 'text-blue-700 bg-blue-50 border-blue-200' },
        { key: 'ucs', label: 'บัตรทอง (สปสช.)', color: 'text-amber-700 bg-amber-50 border-amber-200' },
        { key: 'sss', label: 'ประกันสังคม (SSS)', color: 'text-purple-700 bg-purple-50 border-purple-200' },
    ];

    // Dynamic error breakdown calculation for instant reactive filtering
    const dynamicErrorBreakdown: ErrorBreakdownItem[] = useMemo(() => {
        if (activeTab !== 'c-audit') return [];
        if (error_breakdown && error_breakdown.length > 0) return error_breakdown;

        const map: Record<string, ErrorBreakdownItem> = {};
        (items as ScrubberItem[]).forEach((it) => {
            if (it.findings && it.findings.length > 0) {
                const seen: Record<string, boolean> = {};
                it.findings.forEach((f) => {
                    if (seen[f.rule_code]) return;
                    seen[f.rule_code] = true;
                    if (!map[f.rule_code]) {
                        map[f.rule_code] = {
                            rule_code: f.rule_code,
                            rule_name: f.rule_name || f.rule_code,
                            severity: f.severity || 'error',
                            count: 0,
                            amount: 0,
                        };
                    }
                    map[f.rule_code].count++;
                    map[f.rule_code].amount += it.claim_amount || 0;
                });
            }
        });
        return Object.values(map).sort((a, b) => b.count - a.count);
    }, [activeTab, error_breakdown, items]);

    // Filter Items Client-side (for Search Bar & Error Code Filter)
    const filteredItems = (items as any[]).filter((item) => {
        if (activeTab === 'c-audit') {
            if (statusFilter !== 'all' && item.audit_status !== statusFilter) {
                return false;
            }
            if (selectedErrorCode !== 'all') {
                const hasCode = item.findings?.some((f: any) => f.rule_code === selectedErrorCode);
                if (!hasCode) return false;
            }
            if (searchTerm.trim() !== '') {
                const term = searchTerm.toLowerCase();
                const id = (item.vn || item.an || '').toLowerCase();
                const hn = (item.hn || '').toLowerCase();
                const name = (item.patient_name || '').toLowerCase();
                const auth = (item.auth_code || '').toLowerCase();
                const pdx = (item.pdx || '').toLowerCase();
                return id.includes(term) || hn.includes(term) || name.includes(term) || auth.includes(term) || pdx.includes(term);
            }
            return true;
        } else {
            // NED filter
            if (searchTerm.trim() !== '') {
                const term = searchTerm.toLowerCase();
                const id = (item.vn || item.an || '').toLowerCase();
                const hn = (item.hn || '').toLowerCase();
                const name = (item.patient_name || '').toLowerCase();
                const drug = (item.drug_name || '').toLowerCase();
                const icode = (item.icode || '').toLowerCase();
                const doc = (item.doctor_name || '').toLowerCase();
                const dep = (item.department || '').toLowerCase();
                return (
                    id.includes(term) ||
                    hn.includes(term) ||
                    name.includes(term) ||
                    drug.includes(term) ||
                    icode.includes(term) ||
                    doc.includes(term) ||
                    dep.includes(term)
                );
            }
            return true;
        }
    });

    return (
        <RcmLayout title="ตรวจก่อนเบิก (Pre-Claim Audit)" active="scrubber">
            {/* Top Sub-System Selector Bar */}
            <div className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-2xs mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/70">
                    <button
                        type="button"
                        onClick={() => handleSwitchTab('c-audit')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            activeTab === 'c-audit'
                                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/80'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                    >
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>ตรวจติด C และข้อผิดพลาด</span>
                        <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-mono">
                            Pre-Claim
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleSwitchTab('ned')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            activeTab === 'ned'
                                ? 'bg-white text-rose-800 shadow-xs border border-slate-200/80'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                    >
                        <Pill className="w-4 h-4 text-rose-600" />
                        <span>ตรวจยานอกบัญชีไม่มีเหตุผล</span>
                        <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-rose-100 text-rose-800 font-mono">
                            NED Audit
                        </span>
                    </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 pr-2">
                    <span className="hidden md:inline-flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-slate-400" />
                        ระบบตรวจคัดกรองก่อนสร้างไฟล์ส่งเบิกจ่าย ป้องกันการตัดจ่ายและ Denial
                    </span>
                </div>
            </div>

            {/* TAB 1: ตรวจติด C และข้อผิดพลาด (C-Deny & Rules Scrubber) */}
            {activeTab === 'c-audit' && (
                <>
                    {/* Header Controls */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs mb-6">
                        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4 justify-between">
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Claim Type Tabs */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">กลุ่มบริการ</label>
                                    <div className="inline-flex p-1 bg-slate-100 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setClaimType('CSOP');
                                                router.get(route('rcm.scrubber'), {
                                                    tab: 'c-audit',
                                                    start_date: startDate,
                                                    end_date: endDate,
                                                    type: 'CSOP',
                                                    scheme,
                                                });
                                            }}
                                            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                                                claimType === 'CSOP' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            CSOP ผู้ป่วยนอก
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setClaimType('CIPN');
                                                router.get(route('rcm.scrubber'), {
                                                    tab: 'c-audit',
                                                    start_date: startDate,
                                                    end_date: endDate,
                                                    type: 'CIPN',
                                                    scheme,
                                                });
                                            }}
                                            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                                                claimType === 'CIPN' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            CIPN ผู้ป่วยใน
                                        </button>
                                    </div>
                                </div>

                                {/* Date Range */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">ช่วงวันที่ตรวจประเมิน (พ.ศ.)</label>
                                    <ThaiDateRangePicker
                                        startDate={startDate}
                                        endDate={endDate}
                                        onChange={(start, end) => {
                                            setStartDate(start);
                                            setEndDate(end);
                                        }}
                                        placeholder="เลือกช่วงวันที่ตรวจประเมิน (พ.ศ.)"
                                        className="min-w-[270px]"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-xs transition"
                                >
                                    <RefreshCw className="w-4 h-4" /> ประมวลผล Audit
                                </button>
                            </div>

                            {/* Report Exports */}
                            <div className="flex items-center gap-2">
                                <a
                                    href={route('rcm.scrubber.export-excel', {
                                        start_date: startDate,
                                        end_date: endDate,
                                        type: claimType,
                                        scheme,
                                        error_code: selectedErrorCode !== 'all' ? selectedErrorCode : undefined,
                                    })}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-xl text-xs font-semibold transition"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <FileSpreadsheet className="w-4 h-4" /> ส่งออก Excel
                                </a>
                                <a
                                    href={route('rcm.scrubber.export-pdf', {
                                        start_date: startDate,
                                        end_date: endDate,
                                        type: claimType,
                                        scheme,
                                        error_code: selectedErrorCode !== 'all' ? selectedErrorCode : undefined,
                                    })}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-semibold transition"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <FileText className="w-4 h-4" /> ส่งออก PDF
                                </a>
                            </div>
                        </form>

                        {/* Scheme Tabs */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
                                <Layers className="w-3.5 h-3.5" /> เลือกกองทุน:
                            </span>
                            {schemeTabs.map((s) => (
                                <button
                                    key={s.key}
                                    type="button"
                                    onClick={() => handleSchemeChange(s.key)}
                                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                                        scheme === s.key
                                            ? `${s.color} ring-2 ring-emerald-500/30 shadow-xs font-bold`
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Scrubber KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <button
                            type="button"
                            onClick={() => setStatusFilter('all')}
                            className={`p-4 rounded-2xl border text-left transition ${
                                statusFilter === 'all'
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                    : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <div className="text-xs font-medium opacity-80 mb-1">เคสทั้งหมดที่ตรวจ</div>
                            <div className="text-2xl font-bold">{summary.total_cases || 0} เคส</div>
                            <div className="text-xs opacity-75 mt-1 font-mono">{formatMoney(summary.total_claim_amount)}</div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter('error')}
                            className={`p-4 rounded-2xl border text-left transition ${
                                statusFilter === 'error'
                                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                    : 'bg-rose-50/60 text-rose-900 border-rose-200 hover:bg-rose-100/60'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold flex items-center gap-1">
                                    <AlertOctagon className="w-3.5 h-3.5" /> ติด Error (ห้ามส่ง)
                                </span>
                                <span className="text-xs px-1.5 py-0.2 rounded bg-rose-200/60 font-mono">C-Deny</span>
                            </div>
                            <div className="text-2xl font-bold">{summary.error_cases || 0} เคส</div>
                            <div className="text-xs mt-1">ต้องแก้ไขใน HOSxP ก่อนส่งเคลม</div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter('warning')}
                            className={`p-4 rounded-2xl border text-left transition ${
                                statusFilter === 'warning'
                                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                    : 'bg-amber-50/60 text-amber-900 border-amber-200 hover:bg-amber-100/60'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5" /> มีข้อควรระวัง (Warning)
                                </span>
                            </div>
                            <div className="text-2xl font-bold">{summary.warning_cases || 0} เคส</div>
                            <div className="text-xs mt-1">ควรตรวจทานความถูกต้องก่อนส่ง</div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter('pass')}
                            className={`p-4 rounded-2xl border text-left transition ${
                                statusFilter === 'pass'
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                    : 'bg-emerald-50/60 text-emerald-900 border-emerald-200 hover:bg-emerald-100/60'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> ผ่านเกณฑ์ 100% (Clean)
                                </span>
                                <span className="text-xs font-mono font-bold">{summary.clean_claim_rate || 0}%</span>
                            </div>
                            <div className="text-2xl font-bold">{summary.clean_cases || 0} เคส</div>
                            <div className="text-xs mt-1">พร้อมสร้างชุดข้อมูลส่งออกได้ทันที</div>
                        </button>
                    </div>

                    {/* Error Code Breakdown & Quick Filter Pills */}
                    {dynamicErrorBreakdown.length > 0 && (
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs mb-5">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                                        <Filter className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-800">
                                            จำแนกตามรหัสข้อผิดพลาด (Error Code Breakdown)
                                        </h3>
                                        <p className="text-[11px] text-slate-400">
                                            คลิกที่รหัสเพื่อกรองดูเฉพาะกลุ่มเคสที่ติดปัญหานั้นได้ทันที
                                        </p>
                                    </div>
                                </div>

                                {selectedErrorCode !== 'all' && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedErrorCode('all')}
                                        className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-semibold px-2.5 py-1 rounded-lg hover:bg-rose-50 transition border border-rose-200"
                                    >
                                        <X className="w-3.5 h-3.5" /> ล้างตัวกรองรหัส ({selectedErrorCode})
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedErrorCode('all')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                                        selectedErrorCode === 'all'
                                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    ทุกรหัส Error
                                </button>

                                {dynamicErrorBreakdown.map((err) => {
                                    const isSelected = selectedErrorCode === err.rule_code;
                                    const isErr = err.severity === 'error';
                                    return (
                                        <button
                                            key={err.rule_code}
                                            type="button"
                                            onClick={() =>
                                                setSelectedErrorCode(isSelected ? 'all' : err.rule_code)
                                            }
                                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                                                isSelected
                                                    ? isErr
                                                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-400/40'
                                                        : 'bg-amber-500 text-white border-amber-500 shadow-xs ring-2 ring-amber-400/40'
                                                    : isErr
                                                    ? 'bg-rose-50/70 text-rose-900 border-rose-200 hover:bg-rose-100'
                                                    : 'bg-amber-50/70 text-amber-900 border-amber-200 hover:bg-amber-100'
                                            }`}
                                        >
                                            <span className="font-mono font-bold">{err.rule_code}</span>
                                            <span className="text-[11px] opacity-90 truncate max-w-[140px]">
                                                {err.rule_name}
                                            </span>
                                            <span
                                                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                                    isSelected
                                                        ? 'bg-white/30 text-white'
                                                        : isErr
                                                        ? 'bg-rose-200/80 text-rose-900'
                                                        : 'bg-amber-200/80 text-amber-900'
                                                }`}
                                            >
                                                {err.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Filter & Search Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative w-72">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                <input
                                    type="text"
                                    placeholder="ค้นหา VN, AN, HN, ชื่อผู้ป่วย, เลข EDC..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                                />
                            </div>

                            {/* Error Code Dropdown Filter */}
                            {dynamicErrorBreakdown.length > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <select
                                        value={selectedErrorCode}
                                        onChange={(e) => setSelectedErrorCode(e.target.value)}
                                        className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                                    >
                                        <option value="all">
                                            -- ทุกรหัสข้อผิดพลาด ({dynamicErrorBreakdown.length} รหัส) --
                                        </option>
                                        {dynamicErrorBreakdown.map((err) => (
                                            <option key={err.rule_code} value={err.rule_code}>
                                                [{err.rule_code}] {err.rule_name} ({err.count} เคส)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="text-xs text-slate-500">
                            แสดง {filteredItems.length} จากทั้งหมด {items.length} เคส
                            {selectedErrorCode !== 'all' && (
                                <span className="ml-1 text-rose-600 font-semibold font-mono">
                                    (กรองรหัส: {selectedErrorCode})
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Main Scrubber Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden mb-12">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-500">
                                        <th className="py-3 px-4">สถานะ Audit</th>
                                        <th className="py-3 px-4">VN / AN</th>
                                        <th className="py-3 px-4">HN & ชื่อผู้ป่วย</th>
                                        <th className="py-3 px-4">วันที่รับบริการ</th>
                                        <th className="py-3 px-4">สิทธิการรักษา</th>
                                        <th className="py-3 px-4">โรคหลัก (Pdx)</th>
                                        <th className="py-3 px-4 text-center">เลข EDC / Auth Code</th>
                                        <th className="py-3 px-4 text-right">ยอดตั้งเบิก</th>
                                        <th className="py-3 px-4">ข้อผิดพลาดที่พบ</th>
                                        <th className="py-3 px-4 text-center">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {filteredItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="py-10 text-center text-slate-400">
                                                ไม่พบข้อมูลเคสที่ตรงกับเงื่อนไขการค้นหา
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredItems.map((item: any, idx) => {
                                            const id = item.vn || item.an;
                                            return (
                                                <tr
                                                    key={id || idx}
                                                    className={`hover:bg-slate-50/80 transition cursor-pointer ${
                                                        item.audit_status === 'error'
                                                            ? 'bg-rose-50/30'
                                                            : item.audit_status === 'warning'
                                                            ? 'bg-amber-50/20'
                                                            : ''
                                                    }`}
                                                    onClick={() => setSelectedScrubberItem(item)}
                                                >
                                                    <td className="py-3 px-4 whitespace-nowrap">
                                                        {item.audit_status === 'pass' && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                                                <CheckCircle2 className="w-3.5 h-3.5" /> ผ่าน (Clean)
                                                            </span>
                                                        )}
                                                        {item.audit_status === 'warning' && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                                                <AlertTriangle className="w-3.5 h-3.5" /> เตือน
                                                            </span>
                                                        )}
                                                        {item.audit_status === 'error' && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 animate-pulse">
                                                                <AlertOctagon className="w-3.5 h-3.5" /> ติด Error
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="py-3 px-4 font-mono font-medium text-slate-900">{id}</td>
                                                    <td className="py-3 px-4">
                                                        <div className="font-medium text-slate-800">{item.patient_name}</div>
                                                        <div className="text-xs text-slate-400 font-mono">HN: {item.hn}</div>
                                                    </td>
                                                    <td className="py-3 px-4 text-xs text-slate-600">
                                                        {item.visit_date || item.dchdate}
                                                    </td>
                                                    <td className="py-3 px-4 text-xs">
                                                        <span className="font-semibold text-slate-700">{item.pttype}</span>
                                                        <div className="text-slate-400 truncate max-w-[120px]">{item.pttype_name}</div>
                                                    </td>
                                                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                                                        {item.pdx || <span className="text-rose-500 text-xs">ไม่ได้ลง</span>}
                                                    </td>
                                                    <td className="py-3 px-4 text-center text-xs font-mono">
                                                        {item.auth_code ? (
                                                            <div>
                                                                <span className="font-bold text-slate-800">{item.auth_code}</span>
                                                                {item.auth_source && (
                                                                    <div className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded inline-block mt-0.5">
                                                                        {item.auth_source}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-rose-500 font-semibold text-xs flex items-center justify-center gap-1">
                                                                <CreditCard className="w-3 h-3" /> ไม่มี EDC
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-medium text-slate-900">
                                                        {formatMoney(item.claim_amount)}
                                                    </td>
                                                    <td className="py-3 px-4 text-xs">
                                                        {item.findings && item.findings.length > 0 ? (
                                                            <div className="space-y-1">
                                                                <div className="flex flex-wrap items-center gap-1">
                                                                    {item.findings.map((f: any, fi: number) => (
                                                                        <button
                                                                            key={fi}
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setSelectedErrorCode(f.rule_code);
                                                                            }}
                                                                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition ${
                                                                                f.severity === 'error'
                                                                                    ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                                                                                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                                                            }`}
                                                                            title={`คลิกเพื่อกรองรหัส: ${f.rule_name}`}
                                                                        >
                                                                            {f.rule_code}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                                <div className="text-slate-700 text-xs line-clamp-1 max-w-[280px]">
                                                                    {item.findings[0].message}
                                                                    {item.findings.length > 1 && (
                                                                        <span className="text-slate-400 ml-1">
                                                                            (+{item.findings.length - 1})
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-emerald-600 font-medium">ข้อมูลสมบูรณ์</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedScrubberItem(item);
                                                            }}
                                                            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                                                        >
                                                            ตรวจดู
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* TAB 2: ตรวจยานอกบัญชีไม่มีเหตุผล (NED Prescription Reason Audit) */}
            {activeTab === 'ned' && (
                <>
                    {/* Header Controls for NED */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs mb-6">
                        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4 justify-between">
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Service Scope (OPD / IPD / ALL) */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">กลุ่มบริการ</label>
                                    <div className="inline-flex p-1 bg-slate-100 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => handleServiceTypeChange('ALL')}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                                                serviceType === 'ALL'
                                                    ? 'bg-white text-slate-800 shadow-xs font-bold'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            ทั้งหมด
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleServiceTypeChange('CSOP')}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                                                serviceType === 'CSOP'
                                                    ? 'bg-white text-teal-700 shadow-xs font-bold'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            OPD ผู้ป่วยนอก
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleServiceTypeChange('CIPN')}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                                                serviceType === 'CIPN'
                                                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            IPD ผู้ป่วยใน
                                        </button>
                                    </div>
                                </div>

                                {/* Date Range */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">ช่วงวันที่สั่งยา (พ.ศ.)</label>
                                    <ThaiDateRangePicker
                                        startDate={startDate}
                                        endDate={endDate}
                                        onChange={(start, end) => {
                                            setStartDate(start);
                                            setEndDate(end);
                                        }}
                                        placeholder="เลือกช่วงวันที่สั่งยา (พ.ศ.)"
                                        className="min-w-[270px]"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-xs transition"
                                >
                                    <RefreshCw className="w-4 h-4" /> ตรวจสอบยานอกบัญชี
                                </button>
                            </div>

                            {/* NED Report Exports */}
                            <div className="flex items-center gap-2">
                                <a
                                    href={route('rcm.scrubber.ned.export-excel', {
                                        start_date: startDate,
                                        end_date: endDate,
                                        scheme,
                                        status: statusFilter,
                                        service_type: serviceType,
                                    })}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-xl text-xs font-semibold transition"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <FileSpreadsheet className="w-4 h-4" /> ส่งออก Excel
                                </a>
                                <a
                                    href={route('rcm.scrubber.ned.export-pdf', {
                                        start_date: startDate,
                                        end_date: endDate,
                                        scheme,
                                        status: statusFilter,
                                        service_type: serviceType,
                                    })}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-semibold transition"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <FileText className="w-4 h-4" /> ส่งออก PDF
                                </a>
                            </div>
                        </form>

                        {/* Scheme Selection */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
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
                                            ? `${s.color} ring-2 ring-rose-500/30 shadow-xs font-bold`
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* NED Audit KPI Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {/* 1. Missing Reason (Primary alert) */}
                        <button
                            type="button"
                            onClick={() => handleNedStatusChange('missing')}
                            className={`p-4 rounded-2xl border text-left transition ${
                                statusFilter === 'missing'
                                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                    : 'bg-rose-50/60 text-rose-950 border-rose-200 hover:bg-rose-100/70'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4" /> ขาดเหตุผลการใช้ยา (เสี่ยงตัดเงิน)
                                </span>
                                <span
                                    className={`text-[11px] px-1.5 py-0.5 rounded font-mono font-bold ${
                                        statusFilter === 'missing' ? 'bg-white/20 text-white' : 'bg-rose-200 text-rose-900'
                                    }`}
                                >
                                    Missing
                                </span>
                            </div>
                            <div className="text-2xl font-bold">{summary.missing_reason_items || 0} รายการ</div>
                            <div className="text-xs mt-1 font-mono font-semibold">
                                มูลค่า {formatMoney(summary.missing_reason_amount)}
                            </div>
                            <div className="text-[11px] opacity-80 mt-1">ต้องบันทึกเหตุผล EA–EF ใน HOSxP</div>
                        </button>

                        {/* 2. Has Reason */}
                        <button
                            type="button"
                            onClick={() => handleNedStatusChange('has_reason')}
                            className={`p-4 rounded-2xl border text-left transition ${
                                statusFilter === 'has_reason'
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                    : 'bg-emerald-50/60 text-emerald-950 border-emerald-200 hover:bg-emerald-100/70'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold flex items-center gap-1">
                                    <Check className="w-4 h-4" /> บันทึกเหตุผลครบถ้วน
                                </span>
                                <span
                                    className={`text-[11px] px-1.5 py-0.5 rounded font-mono font-bold ${
                                        statusFilter === 'has_reason' ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-900'
                                    }`}
                                >
                                    Complete
                                </span>
                            </div>
                            <div className="text-2xl font-bold">{summary.has_reason_items || 0} รายการ</div>
                            <div className="text-xs mt-1 font-mono font-semibold">
                                มูลค่า {formatMoney(summary.has_reason_amount)}
                            </div>
                            <div className="text-[11px] opacity-80 mt-1">มีรหัสความจำเป็นตามเกณฑ์แล้ว</div>
                        </button>

                        {/* 3. Total NED Items */}
                        <button
                            type="button"
                            onClick={() => handleNedStatusChange('all')}
                            className={`p-4 rounded-2xl border text-left transition ${
                                statusFilter === 'all'
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                    : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <div className="text-xs font-medium opacity-80 mb-1">สั่งใช้ยานอกบัญชี (NED) ทั้งหมด</div>
                            <div className="text-2xl font-bold">{summary.total_ned_items || 0} รายการ</div>
                            <div className="text-xs opacity-75 mt-1 font-mono">{formatMoney(summary.total_ned_amount)}</div>
                            <div className="text-[11px] opacity-75 mt-1">
                                {summary.total_cases || 0} ใบสั่งยา ({summary.total_patients || 0} ผู้ป่วย)
                            </div>
                        </button>

                        {/* 4. Compliance Rate */}
                        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
                            <div className="flex items-center justify-between mb-1 text-xs font-medium text-slate-500">
                                <span>อัตราความครบถ้วนของเหตุผล</span>
                                <span className="font-mono font-bold text-slate-800 text-sm">
                                    {summary.compliance_rate || 0}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-2">
                                <div
                                    className={`h-full transition-all duration-500 ${
                                        (summary.compliance_rate || 0) >= 90
                                            ? 'bg-emerald-500'
                                            : (summary.compliance_rate || 0) >= 70
                                            ? 'bg-amber-500'
                                            : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${Math.min(100, summary.compliance_rate || 0)}%` }}
                                />
                            </div>
                            <div className="text-[11px] text-slate-400 mt-2">
                                เป้าหมาย: 100% ครบถ้วน เพื่อป้องกันรหัส C565 / ปฏิเสธจ่าย
                            </div>
                        </div>
                    </div>

                    {/* Top Insights Widgets (Top Missing Drugs & Doctors) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                        {/* Top Missing Drugs */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                                        <Pill className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-800">
                                            Top 5 ยานอกบัญชีที่ขาดเหตุผลสูงสุด
                                        </h3>
                                        <p className="text-[11px] text-slate-400">รายการยาที่พบการสั่งจ่ายโดยไม่มีเหตุผลบ่อยที่สุด</p>
                                    </div>
                                </div>
                            </div>

                            {top_drugs.length === 0 ? (
                                <div className="py-6 text-center text-xs text-slate-400">
                                    ไม่พบรายการยานอกบัญชีที่ขาดเหตุผล
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {top_drugs.slice(0, 5).map((drug, index) => (
                                        <div
                                            key={drug.icode}
                                            className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition text-xs"
                                        >
                                            <div className="flex items-center gap-2 max-w-[70%]">
                                                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 font-bold flex items-center justify-center text-[10px]">
                                                    {index + 1}
                                                </span>
                                                <div className="truncate">
                                                    <div className="font-semibold text-slate-800 truncate" title={drug.drug_name}>
                                                        {drug.drug_name}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-mono">
                                                        รหัสยา: {drug.icode}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="inline-block px-2 py-0.5 rounded-md font-bold text-rose-700 bg-rose-100/80">
                                                    {drug.missing_count} ครั้ง
                                                </span>
                                                <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                                                    {formatMoney(drug.missing_amount)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Top Prescribing Doctors */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                                        <Stethoscope className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-800">
                                            แพทย์ผู้สั่งใช้ยาที่พบรายการขาดเหตุผล
                                        </h3>
                                        <p className="text-[11px] text-slate-400">สำหรับทีมเภสัชกรรม/งานเบิกจ่ายประสานงานแพทย์</p>
                                    </div>
                                </div>
                            </div>

                            {top_doctors.length === 0 ? (
                                <div className="py-6 text-center text-xs text-slate-400">
                                    ไม่พบแพทย์ที่มีรายการสั่งยาขาดเหตุผล
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {top_doctors.slice(0, 5).map((doc, index) => (
                                        <div
                                            key={doc.doctor_code + index}
                                            className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition text-xs"
                                        >
                                            <div className="flex items-center gap-2 max-w-[70%]">
                                                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                                                    {index + 1}
                                                </span>
                                                <div className="truncate">
                                                    <div className="font-semibold text-slate-800 truncate" title={doc.doctor_name}>
                                                        {doc.doctor_name}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-mono">
                                                        รหัสแพทย์: {doc.doctor_code}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="inline-block px-2 py-0.5 rounded-md font-bold text-indigo-700 bg-indigo-100/80">
                                                    {doc.missing_count} รายการ
                                                </span>
                                                <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                                                    {formatMoney(doc.missing_amount)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="relative w-80">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                            <input
                                type="text"
                                placeholder="ค้นหาชื่อยา, icode, HN, ชื่อผู้ป่วย, ชื่อแพทย์..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                            />
                        </div>
                        <div className="text-xs text-slate-500">
                            แสดง {filteredItems.length} จากทั้งหมด {items.length} รายการ
                        </div>
                    </div>

                    {/* NED Items Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden mb-12">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-500">
                                        <th className="py-3 px-4">สถานะเหตุผล</th>
                                        <th className="py-3 px-4">วันที่สั่งยา</th>
                                        <th className="py-3 px-4">VN / AN</th>
                                        <th className="py-3 px-4">HN & ชื่อผู้ป่วย</th>
                                        <th className="py-3 px-4">สิทธิการรักษา</th>
                                        <th className="py-3 px-4">แผนก/ห้องตรวจ</th>
                                        <th className="py-3 px-4">ชื่อยานอกบัญชี (NED)</th>
                                        <th className="py-3 px-4 text-center">จำนวน</th>
                                        <th className="py-3 px-4 text-right">ยอดเงิน</th>
                                        <th className="py-3 px-4">แพทย์ผู้สั่งจ่าย</th>
                                        <th className="py-3 px-4 text-center">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {filteredItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={11} className="py-10 text-center text-slate-400">
                                                ไม่พบรายการยานอกบัญชีที่ตรงกับเงื่อนไขการค้นหา
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredItems.map((item: any, idx) => {
                                            const id = item.vn || item.an;
                                            return (
                                                <tr
                                                    key={item.hos_guid || id + idx}
                                                    className={`hover:bg-slate-50/80 transition cursor-pointer ${
                                                        !item.has_reason ? 'bg-rose-50/20' : ''
                                                    }`}
                                                    onClick={() => setSelectedNedItem(item)}
                                                >
                                                    {/* Reason Status Badge */}
                                                    <td className="py-3 px-4 whitespace-nowrap">
                                                        {!item.has_reason ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 animate-pulse">
                                                                <AlertCircle className="w-3.5 h-3.5" /> ไม่มีเหตุผล
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                                                <Check className="w-3.5 h-3.5" /> {item.reason_code || 'มีเหตุผล'}
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                                                        {item.vstdate}
                                                    </td>

                                                    <td className="py-3 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                                                        <div className="flex items-center gap-1.5">
                                                            <span
                                                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                                    item.service_type === 'IPD'
                                                                        ? 'bg-indigo-100 text-indigo-700'
                                                                        : 'bg-teal-100 text-teal-700'
                                                                }`}
                                                            >
                                                                {item.service_type}
                                                            </span>
                                                            <span>{id}</span>
                                                        </div>
                                                    </td>

                                                    <td className="py-3 px-4">
                                                        <div className="font-medium text-slate-800">{item.patient_name}</div>
                                                        <div className="text-xs text-slate-400 font-mono">HN: {item.hn}</div>
                                                    </td>

                                                    <td className="py-3 px-4 text-xs">
                                                        <span className="font-semibold text-slate-700">{item.pttype}</span>
                                                        <div className="text-slate-400 truncate max-w-[120px]">{item.pttype_name}</div>
                                                    </td>

                                                    <td className="py-3 px-4 text-xs text-slate-600 truncate max-w-[130px]">
                                                        {item.department}
                                                    </td>

                                                    {/* Drug details */}
                                                    <td className="py-3 px-4">
                                                        <div className="font-semibold text-slate-900 line-clamp-1 max-w-[240px]">
                                                            {item.drug_name}
                                                        </div>
                                                        <div className="text-xs text-slate-400 font-mono">
                                                            icode: {item.icode} {item.tmt_code ? `| TMT: ${item.tmt_code}` : ''}
                                                        </div>
                                                    </td>

                                                    <td className="py-3 px-4 text-center font-mono text-xs">
                                                        {item.qty} {item.units}
                                                    </td>

                                                    <td className="py-3 px-4 text-right font-medium text-slate-900 font-mono">
                                                        {formatMoney(item.sum_price)}
                                                    </td>

                                                    <td className="py-3 px-4 text-xs">
                                                        <div className="font-medium text-slate-800 line-clamp-1 max-w-[140px]">
                                                            {item.doctor_name}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-mono">{item.doctor_code}</div>
                                                    </td>

                                                    <td className="py-3 px-4 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedNedItem(item);
                                                            }}
                                                            className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                                                        >
                                                            ดูข้อมูล
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Slide-over Inspection Drawer for Scrubber Item (Tab 1) */}
            {selectedScrubberItem && (
                <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end transition-opacity">
                    <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
                        <div>
                            {/* Drawer Header */}
                            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`p-2 rounded-xl text-white ${
                                            selectedScrubberItem.audit_status === 'error'
                                                ? 'bg-rose-600'
                                                : selectedScrubberItem.audit_status === 'warning'
                                                ? 'bg-amber-500'
                                                : 'bg-emerald-600'
                                        }`}
                                    >
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">
                                            ผลการตรวจสอบเคส: {selectedScrubberItem.vn || selectedScrubberItem.an}
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            {selectedScrubberItem.patient_name} (HN: {selectedScrubberItem.hn})
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedScrubberItem(null)}
                                    className="p-2 hover:bg-slate-200 text-slate-500 rounded-xl transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Drawer Body */}
                            <div className="p-6 space-y-6">
                                {/* Case Metadata Card */}
                                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">วันที่รับบริการ:</span>
                                        <span className="font-semibold text-slate-700">
                                            {selectedScrubberItem.visit_date || selectedScrubberItem.dchdate}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">สิทธิการรักษา:</span>
                                        <span className="font-semibold text-slate-700">
                                            {selectedScrubberItem.pttype_name} ({selectedScrubberItem.pttype})
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">โรคหลัก (Principal Dx):</span>
                                        <span className="font-bold font-mono text-slate-800">
                                            {selectedScrubberItem.pdx || 'ไม่ได้ลงรหัส'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">ยอดเรียกเก็บสุทธิ:</span>
                                        <span className="font-bold text-slate-800 font-mono">
                                            {formatMoney(selectedScrubberItem.claim_amount)}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">EDC / Auth Code:</span>
                                        <span className="font-bold font-mono text-emerald-700">
                                            {selectedScrubberItem.auth_code || 'ไม่มีเลขอนุมัติ'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">ที่มาของเลขสิทธิ:</span>
                                        <span className="font-medium text-slate-600">
                                            {selectedScrubberItem.auth_source || '-'}
                                        </span>
                                    </div>
                                </div>

                                {/* Findings List */}
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                                        <span>รายการข้อผิดพลาดและการตรวจสอบ ({selectedScrubberItem.findings.length})</span>
                                    </h4>

                                    {selectedScrubberItem.findings.length === 0 ? (
                                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center text-emerald-800 text-xs">
                                            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                                            <div className="font-bold">เคสนี้ข้อมูลสมบูรณ์ 100%</div>
                                            <div className="text-emerald-700 mt-1">
                                                ไม่พบข้อผิดพลาดหรือรหัสโรคกำกวม พร้อมส่งออกเพื่อเบิกจ่าย
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {selectedScrubberItem.findings.map((f, i) => (
                                                <div
                                                    key={i}
                                                    className={`p-4 rounded-2xl border ${
                                                        f.severity === 'error'
                                                            ? 'bg-rose-50/50 border-rose-200 text-rose-900'
                                                            : 'bg-amber-50/50 border-amber-200 text-amber-900'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-bold text-xs flex items-center gap-1.5">
                                                            {f.severity === 'error' ? (
                                                                <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                                                            ) : (
                                                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                                            )}
                                                            {f.rule_name}
                                                        </span>
                                                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/80 border border-slate-200">
                                                            {f.rule_code}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs mt-1 text-slate-700">{f.message}</p>
                                                    {f.fix_instruction && (
                                                        <div className="mt-2 pt-2 border-t border-slate-200/50 text-xs text-slate-600 flex items-start gap-1">
                                                            <span className="font-bold text-slate-800 shrink-0">วิธีแก้ไข:</span>
                                                            <span>{f.fix_instruction}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Drawer Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
                            <button
                                type="button"
                                onClick={() => setSelectedScrubberItem(null)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition"
                            >
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Slide-over Inspection Drawer for NED Item (Tab 2) */}
            {selectedNedItem && (
                <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end transition-opacity">
                    <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
                        <div>
                            {/* Drawer Header */}
                            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`p-2 rounded-xl text-white ${
                                            !selectedNedItem.has_reason ? 'bg-rose-600' : 'bg-emerald-600'
                                        }`}
                                    >
                                        <Pill className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">
                                            ยานอกบัญชี (NED): {selectedNedItem.drug_name}
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            {selectedNedItem.patient_name} (HN: {selectedNedItem.hn}) | VN/AN: {selectedNedItem.vn || selectedNedItem.an}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedNedItem(null)}
                                    className="p-2 hover:bg-slate-200 text-slate-500 rounded-xl transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Drawer Body */}
                            <div className="p-6 space-y-6">
                                {/* NED Status Alert Card */}
                                {!selectedNedItem.has_reason ? (
                                    <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-rose-900 text-xs">
                                        <div className="flex items-center gap-2 font-bold text-rose-800 mb-1">
                                            <AlertCircle className="w-4 h-4 text-rose-600" />
                                            <span>ยังไม่มีการบันทึกเหตุผลการใช้ยานอกบัญชีใน HOSxP</span>
                                        </div>
                                        <p className="text-rose-700 leading-relaxed">
                                            การสั่งใช้ยานอกบัญชีหลักแห่งชาติ (NED) สำหรับผู้ป่วยสิทธิเบิกจ่ายตรง (OFC, LGO ฯลฯ)
                                            ต้องระบุเหตุผลความจำเป็นทางการแพทย์ (รหัส EA–EF) มิฉะนั้นจะถูกปฏิเสธการจ่าย (C-Deny 565)
                                        </p>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 text-xs">
                                        <div className="flex items-center gap-2 font-bold text-emerald-800 mb-1">
                                            <Check className="w-4 h-4 text-emerald-600" />
                                            <span>บันทึกเหตุผลความจำเป็นแล้ว: {selectedNedItem.reason_code}</span>
                                        </div>
                                        <p className="text-emerald-700">{selectedNedItem.reason_display}</p>
                                    </div>
                                )}

                                {/* Drug & Prescription Metadata */}
                                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">รหัสยา (icode):</span>
                                        <span className="font-bold font-mono text-slate-800">{selectedNedItem.icode}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">รหัส TMT 24 หลัก:</span>
                                        <span className="font-mono text-slate-700 font-semibold">{selectedNedItem.tmt_code || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">จำนวนที่สั่งใช้:</span>
                                        <span className="font-bold text-slate-800">
                                            {selectedNedItem.qty} {selectedNedItem.units}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">ยอดเงินรวม:</span>
                                        <span className="font-bold font-mono text-emerald-700 text-sm">
                                            {formatMoney(selectedNedItem.sum_price)}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">แพทย์ผู้สั่งจ่าย:</span>
                                        <span className="font-semibold text-slate-800">{selectedNedItem.doctor_name}</span>
                                        <span className="text-slate-400 font-mono text-[10px] block">รหัส: {selectedNedItem.doctor_code}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">แผนก/ห้องตรวจ:</span>
                                        <span className="font-medium text-slate-700">{selectedNedItem.department}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">สิทธิการรักษา:</span>
                                        <span className="font-medium text-slate-700">{selectedNedItem.pttype_name} ({selectedNedItem.pttype})</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">สถานะการชำระ (Paidst):</span>
                                        <span className="font-medium text-slate-700">{selectedNedItem.paidst || '-'}</span>
                                    </div>
                                </div>

                                {/* Guidance Box: How to fix in HOSxP */}
                                <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-200/80 text-xs text-indigo-950">
                                    <div className="font-bold text-indigo-900 mb-2 flex items-center gap-1.5">
                                        <Building2 className="w-4 h-4 text-indigo-600" />
                                        <span>แนวทางการบันทึกเหตุผลยานอกบัญชีใน HOSxP:</span>
                                    </div>
                                    <ol className="list-decimal list-inside space-y-1 text-slate-700">
                                        <li>เปิดโปรแกรม HOSxP &gt; เข้าเมนูห้องตรวจแพทย์ หรือ ห้องจ่ายยา</li>
                                        <li>ค้นหาผู้ป่วยด้วย VN/AN หรือ HN ดังกล่าว</li>
                                        <li>ในหน้ารายการยา ให้เลือกรายการยา <strong className="text-rose-700">{selectedNedItem.drug_name}</strong></li>
                                        <li>คลิกบันทึก <strong>"เหตุผลการใช้ยานอกบัญชี (NED)"</strong> แล้วเลือกรหัสความจำเป็น:</li>
                                    </ol>

                                    <div className="mt-3 grid grid-cols-1 gap-1 text-[11px] text-slate-600 pl-2 border-l-2 border-indigo-300">
                                        <div><strong className="text-indigo-900 font-mono">EA:</strong> แพ้ยาหรือเกิดอาการไม่พึงประสงค์จากยาในบัญชีฯ</div>
                                        <div><strong className="text-indigo-900 font-mono">EB:</strong> ใช้ยาในบัญชีฯ แล้วไม่บรรลุเป้าหมายการรักษา</div>
                                        <div><strong className="text-indigo-900 font-mono">EC:</strong> ไม่มีกลุ่มยาในบัญชีฯ ที่ใช้รักษาโรคนี้ได้</div>
                                        <div><strong className="text-indigo-900 font-mono">ED:</strong> ผู้ป่วยมีข้อห้ามใช้ยาในบัญชียาหลักแห่งชาติ</div>
                                        <div><strong className="text-indigo-900 font-mono">EE:</strong> ยาในบัญชีฯ มีราคาสูงกว่ายานอกบัญชีฯ</div>
                                        <div><strong className="text-indigo-900 font-mono">EF:</strong> มีข้อจำกัดการใช้ยาในบัญชีฯ (เช่น กลืนลำบาก)</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Drawer Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
                            <button
                                type="button"
                                onClick={() => setSelectedNedItem(null)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition"
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
