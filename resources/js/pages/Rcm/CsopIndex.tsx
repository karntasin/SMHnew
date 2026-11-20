import React, { useState } from 'react';
import RcmLayout from './RcmLayout';
import { router } from '@inertiajs/react';
import { ThaiDateRangePicker } from '@/components/date-range-picker';
import {
    Pill,
    Search,
    FileSpreadsheet,
    FileText,
    Download,
    Eye,
    CheckCircle2,
    AlertOctagon,
    AlertTriangle,
    X,
    RefreshCw,
    Layers,
    CreditCard,
    Scale,
    HelpCircle,
    ArrowUpRight,
    Building2,
} from 'lucide-react';

interface RxItem {
    icode: string;
    drug_name: string;
    units: string;
    tmt_code: string;
    ed_ned: 'ED' | 'NED';
    qty: number;
    unitprice: number;
    sum_price: number;
    paidst: string;
    ned_reason: string;
    usage: string;
}

interface CsopItem {
    vn: string;
    hn: string;
    cid: string;
    patient_name: string;
    visit_date: string;
    visit_time: string;
    pdx: string;
    pttype: string;
    pttype_name: string;
    drug: number;
    drug_total: number;
    artificial_organ: number;
    service_charge: number;
    total: number;
    total_amount: number;
    payment: number;
    paid_amount: number;
    debt: number;
    claim_amount: number;
    no_finance_number?: string;
    auth_code: string;
    auth_source?: string;
    station?: string;
    department: string;
    audit_status: 'pass' | 'warning' | 'error';
    findings_count: number;
}

interface CsopIndexProps {
    filters: {
        start_date: string;
        end_date: string;
        scheme?: string;
        only_claimable?: boolean;
        service_scope?: string;
    };
    items: CsopItem[];
    summary: {
        total_cases: number;
        total_claim_amount: number;
        total_drug_amount: number;
        total_artificial_organ?: number;
        total_service_charge?: number;
        total_income: number;
        total_paid_amount: number;
        hemo_cases?: number;
        hemo_amount?: number;
        pure_cash_cases?: number;
        pure_cash_amount?: number;
        service_scope?: string;
        displayed_cases?: number;
        clean_cases: number;
        warning_cases: number;
        error_cases: number;
        clean_claim_rate: number;
        rep_cases?: number;
        rep_claim?: number;
        unclaimed_cases?: number;
        diff_claim_amount?: number;
        c_deny_amount?: number;
    };
    hosxp_ready: boolean;
}

