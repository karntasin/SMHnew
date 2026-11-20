import React, { useState } from 'react';
import RcmLayout from './RcmLayout';
import { router, Link } from '@inertiajs/react';
import { ThaiDateRangePicker } from '@/components/date-range-picker';
import {
    Receipt,
    Upload,
    RotateCcw,
    CheckCircle2,
    AlertOctagon,
    Clock,
    FileSpreadsheet,
    FileText,
    RefreshCw,
    Send,
    X,
    Filter,
    FolderSync,
    FolderDown,
    KeyRound,
    SlidersHorizontal,
    FolderOpen,
    Check,
    Search,
    TrendingUp,
    TrendingDown,
    ShieldAlert,
    HelpCircle,
    Building2,
    Layers,
    Calendar,
    ChevronRight,
    ArrowUpRight,
    Info,
    Play,
    Pause,
    Loader2,
    Sparkles,
} from 'lucide-react';

interface ClaimItem {
    id: number;
    batch_id: number;
    claim_type: 'CSOP' | 'CIPN';
    rep_no: string;
    tran_id: string;
    hn: string;
    raw_hn: string;
    an?: string;
    pid: string;
    patient_name: string;
    service_date: string;
    discharge_date?: string | null;
    claim_amount: number;
    approved_amount: number;
    shortfall_amount: number;
    raw_shortfall?: number;
    is_settled?: boolean;
    settling_rep_no?: string;
    settled_at?: string | null;
    reconcile_status: 'pending' | 'matched_full' | 'matched_partial' | 'rejected' | 'recovered';
    denial_code?: string;
    c_deny_info?: {
        code: string;
        title: string;
        solution: string;
    } | null;
    fund_codes: string;
    appeal_case?: {
        id: number;
        appeal_status: string;
        appeal_reason?: string;
        recovered_amount: number;
        requested_amount: number;
    } | null;
}

interface FundMatrixRow {
    fund_code: string;
    fund_name: string;
    case_count: number;
    claimed: number;
    approved: number;
    shortfall: number;
    c_deny_amount: number;
    recovered: number;
    approval_rate: number;
}

interface ServiceMatrixRow {
    service_type: string;
    service_name: string;
    case_count: number;
    claimed: number;
    approved: number;
    shortfall: number;
    c_deny_amount: number;
    recovered: number;
    approval_rate: number;
}

interface TopCDenyRow {
    code: string;
    title: string;
    solution: string;
    count: number;
    settled_count?: number;
    pending_count?: number;
    total_claim: number;
    shortfall: number;
}

interface CDenyCaseRow {
    id: number;
    hn: string;
    pid: string;
    patient_name: string;
    seq_no: string;
    an?: string;
    claim_type: 'CSOP' | 'CIPN';
    visit_date?: string;
    visit_date_thai?: string;
    claim_amount: number;
    approved_amount: number;
    shortfall_amount: number;
    is_settled: boolean;
    error_code: string;
    orig_rep_no: string;
    orig_rep_date: string;
    orig_filename?: string;
    settling_rep_no?: string;
    settling_rep_date?: string;
    recovered_amount: number;
    appeal?: {
        id: number;
        status: string;
        requested_amount: number;
        approved_amount: number;
        updated_at?: string | null;
    } | null;
}

interface CDenyDrilldownData {
    code: string;
    title: string;
    solution: string;
    summary: {
        total_cases: number;
        settled_cases: number;
        pending_cases: number;
        total_claim_amount: number;
        total_shortfall_amount: number;
        total_recovered_amount: number;
    };
    cases: CDenyCaseRow[];
}

interface ReconciliationProps {
    filters: {
        date_preset?: string;
        start_date?: string;
        end_date?: string;
        scheme?: string;
        claim_type?: string;
        status?: string;
        c_deny_code?: string;
        search?: string;
    };
    items: {
        data: ClaimItem[];
        current_page: number;
        last_page: number;
        total: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    summary: {
        total_cases: number;
        total_claimed: number;
        total_approved: number;
        total_shortfall: number;
        total_c_deny_amount: number;
        total_pending_appeal_amount: number;
        total_recovered_amount: number;
        matched_full_count: number;
        matched_partial_count: number;
        rejected_count: number;
        pending_appeal_count: number;
        appeal_approved_count: number;
        approval_rate: number;
        recovery_rate: number;
        fund_matrix: FundMatrixRow[];
        service_matrix: ServiceMatrixRow[];
        top_c_deny: TopCDenyRow[];
        date_range: {
            preset: string;
            start_date?: string | null;
            end_date?: string | null;
            label: string;
        };
    };
    syncInfo: {
        last_sync_at?: string | null;
        last_sync_count: number;
        last_sync_folder: string;
        is_active: boolean;
    };
    cDenyOptions: Array<{ code: string; label: string }>;
    hasTotp?: boolean;
    portalConfigured?: boolean;
}

export default function Reconciliation({
    filters,
    items,
    summary,
    syncInfo,
    cDenyOptions,
    hasTotp,
    portalConfigured,
}: ReconciliationProps) {
    const [activeTab, setActiveTab] = useState<'cases' | 'matrix' | 'c_deny'>('cases');
    const [datePreset, setDatePreset] = useState(filters.date_preset || 'all');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');
    const [schemeFilter, setSchemeFilter] = useState(filters.scheme || 'cgd');
    const [claimTypeFilter, setClaimTypeFilter] = useState(filters.claim_type || 'all');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [cDenyFilter, setCDenyFilter] = useState(filters.c_deny_code || 'all');
    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    // One-Click Comprehensive Sync States
    const [oneClickSyncing, setOneClickSyncing] = useState(false);
    const [oneClickResult, setOneClickResult] = useState<any>(null);
    const [showOneClickModal, setShowOneClickModal] = useState(false);
    const [oneClickStep, setOneClickStep] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
    const [totpSecretInput, setTotpSecretInput] = useState('');
    const [totpMode, setTotpMode] = useState<'secret' | 'manual'>('secret');
    const [savingTotp, setSavingTotp] = useState(false);

    const handleTotpSecretChange = async (rawVal: string) => {
        if (rawVal.includes('otpauth-migration://')) {
            try {
                const res = await fetch(route('rcm.auto-sync.decode-migration'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                    },
                    body: JSON.stringify({ migration_url: rawVal.trim() }),
                });
                const data = await res.json();
                if (data.success && data.secret) {
                    setTotpSecretInput(data.secret);
                    return;
                }
            } catch (e) {
                console.error('Migration decode error', e);
            }
        }
        setTotpSecretInput(rawVal.toUpperCase().replace(/[^A-Z2-7]/g, ''));
    };

    const handleOneClickSync = async (otp?: string, secret?: string) => {
        setOneClickSyncing(true);
        setShowOneClickModal(true);
        setOneClickResult(null);
        setOneClickStep('running');

        const effectiveSecret = secret || (totpSecretInput ? totpSecretInput.trim() : undefined);

        try {
            const res = await fetch(route('rcm.auto-sync.one-click-sync'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    year: new Date().getFullYear(),
                    month: new Date().getMonth() + 1,
                    scheme: schemeFilter !== 'all' ? schemeFilter : 'cgd',
                    otp: otp ? otp.trim() : undefined,
                    totp_secret: effectiveSecret || undefined,
                }),
            });

            const contentType = res.headers.get('content-type') || '';
            let data: any;
            if (contentType.includes('application/json')) {
                data = await res.json();
            } else {
                const text = await res.text();
                throw new Error(text.length > 300 ? text.slice(0, 300) + '...' : text);
            }

            setOneClickResult(data);

