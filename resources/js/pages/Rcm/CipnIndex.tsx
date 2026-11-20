import React, { useState } from 'react';
import RcmLayout from './RcmLayout';
import { router } from '@inertiajs/react';
import { ThaiDateRangePicker } from '@/components/date-range-picker';
import {
    BedDouble,
    Search,
    FileSpreadsheet,
    FileText,
    Download,
    CheckCircle2,
    AlertOctagon,
    AlertTriangle,
    RefreshCw,
    Layers,
    X,
} from 'lucide-react';

interface CipnItem {
    an: string;
    hn: string;
    cid: string;
    patient_name: string;
    regdate: string;
    dchdate: string;
    los: number;
    pdx: string;
    pttype: string;
    pttype_name: string;
    total_amount: number;
    paid_amount: number;
    claim_amount: number;
    drg: string;
    mdc: string;
    rw: number;
    adj_rw: number;
    auth_code: string;
    auth_source?: string;
    project_code: string;
    categories16: Record<string, number>;
    audit_status: 'pass' | 'warning' | 'error';
    findings_count: number;
}

interface CipnIndexProps {
    filters: {
        start_date: string;
        end_date: string;
        scheme?: string;
    };
    items: CipnItem[];
    summary: {
        total_cases: number;
        clean_cases: number;
        warning_cases: number;
        error_cases: number;
        clean_claim_rate: number;
        total_claim_amount: number;
    };
    hosxp_ready: boolean;
}