export default function CsopIndex({ filters, items, summary, hosxp_ready }: CsopIndexProps) {
    const [startDate, setStartDate] = useState(filters.start_date);
    const [endDate, setEndDate] = useState(filters.end_date);
    const [scheme, setScheme] = useState<string>(filters.scheme || 'cgd');
    const [onlyClaimable, setOnlyClaimable] = useState<boolean>(filters.only_claimable !== false);
    const [serviceScope, setServiceScope] = useState<string>(filters.service_scope || 'general');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedVn, setSelectedVn] = useState<string | null>(null);
    const [rxList, setRxList] = useState<RxItem[]>([]);
    const [loadingRx, setLoadingRx] = useState(false);
    const [selectedCases, setSelectedCases] = useState<string[]>([]);
    const [varianceModalOpen, setVarianceModalOpen] = useState(false);

    const navigateTo = (sDate: string, eDate: string, sch: string, claimable: boolean, scope: string) => {
        router.get(
            route('rcm.csop.index'),
            {
                start_date: sDate,
                end_date: eDate,
                scheme: sch,
                only_claimable: claimable ? 1 : 0,
                service_scope: scope,
            },
            { preserveState: true }
        );
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        navigateTo(startDate, endDate, scheme, onlyClaimable, serviceScope);
    };

    const handleSchemeChange = (newScheme: string) => {
        setScheme(newScheme);
        navigateTo(startDate, endDate, newScheme, onlyClaimable, serviceScope);
    };

    const handleServiceScopeChange = (newScope: string) => {
        setServiceScope(newScope);
        navigateTo(startDate, endDate, scheme, onlyClaimable, newScope);
    };

    const handleViewRx = async (vn: string) => {
        setSelectedVn(vn);
        setLoadingRx(true);
        try {
            const res = await fetch(route('rcm.csop.show', { vn }));
            const data = await res.json();
            setRxList(data.items || []);
        } catch (err) {
            console.error('Failed to load RX items', err);
        } finally {
            setLoadingRx(false);
        }
    };

    const getFiscalYear = (dateStr: string): number => {
        if (!dateStr) return 2570;
        const d = new Date(dateStr);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        return m >= 10 ? y + 544 : y + 543;
    };

    const toggleSelectAll = () => {
        if (selectedCases.length === filteredItems.length) {
            setSelectedCases([]);
        } else {
            setSelectedCases(filteredItems.map((i) => i.vn));
        }
    };

    const toggleSelectCase = (vn: string) => {
        if (selectedCases.includes(vn)) {
            setSelectedCases(selectedCases.filter((id) => id !== vn));
        } else {
            setSelectedCases([...selectedCases, vn]);
        }
    };

    const filteredItems = items.filter((item) => {
        if (searchTerm.trim() === '') return true;
        const term = searchTerm.toLowerCase();
        return (
            item.vn.toLowerCase().includes(term) ||
            item.hn.toLowerCase().includes(term) ||
            item.patient_name.toLowerCase().includes(term) ||
            (item.auth_code && item.auth_code.toLowerCase().includes(term))
        );
    });

    const formatMoney = (val: number) =>
        new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(val);

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
        } else if (type === 'fiscal_2569') {
            s = '2025-10-01';
            e = '2026-09-30';
        } else if (type === 'fiscal_2568') {
            s = '2024-10-01';
            e = '2025-09-30';
        }

        setStartDate(s);
        setEndDate(e);
        navigateTo(s, e, scheme, onlyClaimable, serviceScope);
    };

    const schemeTabs = [
        { key: 'cgd', label: 'กรมบัญชีกลาง (OFC)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
        { key: 'lgo', label: 'อปท. (LGO)', color: 'text-blue-700 bg-blue-50 border-blue-200' },
        { key: 'ucs', label: 'บัตรทอง (สปสช.)', color: 'text-amber-700 bg-amber-50 border-amber-200' },
        { key: 'sss', label: 'ประกันสังคม (SSS)', color: 'text-purple-700 bg-purple-50 border-purple-200' },
        { key: 'all', label: 'ทุกกองทุน', color: 'text-slate-700 bg-slate-100 border-slate-300' },
    ];

    const serviceScopeTabs = [
        { key: 'general', label: 'ผู้ป่วยนอกทั่วไป (CSOP)', desc: 'ไม่รวมไตเทียม & เงินสด' },
        { key: 'hemodialysis', label: '🩺 เฉพาะหน่วยไตเทียม (HD)', desc: 'แยกส่งเบิกไต' },
        { key: 'all', label: 'ทั้งหมด', desc: 'รวมทุกเคส' },
    ];

    return (
        <RcmLayout title="เรียกเก็บ CSOP ผู้ป่วยนอก (OPD Claim)" active="csop">
            {/* Header Filter */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs mb-6 space-y-3">
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

                <form onSubmit={handleSearch} className="flex flex-wrap items-end justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">ช่วงวันที่รับบริการ (พ.ศ.)</label>
                            <ThaiDateRangePicker
                                startDate={startDate}
                                endDate={endDate}
                                onChange={(start, end) => {
                                    setStartDate(start);
                                    setEndDate(end);
                                }}
                                placeholder="เลือกช่วงวันที่รับบริการ (พ.ศ.)"
                                className="min-w-[270px]"
                            />
                        </div>
                        <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-xs transition"
                        >
                            <RefreshCw className="w-4 h-4" /> ดึงข้อมูลผู้ป่วยนอก
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <form method="POST" action={route('rcm.csop.export-data')}>
                            <input
                                type="hidden"
                                name="_token"
                                value={(document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content}
                            />
                            <input type="hidden" name="start_date" value={startDate} />
                            <input type="hidden" name="end_date" value={endDate} />
                            <input type="hidden" name="scheme" value={scheme} />
                            <input type="hidden" name="service_scope" value={serviceScope} />
                            {selectedCases.map((vn) => (
                                <input key={vn} type="hidden" name="vns[]" value={vn} />
                            ))}
                            <button
                                type="submit"
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                            >
                                <Download className="w-4 h-4" /> ส่งออก CSOP XML ({selectedCases.length || items.length})
                            </button>
                        </form>
                        <a
                            href={route('rcm.csop.summary-excel', { start_date: startDate, end_date: endDate, scheme, service_scope: serviceScope })}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition"
                            target="_blank"
                            rel="noreferrer"
                        >
                            <FileSpreadsheet className="w-4 h-4" /> สรุป Excel
                        </a>
                        <a
                            href={route('rcm.csop.summary-pdf', { start_date: startDate, end_date: endDate, scheme, service_scope: serviceScope })}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition"
                            target="_blank"
                            rel="noreferrer"
                        >
                            <FileText className="w-4 h-4" /> สรุป PDF
                        </a>
                    </div>
                </form>

                {/* Scheme Tabs & Claimable Filter */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
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
                                        ? `${s.color} ring-2 ring-teal-500/30 shadow-xs font-bold`
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>

                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer bg-slate-50 hover:bg-teal-50/60 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-teal-200 transition">
                        <input
                            type="checkbox"
                            checked={onlyClaimable}
                            onChange={(e) => {
                                const next = e.target.checked;
                                setOnlyClaimable(next);
                                navigateTo(startDate, endDate, scheme, next, serviceScope);
                            }}
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                        />
                        <span>เฉพาะเคสที่มีสิทธิตั้งเบิก (UC Money &gt; 0)</span>
                    </label>
                </div>

                {/* Service Scope Tabs (แยกผู้ป่วยไตเทียม & เงินสด) */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
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
                    {serviceScope === 'general' && (
                        <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-medium ml-1">
                            ✓ คัดแยกเคสเงินสด 100%, ผู้ป่วยไตเทียม, และผู้ป่วยในออกแล้ว
                        </span>
                    )}
                </div>
            </div>

            {/* Reconciliation Bridge & Variance Breakdown Banner */}
            <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-sky-50 border border-teal-200/80 rounded-2xl p-4 mb-6 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-teal-600 text-white rounded-xl shadow-xs">
                            <Scale className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-800">
                                    การคัดแยกข้อมูล CSOP (OPD): {serviceScope === 'general' ? 'ผู้ป่วยนอกทั่วไป (Clean Claim)' : serviceScope === 'hemodialysis' ? 'เฉพาะหน่วยไตเทียม (HD)' : 'รวมทุกกลุ่มบริการ'}
                                </h3>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                                    ไม่รวมเงินสด & ไม่รวมผู้ป่วยใน
                                </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span>🩺 แยกไตเทียม: <strong>{summary.hemo_cases?.toLocaleString() || 0}</strong> เคส ({formatMoney(summary.hemo_amount || 0)})</span>
                                <span>💵 เงินสดจ่ายเองหน้าเคาน์เตอร์: <strong>{formatMoney(summary.pure_cash_amount || summary.total_paid_amount || 0)}</strong></span>
                                {summary.unclaimed_cases !== undefined && summary.unclaimed_cases > 0 && (
                                    <span className="text-amber-700 font-semibold">⏳ ค้างส่งเบิกใน HOSxP: <strong>{summary.unclaimed_cases}</strong> เคส</span>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setVarianceModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs transition"
                        >
                            <HelpCircle className="w-4 h-4 text-teal-600" /> ทำไมยอดถึงต่างกัน?
                        </button>

                        <a
                            href={route('rcm.monthly.index', {
                                budget_year: getFiscalYear(startDate),
                                scheme: scheme === 'cgd' ? 'cgd' : scheme === 'lgo' ? 'lgo' : 'all',
                                claim_type: 'opd',
                                service_scope: serviceScope,
                            })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                        >
                            <ArrowUpRight className="w-4 h-4" /> ดูเปรียบเทียบ 3 ฝ่าย (ปีงบ {getFiscalYear(startDate)})
                        </a>
                    </div>
                </div>
            </div>

            {/* Quick KPI Bar (6 Cards ตามโครงสร้าง Hosxp จริง) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-xs text-slate-500">จำนวนเคส (Cases)</span>
                    <div className="text-lg font-bold text-slate-800 mt-0.5">
                        {summary.total_cases?.toLocaleString()} เคส
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                        {summary.displayed_cases && summary.displayed_cases < summary.total_cases
                            ? `(ในตาราง ${summary.displayed_cases.toLocaleString()})`
                            : 'ครบ 100%'}
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-xs text-slate-500">ค่ายารวม (Drug)</span>
                    <div className="text-lg font-bold text-emerald-600 mt-0.5">
                        {formatMoney(summary.total_drug_amount || 0)}
                    </div>
                    <div className="text-[10px] text-emerald-700/80 mt-0.5">
                        inc03 + inc17
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-xs text-slate-500">อวัยวะเทียม (Organ)</span>
                    <div className="text-lg font-bold text-indigo-600 mt-0.5">
                        {formatMoney(summary.total_artificial_organ || 0)}
                    </div>
                    <div className="text-[10px] text-indigo-700/80 mt-0.5">
                        inc02
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-xs text-slate-500">ค่าบริการ (Service)</span>
                    <div className="text-lg font-bold text-sky-600 mt-0.5">
                        {formatMoney(summary.total_service_charge || 0)}
                    </div>
                    <div className="text-[10px] text-sky-700/80 mt-0.5">
                        inc01 + inc04..16
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-xs text-slate-500">ยอดรวมทั้งหมด (Total)</span>
                    <div className="text-lg font-bold text-slate-800 mt-0.5">
                        {formatMoney(summary.total_income || 0)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                        ชำระเอง {formatMoney(summary.total_paid_amount || 0)}
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-teal-200 bg-teal-50/30 shadow-xs">
                    <span className="text-xs font-semibold text-teal-800">ลูกหนี้สิทธิ (Debt)</span>
                    <div className="text-lg font-bold text-teal-600 mt-0.5">
                        {formatMoney(summary.total_claim_amount)}
                    </div>
                    <div className="text-[10px] text-teal-700 mt-0.5">
                        Clean Rate {summary.clean_claim_rate}%
                    </div>
                </div>
            </div>

            {/* Banner if displayed cases < total cases */}
            {summary.displayed_cases && summary.total_cases > summary.displayed_cases && (
                <div className="mb-4 px-4 py-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs flex items-center justify-between">
                    <div>
                        <span className="font-semibold">💡 ข้อมูลในตาราง:</span> แสดงรายการ {summary.displayed_cases.toLocaleString()} เคสล่าสุด เพื่อความรวดเร็วในการเปิดหน้าจอ — ข้อมูลสรุปและยอดรวมด้านบนคำนวณจากผู้ป่วยจริงทั้งหมด {summary.total_cases.toLocaleString()} เคส 100%
                    </div>
                </div>
            )}

            {/* Main Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden mb-12">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="relative w-80">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                            type="text"
                            placeholder="ค้นหา VN, HN, ชื่อผู้ป่วย, เลข EDC..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                        />
                    </div>
                    <div className="text-xs text-slate-500">
                        เลือก {selectedCases.length} จาก {filteredItems.length} เคส
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                <th className="py-3 px-2 w-8 text-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedCases.length === filteredItems.length && filteredItems.length > 0}
                                        onChange={toggleSelectAll}
                                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                    />
                                </th>
                                <th className="py-3 px-2">VN</th>
                                <th className="py-3 px-2">HN & ชื่อผู้ป่วย</th>
                                <th className="py-3 px-2">วันที่ / เวลา</th>
                                <th className="py-3 px-2">แผนก</th>
                                <th className="py-3 px-2">สิทธิ</th>
                                <th className="py-3 px-2 text-right">ค่ายา (Drug)</th>
                                <th className="py-3 px-2 text-right">อวัยวะ (Organ)</th>
                                <th className="py-3 px-2 text-right">บริการ (Service)</th>
                                <th className="py-3 px-2 text-right">รวม (Total)</th>
                                <th className="py-3 px-2 text-right">ชำระ (Payment)</th>
                                <th className="py-3 px-2 text-right">ลูกหนี้ (Debt)</th>
                                <th className="py-3 px-2 text-center">ใบเสร็จ</th>
                                <th className="py-3 px-2 text-center">EDC / Auth</th>
                                <th className="py-3 px-2 text-center">Audit</th>
                                <th className="py-3 px-2 text-center">ตรวจ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={16} className="py-10 text-center text-slate-400">
                                        ไม่พบข้อมูลใบสั่งยาผู้ป่วยนอก CSOP ในกองทุนนี้
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item) => (
                                    <tr key={item.vn} className="hover:bg-slate-50/80 transition">
                                        <td className="py-2.5 px-2 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedCases.includes(item.vn)}
                                                onChange={() => toggleSelectCase(item.vn)}
                                                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                            />
                                        </td>
                                        <td className="py-2.5 px-2 font-mono font-medium text-slate-800 text-[11px]">{item.vn}</td>
                                        <td className="py-2.5 px-2">
                                            <div className="font-medium text-slate-800">{item.patient_name}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">HN: {item.hn}</div>
                                        </td>
                                        <td className="py-2.5 px-2 text-[11px] text-slate-600 whitespace-nowrap">
                                            {item.visit_date} {item.visit_time?.substring(0, 5)}
                                        </td>
                                        <td className="py-2.5 px-2 text-[11px] text-slate-600 truncate max-w-[120px]" title={item.department}>
                                            {item.department || '-'}
                                        </td>
                                        <td className="py-2.5 px-2 text-[11px] font-medium text-slate-700 truncate max-w-[110px]" title={item.pttype_name || item.pttype}>
                                            {item.pttype_name || item.pttype}
                                        </td>
                                        <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                                            {formatMoney(item.drug || item.drug_total)}
                                        </td>
                                        <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                                            {formatMoney(item.artificial_organ || 0)}
                                        </td>
                                        <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                                            {formatMoney(item.service_charge || 0)}
                                        </td>
                                        <td className="py-2.5 px-2 text-right font-mono font-semibold text-slate-800">
                                            {formatMoney(item.total || item.total_amount)}
                                        </td>
                                        <td className="py-2.5 px-2 text-right font-mono text-amber-600">
                                            {(item.payment || item.paid_amount || 0) > 0 ? formatMoney(item.payment || item.paid_amount) : '-'}
                                        </td>
                                        <td className="py-2.5 px-2 text-right font-mono font-bold text-teal-600">
                                            {formatMoney(item.debt || item.claim_amount)}
                                        </td>
                                        <td className="py-2.5 px-2 text-center">
                                            {item.no_finance_number === '*' ? (
                                                <span className="inline-block px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold text-xs" title="ยังไม่มีเลขใบเสร็จรับเงิน">
                                                    *
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    เรียบร้อย
                                                </span>
                                            )}
                                        </td>
                                        {/* EDC Auth Code & Source Badge */}
                                        <td className="py-2.5 px-2 text-center font-mono">
                                            {item.auth_code ? (
                                                <div>
                                                    <span className="font-bold text-slate-800 text-[11px]">{item.auth_code}</span>
                                                    {item.auth_source && (
                                                        <div className="text-[9px] text-teal-700 bg-teal-50 px-1 py-0.2 rounded inline-block mt-0.5">
                                                            {item.auth_source}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-rose-500 font-semibold text-[10px] flex items-center justify-center gap-0.5">
                                                    <CreditCard className="w-2.5 h-2.5" /> ไม่มี
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-2.5 px-2 text-center">
                                            {item.audit_status === 'pass' && (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500 inline-block" />
                                            )}
                                            {item.audit_status === 'warning' && (
                                                <AlertTriangle className="w-4 h-4 text-amber-500 inline-block" />
                                            )}
                                            {item.audit_status === 'error' && (
                                                <AlertOctagon className="w-4 h-4 text-rose-500 inline-block animate-pulse" />
                                            )}
                                        </td>
                                        <td className="py-2.5 px-2 text-center">
                                            <button
                                                type="button"
                                                onClick={() => handleViewRx(item.vn)}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition"
                                            >
                                                <Eye className="w-3 h-3" /> ตรวจ
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Rx Items */}
            {selectedVn && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-2">
                                <Pill className="w-5 h-5 text-teal-600" />
                                <h3 className="font-bold text-slate-800">
                                    รายการยาในใบสั่งยา VN: {selectedVn}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedVn(null)}
                                className="p-1.5 hover:bg-slate-200 text-slate-400 rounded-lg transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1">
                            {loadingRx ? (
                                <div className="py-12 text-center text-slate-400">กำลังโหลดรายการยาจาก HOSxP...</div>
                            ) : rxList.length === 0 ? (
                                <div className="py-12 text-center text-slate-400">ไม่พบรายการยาใน Visit นี้</div>
                            ) : (
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold">
                                            <th className="py-2.5 px-3">หมวด</th>
                                            <th className="py-2.5 px-3">ชื่อรายการยา</th>
                                            <th className="py-2.5 px-3">รหัส TMT 24 หลัก</th>
                                            <th className="py-2.5 px-3 text-right">จำนวน</th>
                                            <th className="py-2.5 px-3 text-right">รวมเงิน</th>
                                            <th className="py-2.5 px-3">เหตุผล NED</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {rxList.map((rx, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="py-2 px-3">
                                                    <span
                                                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                            rx.ed_ned === 'ED'
                                                                ? 'bg-emerald-100 text-emerald-800'
                                                                : 'bg-rose-100 text-rose-800'
                                                        }`}
                                                    >
                                                        {rx.ed_ned}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-3">
                                                    <div className="font-medium text-slate-800">{rx.drug_name}</div>
                                                    <div className="text-[10px] text-slate-400">{rx.usage}</div>
                                                </td>
                                                <td className="py-2 px-3 font-mono text-[11px]">
                                                    {rx.tmt_code ? (
                                                        <span className="text-slate-700">{rx.tmt_code}</span>
                                                    ) : (
                                                        <span className="text-rose-500 font-bold">ไม่มี TMT</span>
                                                    )}
                                                </td>
                                                <td className="py-2 px-3 text-right font-mono">
                                                    {rx.qty} {rx.units}
                                                </td>
                                                <td className="py-2 px-3 text-right font-mono font-medium">
                                                    {formatMoney(rx.sum_price)}
                                                </td>
                                                <td className="py-2 px-3">
                                                    {rx.ed_ned === 'NED' ? (
                                                        rx.ned_reason ? (
                                                            <span className="text-slate-700 font-medium">
                                                                {rx.ned_reason}
                                                            </span>
                                                        ) : (
                                                            <span className="text-rose-600 font-bold">ยังไม่ระบุ</span>
                                                        )
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setSelectedVn(null)}
                                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition"
                            >
                                ปิด
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Variance Explanation Modal (คำอธิบายส่วนต่าง) */}
            {varianceModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-teal-100 text-teal-800 rounded-2xl">
                                    <HelpCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-800">
                                        คำอธิบายส่วนต่างของข้อมูล (Variance Analysis)
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        ช่วงวันที่ {startDate} ถึง {endDate} | กองทุน {scheme.toUpperCase()}
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

                        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                            {/* Card 1: HOSxP vs REP */}
                            <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-amber-900 flex items-center gap-1.5 text-sm">
                                        1. ส่วนต่างการส่งเบิก (HOSxP vs e-Claim REP)
                                    </h4>
                                    <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                                        ค้างส่งเบิก {summary.unclaimed_cases || 0} เคส
                                    </span>
                                </div>
                                <div className="mt-2 grid grid-cols-2 gap-3 text-slate-700">
                                    <div className="bg-white p-2.5 rounded-xl border border-amber-200/60">
                                        <span className="text-[11px] text-slate-500">ยอดลูกหนี้สิทธิ HOSxP:</span>
                                        <div className="font-bold text-slate-900 text-sm mt-0.5">{formatMoney(summary.total_claim_amount)}</div>
                                        <span className="text-[10px] text-slate-400">จากคนไข้จริง {summary.total_cases?.toLocaleString()} เคส</span>
                                    </div>
                                    <div className="bg-white p-2.5 rounded-xl border border-amber-200/60">
                                        <span className="text-[11px] text-slate-500">ยอดที่ส่งเบิก e-Claim REP:</span>
                                        <div className="font-bold text-slate-900 text-sm mt-0.5">{formatMoney(summary.rep_claim || 0)}</div>
                                        <span className="text-[10px] text-slate-400">ส่งเบิกแล้ว {summary.rep_cases?.toLocaleString() || 0} เคส</span>
                                    </div>
                                </div>
                                <p className="text-amber-900/90 mt-2.5 text-[11.5px] leading-relaxed">
                                    • <strong>สาเหตุที่ยอดต่างกัน:</strong> มีผู้ป่วยมารับบริการใน HOSxP จำนวน {summary.total_cases?.toLocaleString()} เคส แต่ส่งเบิกเข้า e-Claim แล้ว {summary.rep_cases?.toLocaleString() || 0} เคส (ค้างส่งเบิก {summary.unclaimed_cases || 0} เคส) และใน e-Claim อาจมีการปรับราคาตามอัตราจ่ายตรง Fee Schedule ของกรมบัญชีกลาง
                                </p>
                            </div>

                            {/* Card 2: Hemodialysis */}
                            <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/50">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-indigo-900 flex items-center gap-1.5 text-sm">
                                        2. ผู้ป่วยไตเทียม (Hemodialysis - แยกส่งเบิก)
                                    </h4>
                                    <span className="text-xs font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-md">
                                        แยกออก {summary.hemo_cases || 0} เคส
                                    </span>
                                </div>
                                <div className="mt-2 bg-white p-2.5 rounded-xl border border-indigo-200/60 text-slate-700 flex items-center justify-between">
                                    <div>
                                        <span className="text-[11px] text-slate-500">ยอดลูกหนี้ไตเทียมที่คัดแยกออก:</span>
                                        <div className="font-bold text-indigo-700 text-sm mt-0.5">{formatMoney(summary.hemo_amount || 0)}</div>
                                    </div>
                                    <span className="text-[11px] text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg font-medium">
                                        หน่วยไตเทียม (021) / PDx Z49, N185
                                    </span>
                                </div>
                                <p className="text-indigo-900/90 mt-2.5 text-[11.5px] leading-relaxed">
                                    • <strong>สาเหตุที่แยกออก:</strong> หน่วยไตเทียมมีรอบและระบบการส่งเบิกเฉพาะทางของโครงการฟอกไต (HD Clearinghouse) จึงคัดแยกออกจาก CSOP ผู้ป่วยนอกทั่วไป เพื่อไม่ให้ยอดเบิกและสถิติต้นทุนผู้ป่วยนอกซ้ำซ้อน
                                </p>
                            </div>

                            {/* Card 3: Patient Cash */}
                            <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-emerald-900 flex items-center gap-1.5 text-sm">
                                        3. เงินสดคนไข้ / ชำระเอง (Patient Cash & Self-Pay)
                                    </h4>
                                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                                        รับหน้าเคาน์เตอร์ {formatMoney(summary.pure_cash_amount || summary.total_paid_amount || 0)}
                                    </span>
                                </div>
                                <p className="text-emerald-900/90 mt-2.5 text-[11.5px] leading-relaxed">
                                    • <strong>สาเหตุที่ตัดเงินสดออก:</strong> ยอดตั้งเบิก CSOP คิดจากยอดลูกหนี้สิทธิ (<code className="bg-emerald-100 px-1 rounded">uc_money</code>) เท่านั้น ซึ่งหักเงินสดที่คนไข้ร่วมจ่ายหน้าเคาน์เตอร์ออกแล้ว ทำให้ไม่มีเงินสดปนเปื้อนในยอดที่ส่งเบิก e-Claim
                                </p>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <span className="text-slate-500">เปรียบเทียบตามมาตรฐานวงจรรายได้ RCM</span>
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
