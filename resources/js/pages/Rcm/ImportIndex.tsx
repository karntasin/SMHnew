import React, { useState } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import RcmLayout from './RcmLayout';
import {
    FolderDown,
    UploadCloud,
    DownloadCloud,
    RefreshCw,
    Sparkles,
    CheckCircle2,
    AlertCircle,
    FileSpreadsheet,
    FileText,
    Search,
    Filter,
    Calendar,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Clock,
    X,
    Eye,
    Receipt,
    ShieldAlert,
    ShieldCheck,
    Coins,
    Building2,
    Heart,
    Activity,
    Layers,
    FileCheck,
} from 'lucide-react';

interface Batch {
    id: number;
    filename: string;
    document_no: string | null;
    hcode: string | null;
    period_label: string | null;
    channel: string | null;
    source_format: string | null;
    file_kind: string;
    scheme: string;
    row_count: number;
    error_row_count: number;
    zero_fund_count: number;
    total_claim: number;
    total_approved: number;
    status: string | null;
    notes: string | null;
    created_at: string;
    imported_by: {
        id: number;
        name: string;
    } | null;
}

interface SchemeInfo {
    key: string;
    title: string;
    short_title: string;
    description: string;
    has_stm: boolean;
    portal_configured: boolean;
    totp_configured: boolean;
}

interface Stats {
    total_batches: number;
    total_rows: number;
    total_claim: number;
    total_approved: number;
    total_errors: number;
    by_scheme: Record<string, { count: number; rows: number; approved: number }>;
}

interface Props {
    batches: {
        data: Batch[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    filters: {
        search: string;
        scheme: string;
        file_kind: string;
        status: string;
        date_from: string | null;
        date_to: string | null;
    };
    stats: Stats;
    schemes: SchemeInfo[];
    last_sync: any;
}

export default function ImportIndex({ batches, filters, stats, schemes, last_sync }: Props) {
    // Search & Filter State
    const [search, setSearch] = useState(filters.search || '');
    const [schemeFilter, setSchemeFilter] = useState(filters.scheme || 'all');
    const [kindFilter, setKindFilter] = useState(filters.file_kind || 'all');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    // One-Click Sync All State
    const [syncYear, setSyncYear] = useState<number>(new Date().getFullYear());
    const [syncMonth, setSyncMonth] = useState<number>(new Date().getMonth() + 1);
    const [syncForce, setSyncForce] = useState<boolean>(false);
    const [syncAllLoading, setSyncAllLoading] = useState<boolean>(false);
    const [syncAllResult, setSyncAllResult] = useState<any>(null);
    const [syncAllError, setSyncAllError] = useState<string | null>(null);

    // Single Scheme Sync State
    const [singleScheme, setSingleScheme] = useState<string>(schemes[0]?.key || 'ucs');
    const [singleYear, setSingleYear] = useState<number>(new Date().getFullYear());
    const [singleMonth, setSingleMonth] = useState<number>(new Date().getMonth() + 1);
    const [singleForce, setSingleForce] = useState<boolean>(false);
    const [singleLoading, setSingleLoading] = useState<boolean>(false);
    const [singleMessage, setSingleMessage] = useState<string | null>(null);
    const [singleError, setSingleError] = useState<string | null>(null);

    // Manual Upload State
    const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
    const [uploadScheme, setUploadScheme] = useState<string>('auto');
    const [uploadNotes, setUploadNotes] = useState<string>('');
    const [uploading, setUploading] = useState<boolean>(false);
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // Drill-Down Modal State
    const [drillModalOpen, setDrillModalOpen] = useState<boolean>(false);
    const [drillLoading, setDrillLoading] = useState<boolean>(false);
    const [drillBatch, setDrillBatch] = useState<any>(null);
    const [drillItems, setDrillItems] = useState<any[]>([]);
    const [drillSearch, setDrillSearch] = useState<string>('');
    const [drillTab, setDrillTab] = useState<'all' | 'error' | 'approved'>('all');

    // Handle Search / Filter Change
    const applyFilters = (newParams: Record<string, string>) => {
        router.get(
            route('rcm.import.index'),
            {
                search,
                scheme: schemeFilter,
                file_kind: kindFilter,
                status: statusFilter,
                date_from: dateFrom,
                date_to: dateTo,
                ...newParams,
            },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters({ search });
    };

    const handleSchemeFilterClick = (sch: string) => {
        setSchemeFilter(sch);
        applyFilters({ scheme: sch });
    };

    const handleKindFilterClick = (k: string) => {
        setKindFilter(k);
        applyFilters({ file_kind: k });
    };

    // Trigger One-Click Sync All
    const handleOneClickSyncAll = async () => {
        setSyncAllLoading(true);
        setSyncAllError(null);
        setSyncAllResult(null);

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const resp = await fetch(route('rcm.import.sync-all'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    year: syncYear,
                    month: syncMonth,
                    force: syncForce,
                }),
            });

            const data = await resp.json().catch(() => ({
                success: false,
                message: `การเชื่อมต่อขัดข้อง (HTTP ${resp.status} ${resp.statusText})`,
            }));

            if (data.success) {
                setSyncAllResult(data);
                setTimeout(() => {
                    router.reload({ preserveScroll: true });
                }, 2000);
            } else {
                setSyncAllError(data.message || data.error || 'เกิดข้อผิดพลาดในการซิงค์ครบวงจร');
            }
        } catch (err: any) {
            setSyncAllError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setSyncAllLoading(false);
        }
    };