export default function CipnIndex({ filters, items, summary, hosxp_ready }: CipnIndexProps) {
    const [startDate, setStartDate] = useState(filters.start_date);
    const [endDate, setEndDate] = useState(filters.end_date);
    const [scheme, setScheme] = useState<string>(filters.scheme || 'cgd');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItem16, setSelectedItem16] = useState<CipnItem | null>(null);
    const [selectedCases, setSelectedCases] = useState<string[]>([]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('rcm.cipn.index'), { start_date: startDate, end_date: endDate, scheme }, { preserveState: true });
    };

    const handleSchemeChange = (newScheme: string) => {
        setScheme(newScheme);
        router.get(route('rcm.cipn.index'), { start_date: startDate, end_date: endDate, scheme: newScheme }, { preserveState: true });
    };

    const toggleSelectAll = () => {
        if (selectedCases.length === filteredItems.length) {
            setSelectedCases([]);
        } else {
            setSelectedCases(filteredItems.map((i) => i.an));
        }
    };

    const toggleSelectCase = (an: string) => {
        if (selectedCases.includes(an)) {
            setSelectedCases(selectedCases.filter((id) => id !== an));
        } else {
            setSelectedCases([...selectedCases, an]);
        }
    };

    const filteredItems = items.filter((item) => {
        if (searchTerm.trim() === '') return true;
        const term = searchTerm.toLowerCase();
        return (
            item.an.toLowerCase().includes(term) ||
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

        if (type === 'today') {
            const todayStr = formatDate(now);
            setStartDate(todayStr);
            setEndDate(todayStr);
            router.get(route('rcm.cipn.index'), { start_date: todayStr, end_date: todayStr, scheme }, { preserveState: true });
        } else if (type === 'this_month') {
            const s = formatDate(new Date(y, m, 1));
            const e = formatDate(new Date(y, m + 1, 0));
            setStartDate(s);
            setEndDate(e);
            router.get(route('rcm.cipn.index'), { start_date: s, end_date: e, scheme }, { preserveState: true });
        } else if (type === 'last_month') {
            const s = formatDate(new Date(y, m - 1, 1));
            const e = formatDate(new Date(y, m, 0));
            setStartDate(s);
            setEndDate(e);
            router.get(route('rcm.cipn.index'), { start_date: s, end_date: e, scheme }, { preserveState: true });
        } else if (type === 'last_3_months') {
            const s = formatDate(new Date(y, m - 2, 1));
            const e = formatDate(new Date(y, m + 1, 0));
            setStartDate(s);
            setEndDate(e);
            router.get(route('rcm.cipn.index'), { start_date: s, end_date: e, scheme }, { preserveState: true });
        } else if (type === 'fiscal_2570') {
            setStartDate('2026-10-01');
            setEndDate('2027-09-30');
            router.get(route('rcm.cipn.index'), { start_date: '2026-10-01', end_date: '2027-09-30', scheme }, { preserveState: true });
        } else if (type === 'fiscal_2569') {
            setStartDate('2025-10-01');
            setEndDate('2026-09-30');
            router.get(route('rcm.cipn.index'), { start_date: '2025-10-01', end_date: '2026-09-30', scheme }, { preserveState: true });
        } else if (type === 'fiscal_2568') {
            setStartDate('2024-10-01');
            setEndDate('2025-09-30');
            router.get(route('rcm.cipn.index'), { start_date: '2024-10-01', end_date: '2025-09-30', scheme }, { preserveState: true });
        }
    };

    const schemeTabs = [
        { key: 'cgd', label: 'กรมบัญชีกลาง (OFC)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
        { key: 'lgo', label: 'อปท. (LGO)', color: 'text-blue-700 bg-blue-50 border-blue-200' },
        { key: 'ucs', label: 'บัตรทอง DRG (สปสช.)', color: 'text-amber-700 bg-amber-50 border-amber-200' },
        { key: 'sss', label: 'ประกันสังคม (SSS)', color: 'text-purple-700 bg-purple-50 border-purple-200' },
        { key: 'all', label: 'ทุกกองทุน', color: 'text-slate-700 bg-slate-100 border-slate-300' },
    ];

    const category16Labels: Record<string, string> = {
        cat01_room: '1. ค่าห้องและค่าอาหาร',
        cat02_prosthesis: '2. ค่าอวัยวะเทียมและอุปกรณ์',
        cat03_drug_in: '3. ค่ายาและสารอาหารใน รพ.',
        cat04_drug_home: '4. ค่ายากลับบ้าน',
        cat05_supply: '5. ค่าเวชภัณฑ์ที่มิใช่ยา',
        cat06_blood: '6. ค่าบริการโลหิต',
        cat07_lab: '7. ค่าตรวจทางเทคนิคการแพทย์ (Lab)',
        cat08_xray: '8. ค่าตรวจวินิจฉัยทางรังสี (X-ray)',
        cat09_special_diag: '9. ค่าตรวจวินิจฉัยวิธีพิเศษ',
        cat10_equipment: '10. ค่าอุปกรณ์เครื่องมือแพทย์',
        cat11_procedure: '11. ค่าทำหัตถการและวิสัญญี',
        cat12_nursing: '12. ค่าบริการทางการพยาบาล',
        cat13_dental: '13. ค่าบริการทางทันตกรรม',
        cat14_physical: '14. ค่าบริการกายภาพบำบัด',
        cat15_alternative: '15. ค่าบริการฝังเข็ม/แพทย์ทางเลือก',
        cat16_other: '16. ค่าบริการอื่นๆ',
    };

    return (
        <RcmLayout title="เรียกเก็บ CIPN ผู้ป่วยใน (IPD Claim)" active="cipn">
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
                            <label className="block text-xs font-semibold text-slate-500 mb-1">ช่วงวันจำหน่าย (พ.ศ.)</label>
                            <ThaiDateRangePicker
                                startDate={startDate}
                                endDate={endDate}
                                onChange={(start, end) => {
                                    setStartDate(start);
                                    setEndDate(end);
                                }}
                                placeholder="เลือกช่วงวันจำหน่าย (พ.ศ.)"
                                className="min-w-[270px]"
                            />
                        </div>
                        <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs transition"
                        >
                            <RefreshCw className="w-4 h-4" /> ดึงข้อมูลผู้ป่วยใน
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <form method="POST" action={route('rcm.cipn.export-data')}>
                            <input
                                type="hidden"
                                name="_token"
                                value={(document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content}
                            />
                            <input type="hidden" name="start_date" value={startDate} />
                            <input type="hidden" name="end_date" value={endDate} />
                            <input type="hidden" name="scheme" value={scheme} />
                            {selectedCases.map((an) => (
                                <input key={an} type="hidden" name="ans[]" value={an} />
                            ))}
                            <button
                                type="submit"
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                            >
                                <Download className="w-4 h-4" /> ส่งออก CIPN XML ({selectedCases.length || items.length})
                            </button>
                        </form>
                        <a
                            href={route('rcm.cipn.summary-excel', { start_date: startDate, end_date: endDate, scheme })}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition"
                            target="_blank"
                            rel="noreferrer"
                        >
                            <FileSpreadsheet className="w-4 h-4" /> สรุป Excel
                        </a>
                        <a
                            href={route('rcm.cipn.summary-pdf', { start_date: startDate, end_date: endDate, scheme })}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition"
                            target="_blank"
                            rel="noreferrer"
                        >
                            <FileText className="w-4 h-4" /> สรุป PDF
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
                                    ? `${s.color} ring-2 ring-indigo-500/30 shadow-xs font-bold`
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Quick KPI Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500">จำนวนเคสผู้ป่วยในจำหน่าย</span>
                    <div className="text-xl font-bold text-slate-800">{summary.total_cases} เคส</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500">ยอดตั้งเบิกผู้ป่วยในรวม</span>
                    <div className="text-xl font-bold text-indigo-600">
                        {formatMoney(summary.total_claim_amount)}
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500">อัตราผ่านการ Audit (Clean Rate)</span>
                    <div className="text-xl font-bold text-emerald-600">
                        {summary.clean_claim_rate}%
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden mb-12">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="relative w-80">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                            type="text"
                            placeholder="ค้นหา AN, HN, ชื่อผู้ป่วย, เลข Auth..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                        />
                    </div>
                    <div className="text-xs text-slate-500">
                        เลือก {selectedCases.length} จาก {filteredItems.length} เคส
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-500">
                                <th className="py-3 px-4 w-10 text-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedCases.length === filteredItems.length && filteredItems.length > 0}
                                        onChange={toggleSelectAll}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                </th>
                                <th className="py-3 px-4">AN</th>
                                <th className="py-3 px-4">HN & ชื่อผู้ป่วย</th>
                                <th className="py-3 px-4">วันจำหน่าย (LOS)</th>
                                <th className="py-3 px-4 font-mono">โรคหลัก (Pdx)</th>
                                <th className="py-3 px-4 text-center font-mono">DRG / AdjRW</th>
                                <th className="py-3 px-4 text-right">ยอดตั้งเบิก</th>
                                <th className="py-3 px-4 text-center">Auth / Project</th>
                                <th className="py-3 px-4 text-center">Audit</th>
                                <th className="py-3 px-4 text-center">16 หมวด</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="py-10 text-center text-slate-400">
                                        ไม่พบข้อมูลผู้ป่วยใน CIPN ในกองทุนนี้
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item) => (
                                    <tr key={item.an} className="hover:bg-slate-50/80 transition">
                                        <td className="py-3 px-4 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedCases.includes(item.an)}
                                                onChange={() => toggleSelectCase(item.an)}
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </td>
                                        <td className="py-3 px-4 font-mono font-medium text-slate-800">{item.an}</td>
                                        <td className="py-3 px-4">
                                            <div className="font-medium text-slate-800">{item.patient_name}</div>
                                            <div className="text-xs text-slate-400 font-mono">HN: {item.hn}</div>
                                        </td>
                                        <td className="py-3 px-4 text-xs text-slate-600">
                                            {item.dchdate} ({item.los} วัน)
                                        </td>
                                        <td className="py-3 px-4 font-mono font-bold text-slate-800">{item.pdx || '-'}</td>
                                        <td className="py-3 px-4 text-center text-xs font-mono">
                                            <div className="font-semibold text-slate-800">{item.drg || '-'}</div>
                                            <div className="text-slate-400">AdjRW: {item.adj_rw?.toFixed(4) || '0.0000'}</div>
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono font-bold text-indigo-600">
                                            {formatMoney(item.claim_amount)}
                                        </td>
                                        <td className="py-3 px-4 text-center text-xs font-mono">
                                            {item.auth_code ? (
                                                <div>
                                                    <span className="text-slate-800 font-bold">{item.auth_code}</span>
                                                    {item.auth_source && (
                                                        <div className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded inline-block mt-0.5">
                                                            {item.auth_source}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-rose-500 font-semibold">ไม่มี Auth</span>
                                            )}
                                            {item.project_code && (
                                                <div className="text-indigo-600 font-bold">{item.project_code}</div>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {item.audit_status === 'pass' && (
                                                <CheckCircle2 className="w-5 h-5 text-emerald-500 inline-block" />
                                            )}
                                            {item.audit_status === 'warning' && (
                                                <AlertTriangle className="w-5 h-5 text-amber-500 inline-block" />
                                            )}
                                            {item.audit_status === 'error' && (
                                                <AlertOctagon className="w-5 h-5 text-rose-500 inline-block animate-pulse" />
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedItem16(item)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                                            >
                                                <Layers className="w-3.5 h-3.5" /> ดู 16 หมวด
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal 16 หมวดค่ารักษา */}
            {selectedItem16 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-2">
                                <Layers className="w-5 h-5 text-indigo-600" />
                                <div>
                                    <h3 className="font-bold text-slate-800">
                                        ค่ารักษาพยาบาล 16 หมวด AN: {selectedItem16.an}
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        {selectedItem16.patient_name} (HN: {selectedItem16.hn})
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedItem16(null)}
                                className="p-1.5 hover:bg-slate-200 text-slate-400 rounded-lg transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                {Object.entries(selectedItem16.categories16).map(([key, val]) => (
                                    <div
                                        key={key}
                                        className={`p-2.5 rounded-xl border flex items-center justify-between ${
                                            val > 0
                                                ? 'bg-slate-50 border-slate-200 text-slate-800 font-medium'
                                                : 'bg-white border-slate-100 text-slate-400'
                                        }`}
                                    >
                                        <span className="truncate pr-2">{category16Labels[key] || key}</span>
                                        <span className="font-mono font-bold whitespace-nowrap">
                                            {formatMoney(val)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                            <div className="text-xs font-semibold text-slate-700">
                                ยอดรวมค่ารักษาพยาบาลทั้งหมด:{' '}
                                <span className="font-bold text-indigo-700 font-mono text-sm">
                                    {formatMoney(selectedItem16.total_amount)}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedItem16(null)}
                                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition"
                            >
                                ปิด
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </RcmLayout>
    );
}