            if (data.requires_otp) {
                setOneClickStep('idle');
                setRequiresOtp(true);
            } else if (data.success) {
                setOneClickStep('completed');
                setOtpCode('');
                router.reload({ preserveScroll: true });
            } else {
                setOneClickStep('error');
            }
        } catch (err: any) {
            setOneClickResult({
                success: false,
                message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + (err.message || 'Network error'),
            });
            setOneClickStep('error');
        } finally {
            setOneClickSyncing(false);
        }
    };

    const handleSaveTotpAndSync = async () => {
        const clean = totpSecretInput.trim();
        if (!clean) return;

        setSavingTotp(true);
        try {
            const res = await fetch(route('rcm.auto-sync.save-totp'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({ totp_secret: clean }),
            });
            const data = await res.json();
            if (data.success) {
                setRequiresOtp(false);
                handleOneClickSync(undefined, clean);
            } else {
                alert(data.message || 'บันทึก Secret Key ไม่สำเร็จ');
            }
        } catch (err: any) {
            alert('เกิดข้อผิดพลาดในการบันทึก Secret Key');
        } finally {
            setSavingTotp(false);
        }
    };

    // Modal & Upload states
    const [uploading, setUploading] = useState(false);
    const [stmFile, setStmFile] = useState<File | null>(null);
    const [appealItem, setAppealItem] = useState<ClaimItem | null>(null);
    const [appealReason, setAppealReason] = useState('');
    const [submittingAppeal, setSubmittingAppeal] = useState(false);
    const [selectedCDenyDetail, setSelectedCDenyDetail] = useState<{ code: string; title: string; solution: string } | null>(null);
    const [cDenyDrilldown, setCDenyDrilldown] = useState<CDenyDrilldownData | null>(null);
    const [isLoadingDrilldown, setIsLoadingDrilldown] = useState(false);
    const [loadingCode, setLoadingCode] = useState<string | null>(null);
    const [drilldownTab, setDrilldownTab] = useState<'all' | 'settled' | 'pending'>('all');
    const [drilldownSearch, setDrilldownSearch] = useState('');
    const [settling, setSettling] = useState(false);
    const [settleMessage, setSettleMessage] = useState<string | null>(null);

    // Auto-Sync states
    const [autoSyncing, setAutoSyncing] = useState(false);
    const [autoSyncMessage, setAutoSyncMessage] = useState<string | null>(null);
    const [requiresOtp, setRequiresOtp] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [otpSubmitting, setOtpSubmitting] = useState(false);
    const [scanningFolder, setScanningFolder] = useState(false);
    const [hotFolderResult, setHotFolderResult] = useState<{
        folder?: string;
        total_files?: number;
        imported_count?: number;
        files?: Array<{ filename: string; size: number; modified_at: string }>;
    } | null>(null);
    const [customFolder, setCustomFolder] = useState('C:\\Users\\Karntasin\\Downloads\\RCM291069\\RCM291069\\RCM');
    const [showFolderSettings, setShowFolderSettings] = useState(false);

    // Historical Background Sync State (Extended to Jan 2024 / 2567)
    const currentDate = new Date();
    const monthsSinceJan67 = Math.max(1, (currentDate.getFullYear() - 2024) * 12 + (currentDate.getMonth() + 1));
    const [showHistoricalModal, setShowHistoricalModal] = useState(false);
    const [historicalScheme, setHistoricalScheme] = useState<'cgd' | 'lgo'>(schemeFilter === 'lgo' ? 'lgo' : 'cgd');
    const [historicalMonthsCount, setHistoricalMonthsCount] = useState<number>(monthsSinceJan67);
    const [historicalVerifying, setHistoricalVerifying] = useState(false);
    const [historicalStarting, setHistoricalStarting] = useState(false);
    const [historicalRunning, setHistoricalRunning] = useState(false);
    const [historicalSummary, setHistoricalSummary] = useState<any>(null);
    const [historicalProgress, setHistoricalProgress] = useState<any>(null);
    const [historicalLogs, setHistoricalLogs] = useState<Array<{ time: string; type: 'info' | 'success' | 'warning' | 'error'; message: string }>>([]);
    const stopHistoricalRef = React.useRef(false);

    const addHistoricalLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
        const time = new Date().toLocaleTimeString('th-TH', { hour12: false });
        setHistoricalLogs((prev) => [{ time, type, message }, ...prev].slice(0, 50));
    };

    const handleOpenHistoricalModal = () => {
        setShowHistoricalModal(true);
        if (!historicalSummary) {
            handleVerifyHistorical(historicalScheme, historicalMonthsCount);
        }
    };

    const handleVerifyHistorical = async (scheme = historicalScheme, months = historicalMonthsCount) => {
        setHistoricalVerifying(true);
        const labelText = months >= 35 ? `ย้อนหลังถึง 1 ม.ค. 67 (${months} เดือน)` : `ย้อนหลัง ${months} เดือน`;
        addHistoricalLog(`เริ่มการตรวจสอบรายการไฟล์ Statement ${labelText} (กองทุน ${scheme.toUpperCase()})...`, 'info');
        try {
            const res = await fetch(route('rcm.auto-sync.historical-verify'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({ scheme, months }),
            });
            const data = await res.json();
            if (data.requires_otp) {
                addHistoricalLog('ระบบ e-Claim บังคับยืนยันตัวตน 2FA กรุณากรอกรหัส OTP', 'warning');
                setRequiresOtp(true);
            } else if (data.success) {
                setHistoricalSummary(data.summary);
                addHistoricalLog(data.message, 'success');
            } else {
                addHistoricalLog(data.message || 'การตรวจสอบล้มเหลว', 'error');
            }
        } catch (err: any) {
            addHistoricalLog(`เกิดข้อผิดพลาดในการตรวจสอบ: ${err.message || 'Network error'}`, 'error');
        } finally {
            setHistoricalVerifying(false);
        }
    };

    const runProgressiveSyncLoop = async () => {
        stopHistoricalRef.current = false;
        setHistoricalRunning(true);
        addHistoricalLog('เริ่มกระบวนการทยอยดาวน์โหลดและนำเข้าไฟล์ในเบื้องหลัง...', 'info');

        while (!stopHistoricalRef.current) {
            try {
                const res = await fetch(route('rcm.auto-sync.historical-step'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                    },
                    body: JSON.stringify({ scheme: historicalScheme, batch_size: 2 }),
                });
                const data = await res.json();

                if (data.requires_otp) {
                    addHistoricalLog('Session e-Claim หมดอายุ กรุณายืนยันรหัส OTP เพื่อดาวน์โหลดต่อ', 'warning');
                    setRequiresOtp(true);
                    setHistoricalRunning(false);
                    break;
                }

                if (data.progress) {
                    setHistoricalProgress(data.progress);
                    if (data.progress.scan_summary) {
                        setHistoricalSummary(data.progress.scan_summary);
                    }
                }

                if (data.status === 'completed' || (data.percent && data.percent >= 100)) {
                    addHistoricalLog('🎉 ดาวน์โหลดและกระทบยอดไฟล์ Statement ทั้งหมดเสร็จสิ้นสมบูรณ์ 100%!', 'success');
                    setHistoricalRunning(false);
                    handleVerifyHistorical(historicalScheme, historicalMonthsCount);
                    router.reload({ only: ['items', 'summary'] });
                    break;
                }

                if (data.progress?.current_file) {
                    addHistoricalLog(`กำลังนำเข้า: ${data.progress.current_file} (${data.progress.current_month}) - สำเร็จแล้ว ${data.percent}%`, 'info');
                }

                // รอ 1 วินาทีเพื่อไม่ให้ยิง e-Claim ถี่เกินไป
                await new Promise((resolve) => setTimeout(resolve, 1000));
            } catch (err: any) {
                addHistoricalLog(`ข้อผิดพลาดระหว่างดาวน์โหลด: ${err.message || 'Network error'} (จะลองใหม่ใน 3 วินาที)`, 'warning');
                await new Promise((resolve) => setTimeout(resolve, 3000));
            }
        }
        setHistoricalRunning(false);
    };

    const handleStartHistoricalSync = async () => {
        setHistoricalStarting(true);
        try {
            const res = await fetch(route('rcm.auto-sync.historical-start'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({ scheme: historicalScheme }),
            });
            const data = await res.json();
            if (data.success) {
                addHistoricalLog(data.message, 'success');
                runProgressiveSyncLoop();
            } else {
                addHistoricalLog(data.message || 'ไม่สามารถเริ่มการดาวน์โหลดได้', 'error');
            }
        } catch (err: any) {
            addHistoricalLog(`เกิดข้อผิดพลาด: ${err.message}`, 'error');
        } finally {
            setHistoricalStarting(false);
        }
    };

    const handlePauseHistoricalSync = async () => {
        stopHistoricalRef.current = true;
        setHistoricalRunning(false);
        try {
            await fetch(route('rcm.auto-sync.historical-pause'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({ scheme: historicalScheme }),
            });
            addHistoricalLog('หยุดพักการดาวน์โหลดชั่วคราวแล้ว (สามารถกดดาวน์โหลดต่อได้ตลอดเวลา)', 'warning');
        } catch (err) {}
    };

    const handleResetHistoricalSync = async () => {
        stopHistoricalRef.current = true;
        setHistoricalRunning(false);
        try {
            await fetch(route('rcm.auto-sync.historical-reset'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({ scheme: historicalScheme }),
            });
            setHistoricalProgress(null);
            addHistoricalLog('ล้างสถานะและคิวเรียบร้อยแล้ว', 'info');
            handleVerifyHistorical(historicalScheme, historicalMonthsCount);
        } catch (err) {}
    };

    const applyFilters = (newFilters: Partial<typeof filters>) => {
        const query = {
            date_preset: datePreset,
            start_date: startDate || undefined,
            end_date: endDate || undefined,
            scheme: schemeFilter,
            claim_type: claimTypeFilter,
            status: statusFilter,
            c_deny_code: cDenyFilter,
            search: searchTerm || undefined,
            ...newFilters,
        };
        router.get(route('rcm.reconcile.index'), query, { preserveState: true, preserveScroll: true });
    };

    const openCDenyCases = async (code: string) => {
        const cleanCode = code.replace(/^[Cc]/, '');
        setLoadingCode(cleanCode);
        setIsLoadingDrilldown(true);
        setDrilldownTab('all');
        setDrilldownSearch('');
        try {
            const params = new URLSearchParams();
            if (datePreset) params.set('date_preset', datePreset);
            if (startDate) params.set('start_date', startDate);
            if (endDate) params.set('end_date', endDate);
            if (schemeFilter) params.set('scheme', schemeFilter);

            const url = typeof route === 'function'
                ? route('rcm.reconcile.c-deny-cases', { code: cleanCode })
                : `/rcm/reconcile/c-deny/${cleanCode}/cases`;
            const res = await fetch(`${url}?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to load C-Deny cases');
            const data: CDenyDrilldownData = await res.json();
            setCDenyDrilldown(data);
        } catch (err) {
            console.error('Error fetching C-Deny case details:', err);
        } finally {
            setIsLoadingDrilldown(false);
            setLoadingCode(null);
        }
    };

    const jumpToMainTableWithCDeny = (code: string) => {
        setCDenyDrilldown(null);
        setActiveTab('cases');
        setCDenyFilter(code);
        applyFilters({ c_deny_code: code });
    };

    const filteredDrilldownCases = (cDenyDrilldown?.cases || []).filter((c) => {
        if (drilldownTab === 'settled' && !c.is_settled) return false;
        if (drilldownTab === 'pending' && c.is_settled) return false;
        if (drilldownSearch.trim()) {
            const q = drilldownSearch.trim().toLowerCase();
            const matchHn = c.hn.toLowerCase().includes(q);
            const matchName = c.patient_name.toLowerCase().includes(q);
            const matchRep = c.orig_rep_no.toLowerCase().includes(q);
            const matchSettleRep = (c.settling_rep_no || '').toLowerCase().includes(q);
            const matchSeq = (c.seq_no || '').toLowerCase().includes(q);
            return matchHn || matchName || matchRep || matchSettleRep || matchSeq;
        }
        return true;
    });

    const handlePresetChange = (preset: string) => {
        setDatePreset(preset);
        if (preset !== 'custom') {
            setStartDate('');
            setEndDate('');
            applyFilters({ date_preset: preset, start_date: undefined, end_date: undefined });
        }
    };

    const handleCustomDateApply = (e: React.FormEvent) => {
        e.preventDefault();
        if (startDate && endDate) {
            setDatePreset('custom');
            applyFilters({ date_preset: 'custom', start_date: startDate, end_date: endDate });
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters({ search: searchTerm });
    };

    const handleUploadStm = (e: React.FormEvent) => {
        e.preventDefault();
        if (!stmFile) return;

        const formData = new FormData();
        formData.append('stm_file', stmFile);
        formData.append('scheme', schemeFilter !== 'all' ? schemeFilter : 'cgd');

        setUploading(true);
        router.post(route('rcm.reconcile.upload'), formData, {
            onFinish: () => {
                setUploading(false);
                setStmFile(null);
            },
        });
    };

    const handleTriggerAutoSync = async (otp?: string) => {
        if (otp) {
            setOtpSubmitting(true);
        } else {
            setAutoSyncing(true);
        }
        setAutoSyncMessage(null);
        try {
            const res = await fetch(route('rcm.auto-sync.download'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    year: new Date().getFullYear(),
                    month: new Date().getMonth() + 1,
                    otp: otp || undefined,
                    scheme: showHistoricalModal ? historicalScheme : (schemeFilter !== 'all' ? schemeFilter : 'cgd'),
                }),
            });
            const data = await res.json();
            setAutoSyncMessage(data.message || 'ซิงค์ไฟล์เรียบร้อย');
            if (data.requires_otp) {
                setRequiresOtp(true);
            } else if (data.success && otp) {
                setRequiresOtp(false);
                setOtpCode('');
                if (showHistoricalModal) {
                    handleVerifyHistorical(historicalScheme, historicalMonthsCount);
                } else {
                    router.reload();
                }
            }
        } catch (err) {
            setAutoSyncMessage('ไม่สามารถเชื่อมต่อ Portal อัตโนมัติได้');
        } finally {
            setAutoSyncing(false);
            setOtpSubmitting(false);
        }
    };

    const handleScanHotFolder = async () => {
        setScanningFolder(true);
        try {
            const res = await fetch(route('rcm.auto-sync.scan'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    folder_path: customFolder,
                    auto_import: true,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setHotFolderResult(data);
                if (data.imported_count > 0) {
                    router.reload();
                }
            }
        } catch (err) {
            console.error('Scan hot folder error', err);
        } finally {
            setScanningFolder(false);
        }
    };

    const handleSubmitAppeal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!appealItem || !appealReason.trim()) return;

        setSubmittingAppeal(true);
        try {
            const res = await fetch(route('rcm.reconcile.appeal', { id: appealItem.id }), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({ reason: appealReason }),
            });
            const data = await res.json();
            if (data.success) {
                setAppealItem(null);
                setAppealReason('');
                router.reload();
            }
        } catch (err) {
            console.error('Failed to submit appeal', err);
        } finally {
            setSubmittingAppeal(false);
        }
    };

    const handleAutoSettle = async () => {
        setSettling(true);
        setSettleMessage(null);
        try {
            const res = await fetch(route('rcm.reconcile.auto-settle'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
            });
            const data = await res.json();
            if (data.success) {
                setSettleMessage(data.message);
                router.reload();
            }
        } catch (err: any) {
            console.error('Failed to auto-settle', err);
            setSettleMessage('เกิดข้อผิดพลาดในการตรวจสอบและตัดยอด: ' + (err.message || 'Error'));
        } finally {
            setSettling(false);
        }
    };

    const formatMoney = (val: number) =>
        new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(val);

    const getExportUrl = (type: 'excel' | 'pdf') => {
        const params = new URLSearchParams({
            date_preset: datePreset,
            start_date: startDate,
            end_date: endDate,
            scheme: schemeFilter,
            claim_type: claimTypeFilter,
            status: statusFilter,
            c_deny_code: cDenyFilter,
            search: searchTerm,
        });
        return route(`rcm.reconcile.export-${type}`) + '?' + params.toString();
    };

    return (
        <RcmLayout title="RCM: กระทบยอด STM & เปรียบเทียบวงจรการเงิน 6 มิติ" active="reconcile">
            {/* Top Auto-Sync Active Banner */}
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white shadow-md border border-emerald-500/30 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="relative flex items-center justify-center">
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping absolute" />
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> ระบบเชื่อมโยงข้อมูล STM อัตโนมัติ (Single Source of Truth)
                            </span>
                            {hasTotp ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                    <Sparkles className="w-3 h-3 text-emerald-400" /> Zero-Click Auth พร้อม (ไม่ต้องกรอก OTP)
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => { setTotpMode('secret'); setRequiresOtp(true); }}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/25 hover:bg-amber-500/40 text-amber-200 border border-amber-400/50 transition cursor-pointer shadow-xs"
                                    title="คลิกเพื่อผูก Secret Key ให้ระบบกรอก OTP อัตโนมัติ 100%"
                                >
                                    <KeyRound className="w-3 h-3 text-amber-300" /> ยังไม่ผูก Secret Key (คลิกเพื่อตั้งค่ากรอก OTP อัตโนมัติ)
                                </button>
                            )}
                        </div>
                        <div className="text-xs text-slate-300 mt-1">
                            เชื่อมตาราง Statement จริงในระบบ <span className="font-bold text-white">19,294 รายการ</span> | ยอดเงินรวม <span className="font-bold text-emerald-300">{formatMoney(summary.total_claimed)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <Link
                        href={route('rcm.import.index')}
                        className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 border border-indigo-400/30"
                        title="ไปยังศูนย์รวมนำเข้าข้อมูลและดึงข้อมูลอัตโนมัติ (Import Hub)"
                    >
                        <FolderDown className="w-4 h-4 text-indigo-200" />
                        <span>ศูนย์นำเข้าข้อมูล (Data Import Hub)</span>
                    </Link>

                    <button
                        type="button"
                        onClick={handleAutoSettle}
                        disabled={settling || oneClickSyncing}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-amber-300 text-xs font-medium rounded-xl border border-slate-700 transition flex items-center gap-1.5"
                        title="ตรวจสอบและตัดยอดรายการติด C / อุทธรณ์ที่ได้รับเงินชดเชยครบแล้วใน STM อื่น"
                    >
                        <Sparkles className={`w-3.5 h-3.5 ${settling ? 'animate-spin text-amber-400' : 'text-amber-400'}`} />
                        {settling ? 'กำลังตัดยอด...' : 'ตัดยอดติด C'}
                    </button>
                </div>
            </div>

            {/* Settle Message Notification */}
            {settleMessage && (
                <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span className="text-sm font-semibold">{settleMessage}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setSettleMessage(null)}
                        className="text-emerald-600 hover:text-emerald-800 p-1"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* 6-Dimensional Financial KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
                {/* 1. Total Claimed */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between mb-1">
                        <span>1. ยอดเรียกเก็บรวม</span>
                        <Receipt className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="text-xl font-bold text-slate-900 tracking-tight">
                        {formatMoney(summary.total_claimed)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                        รวมทั้งหมด <span className="font-semibold text-slate-700">{summary.total_cases.toLocaleString()}</span> เคส
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800" />
                </div>

                {/* 2. Total Approved */}
                <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs relative overflow-hidden bg-gradient-to-b from-white to-emerald-50/20">
                    <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center justify-between mb-1">
                        <span>2. ได้รับชดเชย</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-xl font-bold text-emerald-600 tracking-tight">
                        {formatMoney(summary.total_approved)}
                    </div>
                    <div className="text-[11px] text-emerald-800 font-semibold mt-1 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> ชดเชยได้ {summary.approval_rate}%
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
                </div>

                {/* 3. Total Shortfall */}
                <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs relative overflow-hidden bg-gradient-to-b from-white to-rose-50/20">
                    <div className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider flex items-center justify-between mb-1">
                        <span>3. ส่วนต่างที่ขาด</span>
                        <TrendingDown className="w-4 h-4 text-rose-600" />
                    </div>
                    <div className="text-xl font-bold text-rose-600 tracking-tight">
                        {formatMoney(summary.total_shortfall)}
                    </div>
                    <div className="text-[11px] text-rose-700 mt-1">
                        ถูกตัดเงิน <span className="font-semibold">{(100 - summary.approval_rate).toFixed(1)}%</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500" />
                </div>

                {/* 4. Total C-Deny */}
                <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs relative overflow-hidden bg-gradient-to-b from-white to-amber-50/30">
                    <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider flex items-center justify-between mb-1">
                        <span>4. ติด C / ปฏิเสธ</span>
                        <AlertOctagon className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-xl font-bold text-amber-700 tracking-tight">
                        {formatMoney(summary.total_c_deny_amount)}
                    </div>
                    <div className="text-[11px] text-amber-800 mt-1">
                        ติดข้อผิดพลาด <span className="font-bold">{summary.rejected_count.toLocaleString()}</span> เคส
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
                </div>

                {/* 5. Pending Appeal */}
                <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs relative overflow-hidden bg-gradient-to-b from-white to-purple-50/20">
                    <div className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider flex items-center justify-between mb-1">
                        <span>5. รอยื่นอุทธรณ์</span>
                        <Clock className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="text-xl font-bold text-purple-700 tracking-tight">
                        {formatMoney(summary.total_pending_appeal_amount)}
                    </div>
                    <div className="text-[11px] text-purple-700 mt-1">
                        รอส่งคำขอ <span className="font-semibold">{summary.pending_appeal_count.toLocaleString()}</span> เคส
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500" />
                </div>

                {/* 6. Recovered Amount */}
                <div className="bg-white p-4 rounded-2xl border border-teal-200 shadow-xs relative overflow-hidden bg-gradient-to-b from-white to-teal-50/30">
                    <div className="text-[11px] font-semibold text-teal-800 uppercase tracking-wider flex items-center justify-between mb-1">
                        <span>6. กู้คืนสำเร็จ</span>
                        <RotateCcw className="w-4 h-4 text-teal-600" />
                    </div>
                    <div className="text-xl font-bold text-teal-700 tracking-tight">
                        {formatMoney(summary.total_recovered_amount)}
                    </div>
                    <div className="text-[11px] text-teal-800 font-semibold mt-1">
                        อุทธรณ์ได้คืน {summary.recovery_rate}%
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-teal-600" />
                </div>
            </div>

            {/* RCM Multi-Dimensional Filter Bar */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs mb-6 space-y-4">
                {/* Row 1: Period Presets */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-bold text-slate-700">ช่วงเวลา / งวดบัญชีย้อนหลัง:</span>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            {[
                                { key: 'all', label: 'ทั้งหมด (ประวัติ)' },
                                { key: 'this_month', label: 'เดือนนี้' },
                                { key: 'last_month', label: 'เดือนที่แล้ว' },
                                { key: 'last_3_months', label: 'ย้อนหลัง 3 เดือน' },
                                { key: 'last_6_months', label: 'ย้อนหลัง 6 เดือน' },
                                { key: 'fiscal_2570', label: 'ปีงบ 2570' },
                                { key: 'fiscal_2569', label: 'ปีงบ 2569' },
                                { key: 'fiscal_2568', label: 'ปีงบ 2568' },
                            ].map((p) => (
                                <button
                                    key={p.key}
                                    type="button"
                                    onClick={() => handlePresetChange(p.key)}
                                    className={`px-2.5 py-1 rounded-lg font-medium transition ${
                                        datePreset === p.key
                                            ? 'bg-slate-900 text-white font-semibold shadow-xs'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Thai Buddhist Era Date Range Picker */}
                    <div className="flex items-center gap-2">
                        <ThaiDateRangePicker
                            startDate={startDate}
                            endDate={endDate}
                            preset={datePreset}
                            onChange={(start, end, presetKey) => {
                                setStartDate(start);
                                setEndDate(end);
                                if (presetKey && presetKey !== 'custom') {
                                    setDatePreset(presetKey);
                                    applyFilters({ date_preset: presetKey, start_date: undefined, end_date: undefined });
                                } else if (start && end) {
                                    setDatePreset('custom');
                                    applyFilters({ date_preset: 'custom', start_date: start, end_date: end });
                                } else {
                                    setDatePreset('all');
                                    applyFilters({ date_preset: 'all', start_date: undefined, end_date: undefined });
                                }
                            }}
                            placeholder="ระบุช่วงวันที่กำหนดเอง (พ.ศ.)"
                        />
                    </div>
                </div>

                {/* Row 2: Fund (Scheme) & Service Type Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Fund Tabs */}
                    <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-700">กองทุน:</span>
                        <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs">
                            {[
                                { key: 'all', label: 'ทุกกองทุน' },
                                { key: 'cgd', label: 'ข้าราชการ/เบิกตรง (OFC)' },
                                { key: 'lgo', label: 'อปท. (LGO)' },
                                { key: 'ucs', label: 'บัตรทอง (UCS)' },
                                { key: 'sss', label: 'ประกันสังคม (SSS)' },
                            ].map((s) => (
                                <button
                                    key={s.key}
                                    type="button"
                                    onClick={() => {
                                        setSchemeFilter(s.key);
                                        applyFilters({ scheme: s.key });
                                    }}
                                    className={`px-3 py-1 rounded-lg font-medium transition ${
                                        schemeFilter === s.key
                                            ? 'bg-white text-emerald-800 shadow-xs font-bold'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Service Type (OPD vs IPD) */}
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-700">ประเภทบริการ:</span>
                        <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs">
                            {[
                                { key: 'all', label: 'ทั้งหมด' },
                                { key: 'CSOP', label: 'OPD (ค่ายา CSOP)' },
                                { key: 'CIPN', label: 'IPD (16 หมวด CIPN)' },
                            ].map((c) => (
                                <button
                                    key={c.key}
                                    type="button"
                                    onClick={() => {
                                        setClaimTypeFilter(c.key);
                                        applyFilters({ claim_type: c.key });
                                    }}
                                    className={`px-3 py-1 rounded-lg font-medium transition ${
                                        claimTypeFilter === c.key
                                            ? 'bg-white text-indigo-800 shadow-xs font-bold'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Row 3: Financial Status & C-Deny Dropdown & Quick Search */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
                    {/* Status Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="font-bold text-slate-700 mr-1">สถานะ:</span>
                        {[
                            { key: 'all', label: 'ทั้งหมด' },
                            { key: 'matched_full', label: 'จ่ายครบ' },
                            { key: 'matched_partial', label: 'ถูกตัดบางส่วน' },
                            { key: 'rejected', label: 'ติด C / ปฏิเสธ (ค้างอยู่)' },
                            { key: 'recovered', label: 'กู้คืน / ตัดยอดแล้ว' },
                            { key: 'pending_appeal', label: 'รออุทธรณ์' },
                            { key: 'in_appeal', label: 'กำลังอุทธรณ์' },
                        ].map((st) => (
                            <button
                                key={st.key}
                                type="button"
                                onClick={() => {
                                    setStatusFilter(st.key);
                                    applyFilters({ status: st.key });
                                }}
                                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                                    statusFilter === st.key
                                        ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {st.label}
                            </button>
                        ))}
                    </div>

                    {/* C-Deny Dropdown & Search Bar */}
                    <div className="flex items-center gap-3">
                        <select
                            value={cDenyFilter}
                            onChange={(e) => {
                                setCDenyFilter(e.target.value);
                                applyFilters({ c_deny_code: e.target.value });
                            }}
                            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="all">กรองรหัส C-Deny (ทั้งหมด)</option>
                            {cDenyOptions.map((c) => (
                                <option key={c.code} value={c.code}>
                                    {c.label}
                                </option>
                            ))}
                        </select>

                        <form onSubmit={handleSearchSubmit} className="relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="ค้นหา HN, AN, VN, ชื่อ..."
                                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 w-48 focus:w-60 transition-all focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                            />
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        </form>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs (Cases vs Financial Matrix vs C-Deny Analysis) + Export Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab('cases')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                            activeTab === 'cases'
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                    >
                        <Receipt className="w-4 h-4" /> รายการเคสละเอียด ({items.total.toLocaleString()})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('matrix')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                            activeTab === 'matrix'
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                    >
                        <TrendingUp className="w-4 h-4 text-emerald-400" /> ตารางเปรียบเทียบค่าเงิน (Matrix)
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('c_deny')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                            activeTab === 'c_deny'
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                    >
                        <ShieldAlert className="w-4 h-4 text-amber-400" /> วิเคราะห์รหัสติด C (Top 20 C-Deny)
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <a
                        href={getExportUrl('excel')}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold shadow-xs transition"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export Excel (Matrix)
                    </a>
                    <a
                        href={getExportUrl('pdf')}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold shadow-xs transition"
                    >
                        <FileText className="w-4 h-4 text-rose-600" /> Export PDF (Executive)
                    </a>
                </div>
            </div>

            {/* TAB 1: Detail Cases Table */}
            {activeTab === 'cases' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden mb-12">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                                    <th className="py-3 px-4">ประเภท/งวด</th>
                                    <th className="py-3 px-4">ผู้ป่วย / HN / AN</th>
                                    <th className="py-3 px-4">วันที่รับบริการ</th>
                                    <th className="py-3 px-4 text-right">ยอดเรียกเก็บ</th>
                                    <th className="py-3 px-4 text-right">ยอดที่ได้รับ</th>
                                    <th className="py-3 px-4 text-right">ส่วนต่างที่ขาด</th>
                                    <th className="py-3 px-4 text-center">สถานะ</th>
                                    <th className="py-3 px-4">รหัสข้อผิดพลาด / C-Deny</th>
                                    <th className="py-3 px-4 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-12 text-center text-slate-400">
                                            ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา
                                        </td>
                                    </tr>
                                ) : (
                                    items.data.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/80 transition">
                                            <td className="py-3 px-4">
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        item.claim_type === 'CIPN'
                                                            ? 'bg-indigo-100 text-indigo-700'
                                                            : 'bg-emerald-100 text-emerald-700'
                                                    }`}
                                                >
                                                    {item.claim_type}
                                                </span>
                                                <div className="text-[10px] text-slate-400 mt-0.5">
                                                    Rep: {item.rep_no || '-'}
                                                </div>
                                            </td>

                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-slate-900">{item.patient_name}</div>
                                                <div className="text-[11px] text-slate-500 font-mono">
                                                    HN: {item.hn} {item.an ? `| AN: ${item.an}` : ''}
                                                </div>
                                            </td>

                                            <td className="py-3 px-4 text-slate-600 font-mono">
                                                {item.service_date || '-'}
                                            </td>

                                            <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                                                {formatMoney(item.claim_amount)}
                                            </td>

                                            <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-600">
                                                {formatMoney(item.approved_amount)}
                                            </td>

                                            <td className="py-3 px-4 text-right font-mono font-bold">
                                                {item.is_settled ? (
                                                    <div>
                                                        <span className="text-slate-400 line-through text-[11px] block">
                                                            {formatMoney(item.raw_shortfall || 0)}
                                                        </span>
                                                        <span className="text-emerald-600 font-bold">
                                                            0.00 (ตัดยอดแล้ว)
                                                        </span>
                                                    </div>
                                                ) : item.shortfall_amount > 0 ? (
                                                    <span className="text-rose-600">
                                                        {formatMoney(item.shortfall_amount)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>

                                            <td className="py-3 px-4 text-center">
                                                {item.is_settled ? (
                                                    <div className="inline-flex flex-col items-center">
                                                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> กู้คืน/จ่ายครบ
                                                        </span>
                                                        {item.settling_rep_no && (
                                                            <span className="text-[10px] text-emerald-600 font-mono mt-0.5 font-semibold">
                                                                ใน Rep {item.settling_rep_no}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <>
                                                        {item.reconcile_status === 'matched_full' && (
                                                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                                                                จ่ายครบ
                                                            </span>
                                                        )}
                                                        {item.reconcile_status === 'matched_partial' && (
                                                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                                                                ถูกตัดบางส่วน
                                                            </span>
                                                        )}
                                                        {item.reconcile_status === 'rejected' && (
                                                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                                                                ปฏิเสธจ่าย
                                                            </span>
                                                        )}
                                                        {item.reconcile_status === 'pending' && (
                                                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                                                                รอ Statement
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </td>

                                            <td className="py-3 px-4">
                                                {item.denial_code ? (
                                                    <div>
                                                        <button
                                                            type="button"
                                                            onClick={() => openCDenyCases(item.denial_code!)}
                                                            className={`inline-flex items-center gap-1 font-mono font-bold hover:underline cursor-pointer ${
                                                                item.is_settled ? 'text-slate-500 hover:text-slate-700' : 'text-rose-600 hover:text-rose-800'
                                                            }`}
                                                            title={`คลิกดูผู้ป่วยที่ติด C${item.denial_code} และประวัติ REP แก้ไข/อุทธรณ์`}
                                                        >
                                                            <span>C{item.denial_code}</span>
                                                            <Search className="w-3 h-3 text-slate-400" />
                                                        </button>
                                                        {item.is_settled && (
                                                            <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                ตัดยอดแล้ว
                                                            </span>
                                                        )}
                                                        {item.c_deny_info && (
                                                            <div className="text-[10px] text-slate-500 truncate max-w-xs">
                                                                {item.c_deny_info.title}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>

                                            <td className="py-3 px-4 text-center">
                                                {item.is_settled ? (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        ตัดยอดแล้ว (ชดเชยครบ)
                                                    </span>
                                                ) : item.appeal_case ? (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                                                        {item.appeal_case.appeal_status === 'approved' || item.appeal_case.appeal_status === 'settled'
                                                            ? 'อุทธรณ์ผ่าน (ได้คืน)'
                                                            : 'ยื่นอุทธรณ์แล้ว'}
                                                    </span>
                                                ) : item.shortfall_amount > 0 ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setAppealItem(item)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg transition"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5" /> ขออุทธรณ์
                                                    </button>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
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
                                กำลังแสดงหน้า {items.current_page} จาก {items.last_page} (รวม {items.total.toLocaleString()} รายการ)
                            </div>
                            <div className="flex items-center gap-1">
                                {items.links.map((link, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => link.url && router.visit(link.url, { preserveState: true })}
                                        disabled={!link.url}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                                            link.active
                                                ? 'bg-slate-900 text-white'
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
            )}

            {/* TAB 2: Financial Matrix Comparison */}
            {activeTab === 'matrix' && (
                <div className="space-y-6 mb-12">
                    {/* Matrix by Fund */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-emerald-600" /> ตารางเปรียบเทียบตามกองทุน (Fund Matrix)
                                </h3>
                                <p className="text-xs text-slate-500">
                                    เปรียบเทียบยอดเงินเรียกเก็บ ได้รับจริง ส่วนต่างขาดหาย และยอดติด C แยกตามแต่ละกองทุน
                                </p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                                        <th className="py-3 px-4">กองทุน</th>
                                        <th className="py-3 px-4 text-right">จำนวนเคส</th>
                                        <th className="py-3 px-4 text-right">ยอดเรียกเก็บ</th>
                                        <th className="py-3 px-4 text-right text-emerald-700">ยอดที่ได้รับ</th>
                                        <th className="py-3 px-4 text-right text-rose-700">ส่วนต่างที่ขาด</th>
                                        <th className="py-3 px-4 text-right text-amber-700">ยอดที่ติด C</th>
                                        <th className="py-3 px-4 text-right text-teal-700">กู้คืนได้</th>
                                        <th className="py-3 px-4 text-center">อัตราชดเชย</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {summary.fund_matrix.map((fm) => (
                                        <tr key={fm.fund_code} className="hover:bg-slate-50/80">
                                            <td className="py-3 px-4 font-bold text-slate-800">
                                                {fm.fund_name}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-semibold">
                                                {fm.case_count.toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                                                {formatMoney(fm.claimed)}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                                                {formatMoney(fm.approved)}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                                                {formatMoney(fm.shortfall)}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-bold text-amber-600">
                                                {formatMoney(fm.c_deny_amount)}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-bold text-teal-600">
                                                {formatMoney(fm.recovered)}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                                    {fm.approval_rate}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Matrix by Service */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                        <div className="mb-4">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <Layers className="w-4 h-4 text-indigo-600" /> ตารางเปรียบเทียบตามประเภทบริการ (OPD CSOP vs IPD CIPN)
                            </h3>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                                        <th className="py-3 px-4">ประเภทบริการ</th>
                                        <th className="py-3 px-4 text-right">จำนวนเคส</th>
                                        <th className="py-3 px-4 text-right">ยอดเรียกเก็บ</th>
                                        <th className="py-3 px-4 text-right text-emerald-700">ยอดที่ได้รับ</th>
                                        <th className="py-3 px-4 text-right text-rose-700">ส่วนต่างที่ขาด</th>
                                        <th className="py-3 px-4 text-right text-amber-700">ยอดที่ติด C</th>
                                        <th className="py-3 px-4 text-center">อัตราชดเชย</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {summary.service_matrix.map((sm) => (
                                        <tr key={sm.service_type} className="hover:bg-slate-50/80">
                                            <td className="py-3 px-4 font-bold text-slate-800">
                                                {sm.service_name}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-semibold">
                                                {sm.case_count.toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                                                {formatMoney(sm.claimed)}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                                                {formatMoney(sm.approved)}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                                                {formatMoney(sm.shortfall)}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-bold text-amber-600">
                                                {formatMoney(sm.c_deny_amount)}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                                                    {sm.approval_rate}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: Top C-Deny Analysis */}
            {activeTab === 'c_deny' && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs mb-12">
                    <div className="mb-4">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-amber-600" /> สรุป 20 รหัสข้อผิดพลาด/ติด C สูงสุด (Top 20 C-Deny Analytics)
                        </h3>
                        <p className="text-xs text-slate-500">
                            วิเคราะห์รหัสที่ถูกตัดเงินมากที่สุด โดยนับเป็นราย SEQ รวมทุกไฟล์ REP (ทั้งที่แก้ไขได้รับชดเชยแล้วและยังรอแก้) พร้อมคำอธิบายและแนวทางการแก้ไขจากฐานข้อมูลมาตรฐาน 642 ข้อ
                        </p>
                    </div>

                    {/* Dedicated Scheme Filter Bar for Top 20 C-Deny */}
                    <div className="mb-5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-bold text-slate-700">ตัวกรองสิทธิการรักษา:</span>
                            <div className="inline-flex p-1 bg-white border border-slate-200 rounded-xl text-xs shadow-2xs">
                                {[
                                    { key: 'cgd', label: 'ข้าราชการ/เบิกตรง (OFC/CGD)' },
                                    { key: 'lgo', label: 'อปท. (LGO)' },
                                    { key: 'ucs', label: 'บัตรทอง (UCS)' },
                                    { key: 'sss', label: 'ประกันสังคม (SSS)' },
                                    { key: 'all', label: 'ทุกกองทุน (All)' },
                                ].map((s) => (
                                    <button
                                        key={s.key}
                                        type="button"
                                        onClick={() => {
                                            setSchemeFilter(s.key);
                                            applyFilters({ scheme: s.key });
                                        }}
                                        className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                                            schemeFilter === s.key
                                                ? 'bg-slate-900 text-white font-bold shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                        }`}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Current Active Scheme Badge */}
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500 font-medium">สิทธิที่กำลังแสดงผล:</span>
                            <span className="px-3 py-1 rounded-lg font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1.5 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {schemeFilter === 'cgd' && 'สิทธิจ่ายตรง กรมบัญชีกลาง (CGD/OFC)'}
                                {schemeFilter === 'lgo' && 'สิทธิ อปท. (LGO)'}
                                {schemeFilter === 'ucs' && 'สิทธิบัตรทอง (UCS 30 บาท / พลทหาร)'}
                                {schemeFilter === 'sss' && 'สิทธิประกันสังคม (SSS)'}
                                {schemeFilter === 'all' && 'ทุกกองทุนรวมกัน (All Schemes)'}
                            </span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                                    <th className="py-3 px-4">รหัส C</th>
                                    <th className="py-3 px-4">รายละเอียดข้อผิดพลาด</th>
                                    <th className="py-3 px-4 text-right">จำนวน SEQ รวม</th>
                                    <th className="py-3 px-4 text-right text-emerald-600">แก้ได้แล้ว (Settled)</th>
                                    <th className="py-3 px-4 text-right text-rose-600">ยังรอแก้ (Pending)</th>
                                    <th className="py-3 px-4 text-right">ยอดเงินที่ถูกตัด (บาท)</th>
                                    <th className="py-3 px-4">แนวทางการแก้ไข / ชี้แจง</th>
                                    <th className="py-3 px-4 text-center">ดูคนติด C / ตรวจสอบ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {summary.top_c_deny.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-slate-400">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-60" />
                                                <p className="font-semibold text-slate-600">ไม่พบรายการติด C ในสิทธิและช่วงเวลาที่เลือก</p>
                                                <p className="text-[11px] text-slate-400">ระบบไม่พบข้อผิดพลาดหรือได้รับการชดเชยครบถ้วนแล้ว</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {summary.top_c_deny.map((cd) => (
                                    <tr key={cd.code} className="hover:bg-slate-50/80 transition">
                                        <td className="py-3 px-4">
                                            <button
                                                type="button"
                                                onClick={() => openCDenyCases(cd.code)}
                                                className="font-mono font-bold text-rose-600 hover:text-rose-800 hover:underline text-sm inline-flex items-center gap-1 group cursor-pointer"
                                                title={`คลิกเพื่อดูคนติด C${cd.code} และประวัติ REP`}
                                            >
                                                <span>C{cd.code}</span>
                                                <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        </td>
                                        <td className="py-3 px-4 font-medium text-slate-800 max-w-sm">
                                            {cd.title}
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                                            {cd.count.toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-600">
                                            {(cd.settled_count ?? 0).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono font-bold">
                                            {(cd.pending_count ?? 0) > 0 ? (
                                                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-xs">
                                                    {(cd.pending_count ?? 0).toLocaleString()}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">0</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                                            {formatMoney(cd.shortfall)}
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 bg-amber-50/30 rounded-lg p-2 my-1">
                                            {cd.solution}
                                        </td>
                                        <td className="py-3 px-4 text-center whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => openCDenyCases(cd.code)}
                                                disabled={isLoadingDrilldown && loadingCode === cd.code}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl transition shadow-2xs border border-rose-200 text-xs active:scale-95 disabled:opacity-50 cursor-pointer"
                                            >
                                                {isLoadingDrilldown && loadingCode === cd.code ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                                                ) : (
                                                    <Search className="w-3.5 h-3.5 text-rose-600" />
                                                )}
                                                <span>ดูคนติด C ({cd.count.toLocaleString()})</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* C-Deny Detail Modal */}
            {selectedCDenyDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-amber-50">
                            <div className="flex items-center gap-2">
                                <AlertOctagon className="w-5 h-5 text-amber-600" />
                                <h3 className="font-bold text-amber-900">
                                    รหัสข้อผิดพลาด: C{selectedCDenyDetail.code}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedCDenyDetail(null)}
                                className="p-1 hover:bg-amber-200 text-amber-700 rounded-lg transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 text-xs">
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">
                                    รายละเอียดข้อผิดพลาด:
                                </label>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 font-medium">
                                    {selectedCDenyDetail.title}
                                </div>
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1">
                                    วิธีปฏิบัติ / แนวทางการแก้ไข:
                                </label>
                                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 font-medium">
                                    {selectedCDenyDetail.solution}
                                </div>
                            </div>

                            <div className="flex justify-end pt-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setSelectedCDenyDetail(null)}
                                    className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold"
                                >
                                    ปิด
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* C-Deny Drilldown Modal (ดูรายละเอียดคนติด C และ REP ที่แก้ไข/อุทธรณ์) */}
            {cDenyDrilldown && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50 via-amber-50/50 to-white">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-mono font-black text-sm shadow-sm">
                                    C{cDenyDrilldown.code}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-900 text-base">
                                            {cDenyDrilldown.title}
                                        </h3>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                                            {cDenyDrilldown.summary.total_cases.toLocaleString()} เคส
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                            {schemeFilter === 'cgd' && 'สิทธิจ่ายตรง (OFC/CGD)'}
                                            {schemeFilter === 'lgo' && 'สิทธิ อปท. (LGO)'}
                                            {schemeFilter === 'ucs' && 'สิทธิบัตรทอง (UCS)'}
                                            {schemeFilter === 'sss' && 'สิทธิประกันสังคม (SSS)'}
                                            {schemeFilter === 'all' && 'ทุกกองทุน'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        รายละเอียดผู้ป่วยที่ติดรหัส C{cDenyDrilldown.code} พร้อมประวัติวันที่ REP รอบแรก และ REP ที่ได้รับการแก้ไข/อุทธรณ์
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCDenyDrilldown(null)}
                                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Guide Banner */}
                        <div className="px-5 py-3 bg-amber-50/70 border-b border-amber-100 flex items-start gap-2.5 text-xs">
                            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-slate-700">
                                <span className="font-bold text-amber-900">แนวทางแก้ไขตามเกณฑ์ e-Claim: </span>
                                {cDenyDrilldown.solution}
                            </div>
                        </div>

                        {/* Summary Metrics (4 Cards) */}
                        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50/60 border-b border-slate-100">
                            <div className="p-3 bg-white rounded-xl border border-slate-200">
                                <div className="text-[11px] text-slate-500 font-medium">ผู้ป่วยติด C ทั้งหมด</div>
                                <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                                    {cDenyDrilldown.summary.total_cases.toLocaleString()}{' '}
                                    <span className="text-xs font-normal text-slate-500">เคส</span>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                    เรียกเก็บ {formatMoney(cDenyDrilldown.summary.total_claim_amount)} ฿
                                </div>
                            </div>

                            <div className="p-3 bg-white rounded-xl border border-emerald-200 bg-emerald-50/20">
                                <div className="text-[11px] text-emerald-800 font-medium flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> แก้ได้แล้ว (ชดเชยครบ)
                                </div>
                                <div className="text-lg font-black text-emerald-600 font-mono mt-0.5">
                                    {cDenyDrilldown.summary.settled_cases.toLocaleString()}{' '}
                                    <span className="text-xs font-normal text-emerald-700">เคส</span>
                                </div>
                                <div className="text-[10px] text-emerald-600 font-mono mt-0.5 font-semibold">
                                    {cDenyDrilldown.summary.total_cases > 0
                                        ? ((cDenyDrilldown.summary.settled_cases / cDenyDrilldown.summary.total_cases) * 100).toFixed(1)
                                        : '0'}% แก้ไขสำเร็จ
                                </div>
                            </div>

                            <div className="p-3 bg-white rounded-xl border border-rose-200 bg-rose-50/20">
                                <div className="text-[11px] text-rose-800 font-medium flex items-center gap-1">
                                    <AlertOctagon className="w-3.5 h-3.5 text-rose-600" /> ยังรอแก้ / ค้างอยู่
                                </div>
                                <div className="text-lg font-black text-rose-600 font-mono mt-0.5">
                                    {cDenyDrilldown.summary.pending_cases.toLocaleString()}{' '}
                                    <span className="text-xs font-normal text-rose-700">เคส</span>
                                </div>
                                <div className="text-[10px] text-rose-600 font-mono mt-0.5">
                                    ยอดค้าง {formatMoney(cDenyDrilldown.summary.total_shortfall_amount)} ฿
                                </div>
                            </div>

                            <div className="p-3 bg-white rounded-xl border border-indigo-200 bg-indigo-50/20">
                                <div className="text-[11px] text-indigo-800 font-medium flex items-center gap-1">
                                    <TrendingUp className="w-3.5 h-3.5 text-indigo-600" /> ยอดเงินกู้คืนได้
                                </div>
                                <div className="text-lg font-black text-indigo-700 font-mono mt-0.5">
                                    {formatMoney(cDenyDrilldown.summary.total_recovered_amount)}{' '}
                                    <span className="text-xs font-normal text-indigo-600">฿</span>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                    จากยอดตัด {formatMoney(cDenyDrilldown.summary.total_shortfall_amount)} ฿
                                </div>
                            </div>
                        </div>

                        {/* Filter & Search Bar */}
                        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
                            <div className="flex items-center gap-1.5">
                                {(
                                    [
                                        ['all', 'ทั้งหมด', cDenyDrilldown.summary.total_cases],
                                        ['settled', 'แก้ได้แล้ว (Settled)', cDenyDrilldown.summary.settled_cases],
                                        ['pending', 'ยังรอแก้ (Pending)', cDenyDrilldown.summary.pending_cases],
                                    ] as const
                                ).map(([key, label, count]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setDrilldownTab(key)}
                                        className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                                            drilldownTab === key
                                                ? 'bg-slate-900 text-white shadow-xs'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {label} ({count.toLocaleString()})
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        value={drilldownSearch}
                                        onChange={(e) => setDrilldownSearch(e.target.value)}
                                        placeholder="ค้นหา HN, ชื่อ, Rep, SEQ..."
                                        className="pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-xl w-48 sm:w-60 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                                    />
                                    {drilldownSearch && (
                                        <button
                                            type="button"
                                            onClick={() => setDrilldownSearch('')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => jumpToMainTableWithCDeny(cDenyDrilldown.code)}
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition border border-rose-200 cursor-pointer"
                                    title="สลับไปตารางเคสหลักเพื่อจัดการอุทธรณ์หรือดูข้อมูลเต็ม"
                                >
                                    <span>เปิดตารางหลัก</span>
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Patient & REP Details Table */}
                        <div className="flex-1 overflow-y-auto max-h-[50vh] p-0">
                            {filteredDrilldownCases.length === 0 ? (
                                <div className="py-16 text-center text-slate-400 text-xs">
                                    ไม่พบรายการผู้ป่วยตามตัวกรองนี้
                                </div>
                            ) : (
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold z-10 shadow-2xs">
                                        <tr>
                                            <th className="py-2.5 px-4">ผู้ป่วย (PDPA)</th>
                                            <th className="py-2.5 px-3">วันรับบริการ</th>
                                            <th className="py-2.5 px-3 text-right">เรียกเก็บ</th>
                                            <th className="py-2.5 px-3 text-right">ยอดตัด (ขาด)</th>
                                            <th className="py-2.5 px-4">REP รอบแรก (ติด C)</th>
                                            <th className="py-2.5 px-4">REP ที่แก้ไข / ชดเชยคืน / อุทธรณ์</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredDrilldownCases.map((row) => (
                                            <tr key={row.id} className="hover:bg-slate-50/80 transition">
                                                <td className="py-3 px-4">
                                                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                                        <span>{row.patient_name}</span>
                                                        <span
                                                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                                                row.claim_type === 'CIPN'
                                                                    ? 'bg-indigo-100 text-indigo-700'
                                                                    : 'bg-emerald-100 text-emerald-700'
                                                            }`}
                                                        >
                                                            {row.claim_type}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                                        HN: {row.hn} {row.an ? `| AN: ${row.an}` : ''}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]" title={row.seq_no}>
                                                        SEQ: {row.seq_no || '-'}
                                                    </div>
                                                </td>

                                                <td className="py-3 px-3 whitespace-nowrap">
                                                    <div className="font-medium text-slate-800 font-mono">
                                                        {row.visit_date_thai || row.visit_date || '-'}
                                                    </div>
                                                </td>

                                                <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">
                                                    {formatMoney(row.claim_amount)}
                                                </td>

                                                <td className="py-3 px-3 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                                                    {formatMoney(row.shortfall_amount)}
                                                </td>

                                                <td className="py-3 px-4">
                                                    <div className="font-bold text-slate-800 font-mono flex items-center gap-1">
                                                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                                                        <span>REP {row.orig_rep_no || '-'}</span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                                                        <Calendar className="w-3 h-3 text-slate-400" />
                                                        <span>งวด: {row.orig_rep_date || '-'}</span>
                                                    </div>
                                                    {row.orig_filename && (
                                                        <div className="text-[10px] text-slate-400 truncate max-w-[180px] mt-0.5" title={row.orig_filename}>
                                                            {row.orig_filename}
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="py-3 px-4">
                                                    {row.is_settled ? (
                                                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 max-w-xs">
                                                            <div className="flex items-center gap-1 font-bold text-emerald-800 text-[11px]">
                                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                                <span>แก้ได้แล้ว (ชดเชยครบ)</span>
                                                            </div>
                                                            <div className="text-[11px] text-emerald-700 font-semibold font-mono mt-1">
                                                                ใน REP: {row.settling_rep_no || '-'}
                                                            </div>
                                                            <div className="text-[10px] text-emerald-600 font-mono mt-0.5 flex items-center gap-1">
                                                                <Calendar className="w-3 h-3 text-emerald-500" />
                                                                <span>วันที่ชดเชย: {row.settling_rep_date || '-'}</span>
                                                            </div>
                                                            <div className="text-[11px] text-emerald-900 font-bold font-mono mt-1 pt-1 border-t border-emerald-200/60">
                                                                เงินกู้คืน: +{formatMoney(row.recovered_amount)} ฿
                                                            </div>
                                                        </div>
                                                    ) : row.appeal ? (
                                                        <div className="bg-purple-50 border border-purple-200 rounded-xl p-2.5 max-w-xs">
                                                            <div className="flex items-center gap-1 font-bold text-purple-800 text-[11px]">
                                                                <RotateCcw className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                                                <span>สถานะอุทธรณ์: {row.appeal.status}</span>
                                                            </div>
                                                            <div className="text-[11px] text-purple-700 font-mono mt-1">
                                                                ขอยื่น: {formatMoney(row.appeal.requested_amount)} ฿
                                                            </div>
                                                            {row.appeal.updated_at && (
                                                                <div className="text-[10px] text-purple-600 font-mono mt-0.5">
                                                                    อัปเดต: {row.appeal.updated_at}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 max-w-xs">
                                                            <div className="flex items-center gap-1 font-bold text-rose-800 text-[11px]">
                                                                <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                                                <span>ยังรอแก้ / ค้างอยู่</span>
                                                            </div>
                                                            <p className="text-[10px] text-rose-600 mt-1">
                                                                ยังไม่พบ REP รอบแก้ไขในระบบ สามารถกดขออุทธรณ์ได้ในตารางหลัก
                                                            </p>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500">
                            <div>
                                แสดง <strong>{filteredDrilldownCases.length}</strong> จากทั้งหมด{' '}
                                <strong>{cDenyDrilldown.cases.length}</strong> รายการ
                            </div>
                            <button
                                type="button"
                                onClick={() => setCDenyDrilldown(null)}
                                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition shadow-xs cursor-pointer"
                            >
                                ปิด
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* One-Click Appeal Modal */}
            {appealItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-2">
                                <RotateCcw className="w-5 h-5 text-rose-600" />
                                <h3 className="font-bold text-slate-800">
                                    ขออุทธรณ์เงินชดเชย: {appealItem.patient_name}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAppealItem(null)}
                                className="p-1.5 hover:bg-slate-200 text-slate-400 rounded-lg transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitAppeal} className="p-5 space-y-4">
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">HN / AN:</span>
                                    <span className="font-semibold text-slate-800">
                                        HN: {appealItem.hn} {appealItem.an ? `| AN: ${appealItem.an}` : ''}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">ยอดที่ตั้งเบิก:</span>
                                    <span className="font-mono text-slate-800">
                                        {formatMoney(appealItem.claim_amount)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">ยอดเงินที่ถูกตัด (ส่วนต่าง):</span>
                                    <span className="font-mono font-bold text-rose-600">
                                        {formatMoney(appealItem.shortfall_amount)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">รหัสเหตุผลที่ตัดเงิน:</span>
                                    <span className="font-mono font-semibold text-slate-800">
                                        C{appealItem.denial_code || '305'}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    เหตุผลและคำชี้แจงในการขออุทธรณ์:
                                </label>
                                <textarea
                                    rows={4}
                                    value={appealReason}
                                    onChange={(e) => setAppealReason(e.target.value)}
                                    placeholder="ระบุเหตุผลความจำเป็นทางการแพทย์ หรือแนบข้อมูลเอกสารหลักฐานเพิ่มเติมเพื่อขอทบทวนยอดจ่าย..."
                                    required
                                    className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setAppealItem(null)}
                                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingAppeal || !appealReason.trim()}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    {submittingAppeal ? 'กำลังส่งข้อมูล...' : 'ยืนยันยื่นอุทธรณ์'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 6-Month Historical Download Center Modal */}
            {showHistoricalModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8">
                        {/* Header */}
                        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between border-b border-slate-700/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                                    <Clock className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                                        ศูนย์ตรวจสอบและทยอยดาวน์โหลด REP / STM ย้อนหลัง (ถึง 1 ม.ค. 67)
                                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-400/30">
                                            Background Runner
                                        </span>
                                    </h3>
                                    <p className="text-xs text-slate-300 mt-0.5">
                                        สแกนและทยอยนำเข้าไฟล์ Statement จาก e-Claim Portal อัตโนมัติในเบื้องหลัง ป้องกันระบบค้างและข้ามไฟล์ซ้ำ 100%
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowHistoricalModal(false)}
                                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                            {/* Controls Bar: Scheme Toggle + Months selector + Scan Button */}
                            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-600">เลือกกองทุน:</span>
                                    <div className="inline-flex rounded-xl bg-slate-200 p-1 border border-slate-300">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setHistoricalScheme('cgd');
                                                handleVerifyHistorical('cgd', historicalMonthsCount);
                                            }}
                                            className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                                                historicalScheme === 'cgd'
                                                    ? 'bg-white text-emerald-700 shadow-xs'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            กรมบัญชีกลาง (OFC)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setHistoricalScheme('lgo');
                                                handleVerifyHistorical('lgo', historicalMonthsCount);
                                            }}
                                            className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                                                historicalScheme === 'lgo'
                                                    ? 'bg-white text-emerald-700 shadow-xs'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            อปท. (LGO)
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                        <span className="font-semibold">ช่วงเวลา:</span>
                                        <select
                                            value={historicalMonthsCount}
                                            onChange={(e) => {
                                                const m = Number(e.target.value);
                                                setHistoricalMonthsCount(m);
                                                handleVerifyHistorical(historicalScheme, m);
                                            }}
                                            className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-semibold text-slate-700 focus:ring-1 focus:ring-emerald-500"
                                        >
                                            <option value={monthsSinceJan67}>✨ ย้อนหลังถึง 1 ม.ค. 67 ({monthsSinceJan67} เดือน - แนะนำ)</option>
                                            <option value={24}>ย้อนหลัง 24 เดือน (2 ปี)</option>
                                            <option value={12}>ย้อนหลัง 12 เดือน (1 ปี)</option>
                                            <option value={6}>ย้อนหลัง 6 เดือน</option>
                                            <option value={3}>ย้อนหลัง 3 เดือน</option>
                                        </select>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleVerifyHistorical(historicalScheme, historicalMonthsCount)}
                                        disabled={historicalVerifying || historicalRunning}
                                        className="px-3 py-1.5 bg-white hover:bg-slate-100 disabled:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition flex items-center gap-1.5 shadow-2xs"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${historicalVerifying ? 'animate-spin text-emerald-600' : ''}`} />
                                        {historicalVerifying ? 'กำลังสแกน e-Claim...' : 'สแกนตรวจสอบใหม่'}
                                    </button>
                                </div>
                            </div>

                            {/* Verification Summary Banner */}
                            {historicalSummary && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800">
                                        <div className="text-xs text-slate-400 font-semibold mb-0.5">ไฟล์ Statement ทั้งหมดบน e-Claim</div>
                                        <div className="text-2xl font-bold tracking-tight text-white">
                                            {historicalSummary.total_files} <span className="text-xs font-normal text-slate-400">ไฟล์</span>
                                        </div>
                                        <div className="text-[11px] text-slate-400 mt-1">ในรอบ {historicalMonthsCount} เดือนย้อนหลัง</div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                                        <div className="text-xs text-emerald-700 font-semibold mb-0.5">นำเข้ากระทบยอดแล้ว (ไม่ต้องโหลดซ้ำ)</div>
                                        <div className="text-2xl font-bold tracking-tight text-emerald-700">
                                            {historicalSummary.already_downloaded} <span className="text-xs font-normal text-emerald-600">ไฟล์</span>
                                        </div>
                                        <div className="text-[11px] text-emerald-600 mt-1">มีข้อมูลในฐานข้อมูล SMH เรียบร้อย</div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                                        <div className="text-xs text-amber-700 font-semibold mb-0.5">ไฟล์ใหม่ที่รอการทยอยดาวน์โหลด</div>
                                        <div className="text-2xl font-bold tracking-tight text-amber-700">
                                            {historicalSummary.pending_download} <span className="text-xs font-normal text-amber-600">ไฟล์</span>
                                        </div>
                                        <div className="text-[11px] text-amber-600 mt-1">พร้อมดึงเข้ากระทบยอดอัตโนมัติ</div>
                                    </div>
                                </div>
                            )}

                            {/* Monthly Breakdown Timeline Cards */}
                            {historicalSummary?.months && (
                                <div>
                                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                                        <span>สถานะรายการแยกรายเดือน ({historicalSummary.months.length} เดือน)</span>
                                        <span className="text-[11px] text-slate-500 font-normal">
                                            สแกนล่าสุด: {historicalSummary.scanned_at}
                                        </span>
                                    </div>

                                    {historicalSummary.months.length > 12 ? (
                                        <div className="space-y-4">
                                            {Object.entries(
                                                historicalSummary.months.reduce((acc: Record<string, any[]>, m: any) => {
                                                    const y = String(m.year_th || (m.year + 543));
                                                    if (!acc[y]) acc[y] = [];
                                                    acc[y].push(m);
                                                    return acc;
                                                }, {})
                                            ).map(([yearTh, mList]: [string, any]) => {
                                                const totalInYear = mList.reduce((s: number, m: any) => s + (m.total_files || 0), 0);
                                                const pendingInYear = mList.reduce((s: number, m: any) => s + (m.pending_files || 0), 0);
                                                const dlInYear = mList.reduce((s: number, m: any) => s + (m.downloaded_files || 0), 0);

                                                return (
                                                    <div key={yearTh} className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200">
                                                        <div className="flex items-center justify-between mb-2 text-xs font-bold text-slate-700">
                                                            <div className="flex items-center gap-2">
                                                                <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[11px]">
                                                                    ปี พ.ศ. {yearTh}
                                                                </span>
                                                                <span className="text-slate-500 font-normal">({mList.length} เดือน)</span>
                                                            </div>
                                                            <div className="text-[11px] font-normal text-slate-500 flex items-center gap-3">
                                                                <span>ไฟล์ทั้งหมด: <b>{totalInYear}</b></span>
                                                                <span className="text-emerald-600">มีแล้ว: <b>{dlInYear}</b></span>
                                                                {pendingInYear > 0 ? (
                                                                    <span className="text-amber-600 font-semibold">⚡ รอโหลด: {pendingInYear}</span>
                                                                ) : (
                                                                    <span className="text-emerald-600 font-semibold">✓ ครบถ้วน</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                                                            {mList.map((m: any, idx: number) => {
                                                                const isComplete = m.status === 'complete';
                                                                const isPending = m.status === 'pending';
                                                                const isEmpty = m.status === 'empty';

                                                                return (
                                                                    <div
                                                                        key={m.key || idx}
                                                                        className={`p-2.5 rounded-xl border transition relative overflow-hidden ${
                                                                            isComplete
                                                                                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                                                                                : isPending
                                                                                ? 'bg-amber-50/70 border-amber-300 text-amber-900 shadow-xs'
                                                                                : 'bg-white border-slate-200 text-slate-600'
                                                                        }`}
                                                                    >
                                                                        <div className="text-xs font-bold tracking-tight mb-1">
                                                                            {m.short_label}
                                                                        </div>
                                                                        <div className="text-[10px] space-y-0.5">
                                                                            <div className="flex justify-between">
                                                                                <span className="text-slate-500">ทั้งหมด:</span>
                                                                                <span className="font-semibold">{m.total_files}</span>
                                                                            </div>
                                                                            <div className="flex justify-between">
                                                                                <span className="text-slate-500">มีแล้ว:</span>
                                                                                <span className="font-semibold text-emerald-600">{m.downloaded_files}</span>
                                                                            </div>
                                                                            <div className="flex justify-between">
                                                                                <span className="text-slate-500">รอโหลด:</span>
                                                                                <span className={`font-semibold ${m.pending_files > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                                                                    {m.pending_files}
                                                                                </span>
                                                                            </div>
                                                                        </div>

                                                                        <div className="mt-1.5 pt-1 border-t border-slate-200/60 text-[10px] font-semibold flex items-center gap-1">
                                                                            {isComplete && <span className="text-emerald-700">✓ ครบ</span>}
                                                                            {isPending && <span className="text-amber-700">⚡ รอ {m.pending_files}</span>}
                                                                            {isEmpty && <span className="text-slate-400">- ไม่มี</span>}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                                            {historicalSummary.months.map((m: any, idx: number) => {
                                                const isComplete = m.status === 'complete';
                                                const isPending = m.status === 'pending';
                                                const isEmpty = m.status === 'empty';

                                                return (
                                                    <div
                                                        key={m.key || idx}
                                                        className={`p-3 rounded-2xl border transition relative overflow-hidden ${
                                                            isComplete
                                                                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                                                                : isPending
                                                                ? 'bg-amber-50/70 border-amber-300 text-amber-900 shadow-xs'
                                                                : 'bg-slate-50 border-slate-200 text-slate-600'
                                                        }`}
                                                    >
                                                        <div className="text-xs font-bold tracking-tight mb-1">
                                                            {m.short_label}
                                                        </div>
                                                        <div className="text-[11px] space-y-0.5">
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-500">ทั้งหมด:</span>
                                                                <span className="font-semibold">{m.total_files}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-500">มีแล้ว:</span>
                                                                <span className="font-semibold text-emerald-600">{m.downloaded_files}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-500">รอโหลด:</span>
                                                                <span className={`font-semibold ${m.pending_files > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                                                    {m.pending_files}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="mt-2 pt-1.5 border-t border-slate-200/60 text-[10px] font-semibold flex items-center gap-1">
                                                            {isComplete && <span className="text-emerald-700">✓ ครบถ้วน</span>}
                                                            {isPending && <span className="text-amber-700">⚡ รอโหลด {m.pending_files}</span>}
                                                            {isEmpty && <span className="text-slate-400">- ไม่มีไฟล์</span>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Progress & Controls Box */}
                            <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${historicalRunning ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                                        <span className="text-xs font-bold text-slate-200">
                                            {historicalRunning
                                                ? 'ระบบกำลังทยอยดาวน์โหลดและกระทบยอดในเบื้องหลัง...'
                                                : historicalProgress?.percent === 100
                                                ? 'การดาวน์โหลดและกระทบยอดเสร็จสิ้นสมบูรณ์ 100%'
                                                : 'พร้อมเริ่มการทยอยดาวน์โหลดในเบื้องหลัง'}
                                        </span>
                                    </div>
                                    <div className="text-xs font-mono font-bold text-emerald-400">
                                        {historicalProgress?.percent ?? (historicalSummary?.pending_download === 0 ? 100 : 0)}%
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700 p-0.5">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                                        style={{ width: `${historicalProgress?.percent ?? (historicalSummary?.pending_download === 0 ? 100 : 0)}%` }}
                                    />
                                </div>

                                {historicalProgress?.current_file && (
                                    <div className="text-xs text-slate-300 flex items-center justify-between bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700/60">
                                        <span className="truncate max-w-[500px]">
                                            กำลังประมวลผล: <span className="font-mono text-emerald-300 font-bold">{historicalProgress.current_file}</span>
                                        </span>
                                        <span className="text-[11px] text-slate-400 shrink-0">
                                            รอบเดือน {historicalProgress.current_month}
                                        </span>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
                                    <div className="text-[11px] text-slate-400">
                                        นำเข้าแล้ว: <span className="font-bold text-white">{historicalProgress?.processed_files ?? 0}</span> ไฟล์ | คงเหลือ: <span className="font-bold text-amber-300">{historicalProgress?.pending_files ?? (historicalSummary?.pending_download ?? 0)}</span> ไฟล์
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {historicalRunning ? (
                                            <button
                                                type="button"
                                                onClick={handlePauseHistoricalSync}
                                                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
                                            >
                                                <Pause className="w-4 h-4" />
                                                หยุดชั่วคราว
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handleStartHistoricalSync}
                                                disabled={historicalStarting || (historicalSummary?.pending_download === 0 && !historicalProgress?.pending_files)}
                                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                                            >
                                                <Play className="w-4 h-4 fill-white" />
                                                {historicalStarting ? 'กำลังเริ่มคิว...' : 'เริ่มทยอยดาวน์โหลดเบื้องหลัง'}
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={handleResetHistoricalSync}
                                            disabled={historicalRunning}
                                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border border-slate-700"
                                            title="ล้างคิวและสถานะ"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                            รีเซ็ต
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Live Terminal Activity Log */}
                            <div>
                                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                                    <span>บันทึกการทำงานสด (Live Activity Stream)</span>
                                    <span className="text-[10px] text-slate-400">แสดง 50 รายการล่าสุด</span>
                                </div>
                                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-[11px] h-40 overflow-y-auto space-y-1">
                                    {historicalLogs.length === 0 ? (
                                        <div className="text-slate-500 italic py-2 text-center">ยังไม่มีบันทึกการทำงาน</div>
                                    ) : (
                                        historicalLogs.map((log, idx) => (
                                            <div key={idx} className="flex items-start gap-2 leading-relaxed">
                                                <span className="text-slate-500 shrink-0">[{log.time}]</span>
                                                <span
                                                    className={
                                                        log.type === 'success'
                                                            ? 'text-emerald-400'
                                                            : log.type === 'warning'
                                                            ? 'text-amber-400'
                                                            : log.type === 'error'
                                                            ? 'text-rose-400 font-bold'
                                                            : 'text-slate-300'
                                                    }
                                                >
                                                    {log.message}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Portal OTP Modal */}
            {requiresOtp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-400">
                                    <KeyRound className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-white">
                                        ระบบยืนยันตัวตน e-Claim 2FA (NHSO IAM)
                                    </h3>
                                    <p className="text-[11px] text-slate-300">
                                        ตั้งค่า Secret Key เพื่อกรอกอัตโนมัติ หรือกรอกรหัส 6 หลักด้วยตนเอง
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setRequiresOtp(false)}
                                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Mode Switch Tabs */}
                        <div className="flex border-b border-slate-100 bg-slate-50/70 p-1.5 gap-1.5 text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => setTotpMode('secret')}
                                className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                                    totpMode === 'secret'
                                        ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/80 font-bold'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                                🔑 ตั้งค่า Secret Key (กรอกอัตโนมัติ 100%)
                            </button>
                            <button
                                type="button"
                                onClick={() => setTotpMode('manual')}
                                className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                                    totpMode === 'manual'
                                        ? 'bg-white text-slate-800 shadow-xs border border-slate-200/80 font-bold'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                📱 กรอกรหัส OTP 6 หลัก
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {totpMode === 'secret' ? (
                                <div className="space-y-4">
                                    <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 space-y-1.5">
                                        <div className="font-bold flex items-center gap-1 text-emerald-800">
                                            <Sparkles className="w-4 h-4 text-emerald-600" />
                                            กรอกครั้งเดียว — ระบบจะล็อกอินและดึงข้อมูลให้อัตโนมัติตลอดไป
                                        </div>
                                        <p className="text-[11.5px] text-emerald-800 leading-relaxed">
                                            นำ <strong>TOTP Secret Key (รหัสตัวอักษร 16–32 ตัว)</strong> จาก Google Authenticator หรือที่ได้จาก e-Claim มาวาง ระบบจะบันทึกลง <code className="bg-emerald-200/60 px-1 py-0.5 rounded font-mono text-[10px]">.env</code> และคำนวณรหัส 6 หลักให้เองทุกครั้งแบบ Zero-Click!
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                            TOTP Secret Key (รหัสลับ 16–32 ตัวอักษร):
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={totpSecretInput}
                                                onChange={(e) => handleTotpSecretChange(e.target.value)}
                                                placeholder="วาง Secret Key เช่น MFWWEQ2... หรือ otpauth-migration://..."
                                                className="w-full p-3 font-mono text-xs tracking-wider border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                                                autoFocus
                                            />
                                        </div>
                                        <p className="text-[10.5px] text-slate-400 mt-1">
                                            รองรับทั้งรหัส Base32 (เช่น MFWWEQ2...) และลิงก์ Export จาก Google Authenticator (otpauth-migration://)
                                        </p>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                        <button
                                            type="button"
                                            onClick={() => setRequiresOtp(false)}
                                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                                        >
                                            ยกเลิก
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSaveTotpAndSync}
                                            disabled={savingTotp || totpSecretInput.trim().length < 8}
                                            className="inline-flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer"
                                        >
                                            <Sparkles className="w-3.5 h-3.5" />
                                            {savingTotp ? 'กำลังบันทึกและล็อกอิน...' : '⚡ บันทึกและดึงข้อมูลอัตโนมัติทันที'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                                        ระบบถามรหัส OTP 6 หลักจากแอป Google Authenticator หรือ SMS สำหรับรอบนี้
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                            รหัส OTP (6 หลัก):
                                        </label>
                                        <input
                                            type="text"
                                            maxLength={6}
                                            value={otpCode}
                                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                            placeholder="เช่น 123456"
                                            className="w-full p-3 text-center tracking-widest text-lg font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                                            autoFocus
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                        <button
                                            type="button"
                                            onClick={() => setRequiresOtp(false)}
                                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                                        >
                                            ยกเลิก
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (showOneClickModal) {
                                                    setRequiresOtp(false);
                                                    handleOneClickSync(otpCode);
                                                } else {
                                                    handleTriggerAutoSync(otpCode);
                                                }
                                            }}
                                            disabled={otpSubmitting || otpCode.length < 6}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                                        >
                                            <Check className="w-3.5 h-3.5" />
                                            {otpSubmitting ? 'กำลังตรวจสอบ...' : 'ยืนยันรหัสรอบนี้'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* One-Click Comprehensive Sync Modal */}
            {showOneClickModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white flex items-center justify-between border-b border-teal-800/40">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl text-emerald-400">
                                    <Sparkles className="w-6 h-6 animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                                        ระบบประมวลผล RCM ครบวงจรในปุ่มเดียว (Single Source of Truth)
                                    </h3>
                                    <p className="text-xs text-slate-300 mt-0.5">
                                        ดึง Statement (STM) + REP + Hot-Folder + SMT พร้อมตัดยอดติด C และอัปเดต 3 ฝ่ายอัตโนมัติ
                                    </p>
                                </div>
                            </div>
                            {!oneClickSyncing && (
                                <button
                                    type="button"
                                    onClick={() => setShowOneClickModal(false)}
                                    className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        {/* Content Body */}
                        <div className="p-6 space-y-6">
                            {/* Step: Running */}
                            {oneClickStep === 'running' && (
                                <div className="space-y-6 py-2">
                                    <div className="flex flex-col items-center justify-center text-center space-y-3">
                                        <div className="relative">
                                            <div className="w-16 h-16 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin" />
                                            <Sparkles className="w-6 h-6 text-emerald-600 absolute inset-0 m-auto animate-pulse" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800">
                                                กำลังดำเนินการประมวลผลครบวงจรเบื้องหลัง...
                                            </h4>
                                            <p className="text-xs text-slate-500 mt-1 max-w-md">
                                                ระบบกำลังดึงข้อมูล STM/REP ผ่าน Zero-Click Auth, ตรวจสอบแฟ้ม Auto4STM, สแกน SMT, ตรวจสอบตัดยอดติด C/อุทธรณ์ และกระทบยอด 3 ฝ่าย
                                            </p>
                                        </div>
                                    </div>

                                    {/* Multi-phase status indicator */}
                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                                        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                            ขั้นตอนการทำงานอัตโนมัติ:
                                        </div>
                                        <div className="space-y-2 text-xs">
                                            <div className="flex items-center gap-2.5 text-slate-700">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                                <span>1. ยืนยันตัวตน Zero-Click Auth (RFC 6238 TOTP) & เชื่อมต่อ Portal</span>
                                            </div>
                                            <div className="flex items-center gap-2.5 text-slate-700">
                                                <div className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
                                                <span>2. ดาวน์โหลด & นำเข้า Statement (STM) และ REP ล่าสุด</span>
                                            </div>
                                            <div className="flex items-center gap-2.5 text-slate-700">
                                                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
                                                <span>3. สแกน Hot-Folder บอท Auto4STM ในเครื่อง</span>
                                            </div>
                                            <div className="flex items-center gap-2.5 text-slate-700">
                                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                                                <span>4. ตรวจสอบข้อมูลการชดเชยจากระบบ SMT</span>
                                            </div>
                                            <div className="flex items-center gap-2.5 text-slate-700">
                                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                                <span>5. ตรวจสอบและตัดยอดรายการติด C / อุทธรณ์ที่ได้รับเงินชดเชยแล้ว & ปรับปรุง IM-11</span>
                                            </div>
                                            <div className="flex items-center gap-2.5 text-slate-700">
                                                <div className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                                                <span>6. คำนวณและปรับยอดเปรียบเทียบ 3 ฝ่าย (HOSxP vs REP vs STM)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step: Completed */}
                            {oneClickStep === 'completed' && oneClickResult && (
                                <div className="space-y-5">
                                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                        <div>
                                            <div className="text-sm font-bold text-emerald-900">
                                                ประมวลผล RCM ครบวงจรเสร็จสมบูรณ์!
                                            </div>
                                            <div className="text-xs text-emerald-700 mt-0.5">
                                                {oneClickResult.message || 'ระบบได้เชื่อมโยง STM, ตัดยอดติด C และอัปเดตตารางเปรียบเทียบ 3 ฝ่ายเรียบร้อย'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                                            <div className="text-[11px] font-medium text-slate-500">เอกสาร STM นำเข้า</div>
                                            <div className="text-xl font-bold text-slate-800 mt-1">
                                                {oneClickResult.summary?.stm_files_imported ?? 0} <span className="text-xs font-normal text-slate-500">ไฟล์</span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">ดาวน์โหลดจาก Portal</div>
                                        </div>

                                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                                            <div className="text-[11px] font-medium text-slate-500">เอกสาร REP นำเข้า</div>
                                            <div className="text-xl font-bold text-slate-800 mt-1">
                                                {oneClickResult.summary?.rep_files_imported ?? 0} <span className="text-xs font-normal text-slate-500">ไฟล์</span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">e-Claim Validation</div>
                                        </div>

                                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                                            <div className="text-[11px] font-medium text-slate-500">จาก Hot-Folder บอท</div>
                                            <div className="text-xl font-bold text-slate-800 mt-1">
                                                {oneClickResult.summary?.hotfolder_files_imported ?? 0} <span className="text-xs font-normal text-slate-500">ไฟล์</span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">Auto4STM local</div>
                                        </div>

                                        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl col-span-2 md:col-span-1">
                                            <div className="text-[11px] font-medium text-emerald-700">ตัดยอดติด C สำเร็จ</div>
                                            <div className="text-xl font-bold text-emerald-800 mt-1">
                                                {oneClickResult.summary?.c_deny_settled_count ?? 0} <span className="text-xs font-normal text-emerald-600">รายการ</span>
                                            </div>
                                            <div className="text-[10px] text-emerald-600 mt-0.5">
                                                ยอดเงิน {formatMoney(Number(oneClickResult.summary?.c_deny_settled_amount || 0))}
                                            </div>
                                        </div>

                                        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl">
                                            <div className="text-[11px] font-medium text-amber-700">อุทธรณ์ที่ปลดล็อก</div>
                                            <div className="text-xl font-bold text-amber-800 mt-1">
                                                {oneClickResult.summary?.appeal_settled_count ?? 0} <span className="text-xs font-normal text-amber-600">เคส</span>
                                            </div>
                                            <div className="text-[10px] text-amber-600 mt-0.5">ปรับสถานะเรียบร้อย</div>
                                        </div>

                                        <div className="p-3.5 bg-cyan-50 border border-cyan-200 rounded-2xl">
                                            <div className="text-[11px] font-medium text-cyan-700">เปรียบเทียบ 3 ฝ่าย</div>
                                            <div className="text-xl font-bold text-cyan-800 mt-1">
                                                พร้อมใช้งาน
                                            </div>
                                            <div className="text-[10px] text-cyan-600 mt-0.5">HOSxP vs REP vs STM</div>
                                        </div>
                                    </div>

                                    {/* Phases List */}
                                    {oneClickResult.phases && (
                                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                                            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                                บันทึกขั้นตอนการดำเนินการ:
                                            </div>
                                            <div className="space-y-1.5 text-xs">
                                                {Object.entries(oneClickResult.phases).map(([key, p]: [string, any]) => (
                                                    <div key={key} className="flex items-center justify-between text-slate-600">
                                                        <span className="flex items-center gap-1.5">
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                                            {p.name || key}
                                                        </span>
                                                        <span className="font-semibold text-slate-700">{p.message}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step: Error */}
                            {oneClickStep === 'error' && oneClickResult && (
                                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                                    <div className="flex items-center gap-2 font-bold text-sm text-rose-800">
                                        <AlertOctagon className="w-5 h-5 text-rose-600" />
                                        การประมวลผลเกิดข้อผิดพลาด
                                    </div>
                                    <p className="text-xs text-rose-700">
                                        {oneClickResult.message || 'ไม่สามารถดำเนินการให้เสร็จสิ้นได้ กรุณาตรวจสอบการตั้งค่าบัญชีหรือรหัสผ่าน Portal'}
                                    </p>
                                </div>
                            )}

                            {/* Footer Actions */}
                            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                                {oneClickStep === 'error' && (
                                    <button
                                        type="button"
                                        onClick={() => handleOneClickSync()}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition"
                                    >
                                        ลองใหม่อีกครั้ง
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowOneClickModal(false);
                                        if (oneClickStep === 'completed') {
                                            router.reload();
                                        }
                                    }}
                                    disabled={oneClickSyncing}
                                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                                >
                                    {oneClickStep === 'completed' ? 'ปิดและดูข้อมูลที่อัปเดต' : 'ปิด'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </RcmLayout>
    );
}