    // Trigger Single Scheme Sync
    const handleSingleSchemeSync = async () => {
        setSingleLoading(true);
        setSingleError(null);
        setSingleMessage(null);

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const resp = await fetch(route('rcm.import.sync-scheme'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    scheme: singleScheme,
                    year: singleYear,
                    month: singleMonth,
                    force: singleForce,
                }),
            });

            const data = await resp.json().catch(() => ({
                success: false,
                message: `การเชื่อมต่อขัดข้อง (HTTP ${resp.status} ${resp.statusText})`,
            }));

            if (data.success) {
                setSingleMessage(data.message || 'ดึงและนำเข้าไฟล์สำเร็จ');
                setTimeout(() => {
                    router.reload({ preserveScroll: true });
                }, 1800);
            } else {
                setSingleError(data.message || data.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
            }
        } catch (err: any) {
            setSingleError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setSingleLoading(false);
        }
    };

    // Trigger Manual Upload
    const handleUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadFiles || uploadFiles.length === 0) return;

        setUploading(true);
        setUploadError(null);
        setUploadSuccess(null);

        const formData = new FormData();
        Array.from(uploadFiles).forEach((f) => formData.append('files[]', f));
        if (uploadScheme !== 'auto') {
            formData.append('scheme', uploadScheme);
        }
        if (uploadNotes.trim()) {
            formData.append('notes', uploadNotes.trim());
        }

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const resp = await fetch(route('rcm.import.upload'), {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: formData,
            });

            const data = await resp.json().catch(() => ({
                success: false,
                message: `การเชื่อมต่อขัดข้อง (HTTP ${resp.status} ${resp.statusText})`,
            }));

            if (data.success) {
                setUploadSuccess(data.message || 'นำเข้าไฟล์สำเร็จ');
                setUploadFiles(null);
                setUploadNotes('');
                // reset file input
                const fileInput = document.getElementById('manual-upload-input') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
                setTimeout(() => {
                    router.reload({ preserveScroll: true });
                }, 1500);
            } else {
                setUploadError(data.message || 'เกิดข้อผิดพลาดในการนำเข้าไฟล์');
            }
        } catch (err: any) {
            setUploadError(err.message || 'เกิดข้อผิดพลาดในการส่งข้อมูล');
        } finally {
            setUploading(false);
        }
    };

    // Open Drill-down Batch items
    const openBatchDetail = async (batchId: number) => {
        setDrillModalOpen(true);
        setDrillLoading(true);
        setDrillSearch('');
        setDrillTab('all');

        try {
            const resp = await fetch(route('rcm.import.batch-items', { id: batchId, limit: 100 }));
            const json = await resp.json();
            setDrillBatch(json.batch);
            setDrillItems(json.items || []);
        } catch (err) {
            console.error('Failed to load batch items', err);
            setDrillItems([]);
        } finally {
            setDrillLoading(false);
        }
    };

    const schemeBadgeColor = (sch: string) => {
        switch (sch?.toLowerCase()) {
            case 'ucs':
                return 'bg-amber-100 text-amber-800 border-amber-300';
            case 'cgd':
                return 'bg-sky-100 text-sky-800 border-sky-300';
            case 'lgo':
                return 'bg-emerald-100 text-emerald-800 border-emerald-300';
            case 'smt':
                return 'bg-purple-100 text-purple-800 border-purple-300';
            default:
                return 'bg-slate-100 text-slate-800 border-slate-300';
        }
    };

    const kindBadgeColor = (kind: string) => {
        switch (kind?.toLowerCase()) {
            case 'rep':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'stm':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'appeal':
                return 'bg-rose-50 text-rose-700 border-rose-200';
            default:
                return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    const filteredDrillItems = drillItems.filter((item) => {
        if (drillTab === 'error' && (!item.error_code || item.error_code === '')) return false;
        if (drillTab === 'approved' && item.total_approved <= 0) return false;
        if (drillSearch.trim()) {
            const s = drillSearch.toLowerCase();
            return (
                (item.hn && item.hn.toLowerCase().includes(s)) ||
                (item.patient_name && item.patient_name.toLowerCase().includes(s)) ||
                (item.seq_no && String(item.seq_no).includes(s)) ||
                (item.error_code && item.error_code.toLowerCase().includes(s)) ||
                (item.denial_reason && item.denial_reason.toLowerCase().includes(s))
            );
        }
        return true;
    });

    return (
        <RcmLayout title="นำเข้าข้อมูล (Data Import & Auto-Sync Center)" active="import">
            <Head title="ศูนย์รวมการนำเข้าข้อมูล RCM" />

            {/* Header Section */}
            <div className="mb-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
                            <FolderDown className="w-4 h-4" />
                            <span>Centralized Data Import & Auto-Sync Center</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                            ศูนย์รวมการนำเข้าข้อมูลและการดึงข้อมูลอัตโนมัติ (RCM)
                        </h1>
                        <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                            ศูนย์กลางดึงไฟล์ผลตรวจ (REP), Statement (STM), และเงินโอนจริง สปสช. (SMT) ครบทุกสิทธิ
                            พร้อมระบบยืนยันตัวตน Zero-Click 2FA และรายงานประวัติการนำเข้าข้อมูลอย่างสมบูรณ์
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <a
                            href={route('rcm.import.export-excel', filters)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-100 bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-700/60 rounded-xl transition shadow-xs cursor-pointer"
                        >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                            ส่งออก Excel
                        </a>
                        <a
                            href={route('rcm.import.export-pdf', filters)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-100 bg-rose-950/80 hover:bg-rose-900/80 border border-rose-700/60 rounded-xl transition shadow-xs cursor-pointer"
                        >
                            <FileText className="w-4 h-4 text-rose-400" />
                            ส่งออก PDF
                        </a>
                    </div>
                </div>

                {/* Submodule quick link pills */}
                <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-slate-800 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300">สลับไปยังโมดูลกระทบยอด:</span>
                    <Link
                        href={route('rcm.uc.index')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border border-amber-800/50 rounded-lg transition"
                    >
                        <Heart className="w-3 h-3 text-amber-400" />
                        บัตรทอง (UC)
                    </Link>
                    <Link
                        href={route('rcm.reconcile.index')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-950/50 hover:bg-sky-900/60 text-sky-300 border border-sky-800/50 rounded-lg transition"
                    >
                        <Receipt className="w-3 h-3 text-sky-400" />
                        กระทบยอด STM & อุทธรณ์
                    </Link>
                    <Link
                        href={route('rcm.dialysis.index')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/50 rounded-lg transition"
                    >
                        <Activity className="w-3 h-3 text-emerald-400" />
                        ไตเทียม (HD / SMT)
                    </Link>
                    <Link
                        href={route('rcm.smt.index')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-950/50 hover:bg-purple-900/60 text-purple-300 border border-purple-800/50 rounded-lg transition"
                    >
                        <Coins className="w-3 h-3 text-purple-400" />
                        เงินโอน SMT
                    </Link>
                </div>
            </div>

            {/* Section 1: Action Cards (Sync & Upload Hub) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
                {/* Card 1: One-Click Sync All Schemes */}
                <div className="bg-white rounded-2xl p-5 border-2 border-emerald-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-radial from-emerald-100 to-transparent pointer-events-none" />
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-emerald-700">
                            <Sparkles className="w-5 h-5 text-emerald-600 animate-pulse" />
                            <h2 className="text-sm font-bold tracking-tight">ซิงค์ครบวงจรทุกสิทธิอัตโนมัติ (One-Click Sync All)</h2>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                            ดึงไฟล์ REP และ STM ทุกกองทุน (เบิกตรง CGD, อปท. LGO, บัตรทอง UCS) พร้อมยอดเงินโอน SMT สปสช. และตัดยอดติด C ในคลิกเดียว
                        </p>

                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">ปี (ค.ศ. / พ.ศ.)</label>
                                <select
                                    value={syncYear}
                                    onChange={(e) => setSyncYear(Number(e.target.value))}
                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                >
                                    <option value="2026">2026 (พ.ศ. 2569)</option>
                                    <option value="2025">2025 (พ.ศ. 2568)</option>
                                    <option value="2024">2024 (พ.ศ. 2567)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">เดือน</label>
                                <select
                                    value={syncMonth}
                                    onChange={(e) => setSyncMonth(Number(e.target.value))}
                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                        <option key={m} value={m}>เดือน {m}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <label className="flex items-center gap-2 text-[11px] text-slate-600 mb-4 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={syncForce}
                                onChange={(e) => setSyncForce(e.target.checked)}
                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>บังคับดาวน์โหลดใหม่ทั้งหมด (แม้มีในระบบแล้ว)</span>
                        </label>

                        {/* Error Alert */}
                        {syncAllError && (
                            <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-1.5">
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                <span>{syncAllError}</span>
                            </div>
                        )}

                        {/* Success Result */}
                        {syncAllResult && (
                            <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 space-y-1">
                                <div className="font-bold flex items-center gap-1 text-emerald-900">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    {syncAllResult.message}
                                </div>
                                <div className="text-[10px] text-emerald-700">
                                    REP นำเข้า: {syncAllResult.stats?.rep_imported ?? 0} ไฟล์ | STM นำเข้า: {syncAllResult.stats?.stm_imported ?? 0} ไฟล์
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={handleOneClickSyncAll}
                        disabled={syncAllLoading}
                        className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                        {syncAllLoading ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>กำลังซิงค์ทุกสิทธิอัตโนมัติ...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 text-amber-200" />
                                <span>เริ่มซิงค์ครบทุกสิทธิทันที (Zero-Click)</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Card 2: Per-Scheme Portal Sync */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-sky-700">
                            <DownloadCloud className="w-5 h-5 text-sky-600" />
                            <h2 className="text-sm font-bold tracking-tight">ดึงข้อมูลเฉพาะสิทธิจาก e-Claim Portal</h2>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                            เลือกสิทธิการรักษาที่ต้องการดึงเฉพาะเจาะจง รองรับการเพิ่มสิทธิใหม่ในอนาคตอัตโนมัติ
                        </p>

                        <div className="mb-2.5">
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">สิทธิการรักษา (Scheme)</label>
                            <select
                                value={singleScheme}
                                onChange={(e) => setSingleScheme(e.target.value)}
                                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                            >
                                {schemes.map((s) => (
                                    <option key={s.key} value={s.key}>
                                        {s.title} ({s.short_title})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">ปี</label>
                                <select
                                    value={singleYear}
                                    onChange={(e) => setSingleYear(Number(e.target.value))}
                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                                >
                                    <option value="2026">2026 (พ.ศ. 2569)</option>
                                    <option value="2025">2025 (พ.ศ. 2568)</option>
                                    <option value="2024">2024 (พ.ศ. 2567)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">เดือน</label>
                                <select
                                    value={singleMonth}
                                    onChange={(e) => setSingleMonth(Number(e.target.value))}
                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                        <option key={m} value={m}>เดือน {m}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <label className="flex items-center gap-2 text-[11px] text-slate-600 mb-4 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={singleForce}
                                onChange={(e) => setSingleForce(e.target.checked)}
                                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                            />
                            <span>บังคับดาวน์โหลดใหม่ (Force Re-download)</span>
                        </label>

                        {/* Error Alert */}
                        {singleError && (
                            <div className="mb-3 p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-1.5">
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                <span>{singleError}</span>
                            </div>
                        )}

                        {/* Success Alert */}
                        {singleMessage && (
                            <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span>{singleMessage}</span>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={handleSingleSchemeSync}
                        disabled={singleLoading}
                        className="w-full py-2 px-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        {singleLoading ? (
                            <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>กำลังดึงข้อมูล...</span>
                            </>
                        ) : (
                            <>
                                <DownloadCloud className="w-3.5 h-3.5" />
                                <span>ดึงข้อมูลสิทธินี้ทันที</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Card 3: Manual Batch File Upload */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
                    <form onSubmit={handleUploadSubmit} className="flex flex-col h-full justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-2 text-indigo-700">
                                <UploadCloud className="w-5 h-5 text-indigo-600" />
                                <h2 className="text-sm font-bold tracking-tight">อัปโหลดไฟล์ด้วยตนเอง (Manual Upload)</h2>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                                รองรับไฟล์ REP (.ecd, .xls, .xlsx, .csv) และ STM (.xls, .txt, .zip) พร้อมตรวจจับสิทธิอัตโนมัติ
                            </p>

                            <div className="mb-2.5">
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">เลือกไฟล์เพื่อนำเข้า</label>
                                <input
                                    id="manual-upload-input"
                                    type="file"
                                    multiple
                                    accept=".xls,.xlsx,.csv,.ecd,.txt,.zip"
                                    onChange={(e) => setUploadFiles(e.target.files)}
                                    className="w-full text-xs text-slate-500 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border border-slate-200 rounded-lg p-1 bg-slate-50"
                                />
                                {uploadFiles && uploadFiles.length > 0 && (
                                    <div className="mt-1 text-[11px] font-semibold text-emerald-700">
                                        ✓ เลือกแล้ว {uploadFiles.length} ไฟล์
                                    </div>
                                )}
                            </div>

                            <div className="mb-2.5">
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">สิทธิการรักษา (หรือปล่อยอัตโนมัติ)</label>
                                <select
                                    value={uploadScheme}
                                    onChange={(e) => setUploadScheme(e.target.value)}
                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                >
                                    <option value="auto">✨ ตรวจจับสิทธิอัตโนมัติจากชื่อไฟล์</option>
                                    {schemes.map((s) => (
                                        <option key={s.key} value={s.key}>{s.title} ({s.short_title})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Error Alert */}
                            {uploadError && (
                                <div className="mb-3 p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-1.5">
                                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                    <span>{uploadError}</span>
                                </div>
                            )}

                            {/* Success Alert */}
                            {uploadSuccess && (
                                <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                    <span>{uploadSuccess}</span>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={uploading || !uploadFiles || uploadFiles.length === 0}
                            className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer mt-3"
                        >
                            {uploading ? (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>กำลังนำเข้าไฟล์...</span>
                                </>
                            ) : (
                                <>
                                    <UploadCloud className="w-3.5 h-3.5" />
                                    <span>อัปโหลดและนำเข้าไฟล์ทันที</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {/* Section 2: Financial KPI Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-6">
                <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        ไฟล์นำเข้าทั้งหมด
                    </div>
                    <div className="text-xl font-bold text-slate-900 font-mono">
                        {stats.total_batches.toLocaleString()} <span className="text-xs font-normal text-slate-500">ไฟล์</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                        ทุกสิทธิการรักษา
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        จำนวนรายการ / เคสรวม
                    </div>
                    <div className="text-xl font-bold text-slate-900 font-mono">
                        {stats.total_rows.toLocaleString()} <span className="text-xs font-normal text-slate-500">เคส</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                        ในฐานข้อมูลกระทบยอด
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        ยอดขอเบิกรวม
                    </div>
                    <div className="text-xl font-bold text-sky-700 font-mono">
                        ฿{stats.total_claim.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                        Total Claim Amount
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        ยอดอนุมัติ / ชดเชยรวม
                    </div>
                    <div className="text-xl font-bold text-emerald-700 font-mono">
                        ฿{stats.total_approved.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                        Total Approved Amount
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        เคสติดปัญหา / C-Deny
                    </div>
                    <div className="text-xl font-bold text-rose-700 font-mono">
                        {stats.total_errors.toLocaleString()} <span className="text-xs font-normal text-slate-500">เคส</span>
                    </div>
                    <div className="text-[10px] text-rose-500 mt-0.5">
                        รอตรวจสอบ / อุทธรณ์
                    </div>
                </div>
            </div>

            {/* Section 3: Import History & Audit Report Table */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden mb-8">
                {/* Filter and Search Bar */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1.5">
                            <Filter className="w-3.5 h-3.5 text-slate-500" />
                            ตัวกรองสิทธิ:
                        </span>
                        <button
                            type="button"
                            onClick={() => handleSchemeFilterClick('all')}
                            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                                schemeFilter === 'all'
                                    ? 'bg-slate-900 text-white shadow-xs'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                            ทั้งหมด
                        </button>
                        {schemes.map((s) => (
                            <button
                                key={s.key}
                                type="button"
                                onClick={() => handleSchemeFilterClick(s.key)}
                                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                                    schemeFilter === s.key
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                {s.short_title}
                            </button>
                        ))}

                        <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

                        <span className="text-xs font-bold text-slate-700 mr-1">ประเภท:</span>
                        <button
                            type="button"
                            onClick={() => handleKindFilterClick('all')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                                kindFilter === 'all'
                                    ? 'bg-slate-800 text-white'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                            ทั้งหมด
                        </button>
                        <button
                            type="button"
                            onClick={() => handleKindFilterClick('rep')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                                kindFilter === 'rep'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                            ผลตรวจ REP
                        </button>
                        <button
                            type="button"
                            onClick={() => handleKindFilterClick('stm')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                                kindFilter === 'stm'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                            ชดเชย STM
                        </button>
                    </div>

                    {/* Search Form */}
                    <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="ค้นหาชื่อไฟล์ / เลขที่เอกสาร..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="text-xs bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 w-56 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                        <button
                            type="submit"
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer"
                        >
                            ค้นหา
                        </button>
                    </form>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/80">
                            <tr>
                                <th className="py-3 px-3.5 text-center w-12">#</th>
                                <th className="py-3 px-3">วันเวลาที่นำเข้า</th>
                                <th className="py-3 px-3">สิทธิ</th>
                                <th className="py-3 px-3">ประเภท</th>
                                <th className="py-3 px-3">ชื่อไฟล์ / เลขที่เอกสาร</th>
                                <th className="py-3 px-3 text-right">จำนวนเคส</th>
                                <th className="py-3 px-3 text-right">ยอดขอเบิก</th>
                                <th className="py-3 px-3 text-right">ยอดอนุมัติ</th>
                                <th className="py-3 px-3 text-center">ติด C/Error</th>
                                <th className="py-3 px-3">ผู้ดำเนินการ</th>
                                <th className="py-3 px-3 text-center w-20">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {batches.data.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="py-12 text-center text-slate-400">
                                        <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        ไม่พบประวัติการนำเข้าไฟล์ตามเงื่อนไขที่เลือก
                                    </td>
                                </tr>
                            ) : (
                                batches.data.map((b, idx) => (
                                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-3 px-3.5 text-center font-mono text-slate-400">
                                            {(batches.current_page - 1) * batches.per_page + idx + 1}
                                        </td>
                                        <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                                            {b.created_at ? new Date(b.created_at).toLocaleString('th-TH') : '-'}
                                        </td>
                                        <td className="py-3 px-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${schemeBadgeColor(b.scheme)}`}>
                                                {b.scheme?.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${kindBadgeColor(b.file_kind)}`}>
                                                {b.file_kind === 'rep' ? 'ผลตรวจ REP' : b.file_kind === 'stm' ? 'ชดเชย STM' : b.file_kind?.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 max-w-xs">
                                            <div className="font-semibold text-slate-900 truncate" title={b.filename}>
                                                {b.filename}
                                            </div>
                                            {b.document_no && (
                                                <div className="text-[10px] font-mono text-slate-400 truncate">
                                                    Doc: {b.document_no}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                                            {b.row_count?.toLocaleString()}
                                        </td>
                                        <td className="py-3 px-3 text-right font-mono text-sky-700">
                                            ฿{Number(b.total_claim || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                                            ฿{Number(b.total_approved || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            {b.error_row_count > 0 ? (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                                                    {b.error_row_count} เคส
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-3 text-slate-600 truncate max-w-[120px]">
                                            {b.imported_by?.name || 'ระบบอัตโนมัติ'}
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            <button
                                                type="button"
                                                onClick={() => openBatchDetail(b.id)}
                                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition cursor-pointer"
                                                title="ดูรายการเคสย่อยในไฟล์นี้"
                                            >
                                                <Eye className="w-3 h-3" />
                                                ดูเคส
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {batches.total > batches.per_page && (
                    <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <div>
                            แสดง {(batches.current_page - 1) * batches.per_page + 1} ถึง{' '}
                            {Math.min(batches.current_page * batches.per_page, batches.total)} จากทั้งหมด {batches.total} ไฟล์
                        </div>
                        <div className="flex items-center gap-1">
                            {batches.links.map((link, i) => (
                                <Link
                                    key={i}
                                    href={link.url || '#'}
                                    preserveScroll
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                        link.active
                                            ? 'bg-slate-900 text-white'
                                            : !link.url
                                            ? 'text-slate-300 pointer-events-none'
                                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Drill-Down Batch Detail Modal */}
            {drillModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                            <div>
                                <div className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
                                    รายละเอียดเคสในไฟล์นำเข้า (Batch Item Detail)
                                </div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    {drillBatch?.filename || 'กำลังโหลด...'}
                                </h3>
                                {drillBatch && (
                                    <div className="text-xs text-slate-300 mt-0.5 flex items-center gap-3">
                                        <span>สิทธิ: <b className="text-white">{drillBatch.scheme?.toUpperCase()}</b></span>
                                        <span>ประเภท: <b className="text-white">{drillBatch.file_kind?.toUpperCase()}</b></span>
                                        <span>นำเข้าเมื่อ: <b className="text-white">{drillBatch.imported_at}</b></span>
                                        <span>โดย: <b className="text-white">{drillBatch.imported_by}</b></span>
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setDrillModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Controls */}
                        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setDrillTab('all')}
                                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                                        drillTab === 'all'
                                            ? 'bg-slate-900 text-white'
                                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    ทั้งหมด ({drillItems.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDrillTab('error')}
                                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                                        drillTab === 'error'
                                            ? 'bg-rose-600 text-white'
                                            : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                                    }`}
                                >
                                    ติดปัญหา / C-Deny ({drillItems.filter((x) => x.error_code && x.error_code !== '').length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDrillTab('approved')}
                                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                                        drillTab === 'approved'
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                                    }`}
                                >
                                    อนุมัติแล้ว ({drillItems.filter((x) => x.total_approved > 0).length})
                                </button>
                            </div>

                            <div className="relative">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="ค้นหา HN / ผู้ป่วย / รหัสปฏิเสธ..."
                                    value={drillSearch}
                                    onChange={(e) => setDrillSearch(e.target.value)}
                                    className="text-xs bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1 w-64 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Modal Table Body */}
                        <div className="flex-1 overflow-y-auto p-0">
                            {drillLoading ? (
                                <div className="py-16 text-center text-slate-400">
                                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                                    กำลังโหลดรายละเอียดเคส...
                                </div>
                            ) : filteredDrillItems.length === 0 ? (
                                <div className="py-16 text-center text-slate-400">
                                    ไม่พบรายการเคสตามเงื่อนไขที่เลือก
                                </div>
                            ) : (
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
                                        <tr>
                                            <th className="py-2.5 px-3 text-center w-12">Seq</th>
                                            <th className="py-2.5 px-3">HN</th>
                                            <th className="py-2.5 px-3">ผู้ป่วย (PDPA Mask)</th>
                                            <th className="py-2.5 px-3">วันที่รับบริการ</th>
                                            <th className="py-2.5 px-3">Invoice No</th>
                                            <th className="py-2.5 px-3 text-right">ยอดขอเบิก</th>
                                            <th className="py-2.5 px-3 text-right">ยอดอนุมัติ</th>
                                            <th className="py-2.5 px-3">รหัสปัญหา / C-Deny</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700">
                                        {filteredDrillItems.map((item, idx) => (
                                            <tr key={item.id || idx} className="hover:bg-slate-50/80">
                                                <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                                                    {item.seq_no || idx + 1}
                                                </td>
                                                <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                                    {item.hn}
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    {item.patient_name}
                                                </td>
                                                <td className="py-2.5 px-3 font-mono text-slate-600">
                                                    {item.visit_date}
                                                </td>
                                                <td className="py-2.5 px-3 font-mono text-slate-500">
                                                    {item.invoice_no || '-'}
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-mono text-sky-700">
                                                    ฿{Number(item.total_claim || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                                                    ฿{Number(item.total_approved || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    {item.error_code ? (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                                            {item.error_code}
                                                            {item.denial_reason ? ` (${item.denial_reason})` : ''}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-emerald-600 font-semibold">✓ ผ่าน</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
                            <div>
                                แสดง {filteredDrillItems.length} รายการ
                            </div>
                            <button
                                type="button"
                                onClick={() => setDrillModalOpen(false)}
                                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition cursor-pointer"
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
