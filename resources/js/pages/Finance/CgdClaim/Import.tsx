import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import QRCode from 'qrcode';
import { FileSpreadsheet, Upload, RefreshCw, AlertTriangle, Info, X, KeyRound, CloudDownload, Shield, CheckCircle2, FileCheck, Layers, ChevronDown, ChevronUp, Banknote, Eye, EyeOff, QrCode as QrIcon, Copy, Check } from 'lucide-react';
import { QualityPage, Panel, StatusPill } from '@/components/quality/quality-ui';
import DataHubSubNav, { dataHubBreadcrumbs } from '../DataHub/DataHubSubNav';
import ClaimModuleSubNav from '../DataHub/ClaimModuleSubNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import DeleteBatchButton from './DeleteBatchButton';
import { claimRoute, resolveClaimModule, type ClaimModuleMeta } from './claimModule';

interface BatchRow {
    id: number;
    filename: string;
    document_no: string | null;
    file_kind?: string | null;
    row_count: number;
    total_claim: number;
    total_approved: number;
    visit_date_min: string | null;
    visit_date_max: string | null;
    status: string;
    created_at: string;
    imported_by?: string | null;
    latest_reconciliation: { total_shortfall: number } | null;
}

export interface ScannedFileItem {
    filename: string;
    base_name: string;
    url: string;
    already_downloaded: boolean;
    batch?: {
        id: number;
        document_no?: string | null;
        row_count: number;
        total_approved: number;
        created_at: string;
    } | null;
}

export interface ScanSummary {
    total_files: number;
    allowed_files: number;
    new_files: number;
    existing_files: number;
    skipped_wrong_name: number;
    scanned_at?: string;
    files: ScannedFileItem[];
}

interface NhsoPortal {
    configured: boolean;
    has_totp?: boolean;
    session: {
        phase?: string;
        year?: number;
        month?: number;
        started_at?: string;
        totp_secret?: string | null;
        totp_qr?: string | null;
        has_totp_secret?: boolean;
        current_otp?: string | null;
        totp_remaining?: number;
        pending_downloads?: number;
        download_done?: number;
        download_total?: number;
        scan_summary?: ScanSummary | null;
    } | null;
    validation_url: string;
    username_hint?: string | null;
}

interface Props {
    hosxpReady: boolean;
    nhsoPortal: NhsoPortal;
    filenamePrefix?: string;
    batches: {
        data: BatchRow[];
        links: { url: string | null; label: string; active: boolean }[];
    };
    module?: ClaimModuleMeta;
    smtSummary?: {
        total_all: number;
        total_lgo: number;
        total_uc: number;
        total_ckd: number;
        count_all: number;
        count_lgo: number;
        count_uc: number;
        count_ckd: number;
    } | null;
}

const MONTHS = [
    { v: 1, l: 'ม.ค.' }, { v: 2, l: 'ก.พ.' }, { v: 3, l: 'มี.ค.' }, { v: 4, l: 'เม.ย.' },
    { v: 5, l: 'พ.ค.' }, { v: 6, l: 'มิ.ย.' }, { v: 7, l: 'ก.ค.' }, { v: 8, l: 'ส.ค.' },
    { v: 9, l: 'ก.ย.' }, { v: 10, l: 'ต.ค.' }, { v: 11, l: 'พ.ย.' }, { v: 12, l: 'ธ.ค.' },
];

const money = (n: number) =>
    new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const ALLOWED_EXT = ['.xls', '.xlsx', '.csv'];
const MAX_FILES = 50;
const DEFAULT_REP_PREFIX = 'rep_eclaim_14689_OPCS';

function isAllowedFile(file: File): boolean {
    const name = file.name.toLowerCase();
    return ALLOWED_EXT.some((ext) => name.endsWith(ext));
}

function matchesPrefix(name: string, prefix: string): boolean {
    const lower = name.toLowerCase();
    const p = prefix.toLowerCase();
    const core = p.replace(/^rep_/, '');
    const withRep = p.startsWith('rep_') ? p : `rep_${core}`;
    // รองรับทั้ง eclaim_* และ rep_eclaim_* (NHSO มักไม่มีคำว่า rep_)
    if (lower.startsWith(p) || lower.startsWith(core) || lower.startsWith(withRep)) return true;
    if (lower.includes('_appeal')) {
        return lower.includes(`${core}_appeal`);
    }
    return false;
}

function prefixHint(prefix: string): string {
    const p = prefix.toLowerCase();
    const core = p.replace(/^rep_/, '');
    const withRep = p.startsWith('rep_') ? p : `rep_${core}`;
    return core === withRep ? prefix : `${core} หรือ ${withRep}`;
}

function mergeFiles(current: File[], incoming: FileList | File[], prefix: string): { files: File[]; rejected: string[] } {
    const map = new Map<string, File>();
    const rejected: string[] = [];
    for (const file of current) {
        map.set(`${file.name}::${file.size}::${file.lastModified}`, file);
    }
    for (const file of Array.from(incoming)) {
        if (!isAllowedFile(file)) continue;
        if (!matchesPrefix(file.name, prefix)) {
            rejected.push(file.name);
            continue;
        }
        map.set(`${file.name}::${file.size}::${file.lastModified}`, file);
    }
    return { files: Array.from(map.values()).slice(0, MAX_FILES), rejected };
}

export default function CgdClaimImport({ hosxpReady, batches, nhsoPortal, filenamePrefix, module, smtSummary }: Props) {
    const mod = resolveClaimModule(module);
    const repPrefix = filenamePrefix || mod.rep_prefix || DEFAULT_REP_PREFIX;
    const allowedPrefixHint = prefixHint(repPrefix);
    const isRepOnly = mod.primary_source === 'rep' || mod.key === 'lgo';
    const { flash, errors } = usePage().props as {
        flash?: { success?: string; import_failures?: string[]; nhso_status?: string };
        errors?: Record<string, string>;
    };
    const [dragOver, setDragOver] = useState(false);
    const [rejectedNames, setRejectedNames] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(String(nhsoPortal?.session?.year || currentYear));
    const [month, setMonth] = useState(String(nhsoPortal?.session?.month || new Date().getMonth() + 1));
    const form = useForm<{
        files: File[];
        notes: string;
        auto_reconcile: boolean;
    }>({
        files: [],
        notes: '',
        auto_reconcile: false,
    });
    const [customCreds, setCustomCreds] = useState(Boolean(errors?.nhso));
    const [showPassword, setShowPassword] = useState(false);
    const [qrFallback, setQrFallback] = useState('');
    const [copiedSecret, setCopiedSecret] = useState(false);

    useEffect(() => {
        if (nhsoPortal?.session?.phase === 'configure_totp' && nhsoPortal?.session?.totp_secret && !nhsoPortal?.session?.totp_qr) {
            QRCode.toDataURL(`otpauth://totp/NHSO%20e-Claim?secret=${nhsoPortal.session.totp_secret}&issuer=NHSO`, { width: 220, margin: 1 })
                .then(setQrFallback)
                .catch(() => setQrFallback(''));
        }
    }, [nhsoPortal?.session?.phase, nhsoPortal?.session?.totp_secret, nhsoPortal?.session?.totp_qr]);
    const [countdown, setCountdown] = useState<number>(30);

    useEffect(() => {
        const updateTimer = () => {
            const sec = Math.floor(Date.now() / 1000);
            setCountdown(30 - (sec % 30));
        };
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, []);

    const startForm = useForm({
        year: Number(year),
        month: Number(month),
        username: '',
        password: '',
        totp_secret: '',
        remember: true,
        auto_otp: true,
    });
    const otpForm = useForm({
        otp: '',
        remember_totp: true,
    });

    useEffect(() => {
        if (nhsoPortal?.session?.current_otp && !otpForm.data.otp) {
            otpForm.setData('otp', nhsoPortal.session.current_otp);
        }
    }, [nhsoPortal?.session?.current_otp]);
    const scanForm = useForm({});
    const [showFileList, setShowFileList] = useState(false);
    const downloadForm = useForm<{
        notes: string;
        auto_reconcile: boolean;
        batch_size: number;
        skip_existing: boolean;
    }>({
        notes: '',
        auto_reconcile: false,
        batch_size: 5,
        skip_existing: true,
    });
    const pendingDownloads = nhsoPortal?.session?.pending_downloads || 0;
    const downloadDone = nhsoPortal?.session?.download_done || 0;
    const downloadTotal = nhsoPortal?.session?.download_total || 0;
    const scanSummary = nhsoPortal?.session?.scan_summary;

    const handleScan = () => {
        scanForm.post(claimRoute(mod, 'nhso_scan'));
    };

    const postDownload = (batchSize: number, customSkipExisting?: boolean) => {
        downloadForm.transform((data) => ({
            ...data,
            batch_size: batchSize,
            skip_existing: customSkipExisting !== undefined ? customSkipExisting : data.skip_existing,
        }));
        downloadForm.post(claimRoute(mod, 'nhso_download'), {
            onFinish: () => {
                downloadForm.transform((data) => data);
            },
        });
    };

    const phase = nhsoPortal?.session?.phase || 'idle';
    const years = useMemo(() => [currentYear, currentYear - 1, currentYear - 2, currentYear - 3], [currentYear]);

    const totalSizeMb = useMemo(
        () => form.data.files.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024),
        [form.data.files],
    );

    const setFiles = (next: File[]) => {
        form.setData('files', next);
        form.clearErrors('files');
    };

    const addFiles = (list: FileList | File[] | null | undefined) => {
        if (!list || list.length === 0) return;
        const { files, rejected } = mergeFiles(form.data.files, list, repPrefix);
        setFiles(files);
        setRejectedNames(rejected);
    };

    const removeFile = (index: number) => {
        setFiles(form.data.files.filter((_, i) => i !== index));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const clearFiles = () => {
        setFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (form.data.files.length === 0) return;

        form.post(claimRoute(mod, 'import_store'), {
            forceFormData: true,
            onSuccess: () => {
                clearFiles();
            },
        });
    };

    return (
        <QualityPage
            tone="emerald"
            icon={Upload}
            badge="Financial Data Hub"
            title={mod.labels.import_rep}
            subtitle={`REP ปกติ = ผลชดเชย/Error · ไฟล์ _APPEAL = ผลอุทธรณ์เงินชดเชย · ชื่อไฟล์ ${allowedPrefixHint}${mod.key === 'lgo' ? ' เท่านั้น' : ''} · เลือกได้หลายไฟล์ · ไฟล์ซ้ำจะอัปเดตชุดเดิม`}
            breadcrumbs={dataHubBreadcrumbs({ title: mod.labels.import_rep, href: claimRoute(mod, 'import') })}
            headTitle={mod.labels.import_rep}
            subNav={<DataHubSubNav active={mod.routes.dashboard} />}
        >
            <ClaimModuleSubNav
                dashboardUrl={claimRoute(mod, 'dashboard')}
                compareUrl={claimRoute(mod, 'compare_page')}
                importUrl={claimRoute(mod, 'import')}
                stmUrl={mod.has_stm ? claimRoute(mod, 'stm_index') : undefined}
                precheckUrl={mod.key === 'cgd' ? claimRoute(mod, 'precheck') : undefined}
                importLabel={mod.labels.import_rep}
                active="import"
            />

            {flash?.success && (
                <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {flash.success}
                </div>
            )}

            {Array.isArray(flash?.import_failures) && flash.import_failures.length > 0 && (
                <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                    <div className="font-semibold">ไฟล์ที่ไม่สำเร็จ</div>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                        {flash.import_failures.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </div>
            )}

            {!hosxpReady && (
                <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    HOSxP ยังไม่พร้อม — แนะนำให้เปิด auto-reconcile หลังเชื่อมต่อได้แล้ว
                </div>
            )}

            {mod.key === 'lgo' && (
                <div className="mb-6 rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-blue-50/60 p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-md shadow-sky-600/20">
                                <Banknote className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    ใช้ข้อมูลเงินโอนจริงจากระบบ สปสช. SMT แทนการดาวน์โหลด e-Claim
                                </h3>
                                <p className="text-xs text-slate-500">
                                    ไม่ต้องเข้าสู่ระบบด้วย OTP หรือรอไฟล์จาก e-Claim — ดึงยอดเงินโอนจริงจากเว็บ smt.nhso.go.th ได้ทันที
                                </p>
                            </div>
                        </div>

                        <Button asChild className="rounded-xl bg-sky-600 hover:bg-sky-700 shadow-sm">
                            <Link href={route('finance.smt.index', { budget_source: 'lgo' })}>
                                เปิดระบบดึงข้อมูล SMT
                            </Link>
                        </Button>
                    </div>

                    {smtSummary && (
                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div className="rounded-2xl border border-sky-100 bg-white p-3">
                                <div className="text-[11px] font-semibold text-sky-700">อปท. รับเงินโอนแล้ว</div>
                                <div className="mt-1 text-lg font-bold text-sky-950">
                                    ฿{Number(smtSummary.total_lgo || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-[11px] text-slate-500">{smtSummary.count_lgo} งวดโอน</div>
                            </div>
                            <div className="rounded-2xl border border-emerald-100 bg-white p-3">
                                <div className="text-[11px] font-semibold text-emerald-700">บัตรทอง (UC)</div>
                                <div className="mt-1 text-lg font-bold text-emerald-950">
                                    ฿{Number(smtSummary.total_uc || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-[11px] text-slate-500">{smtSummary.count_uc} งวดโอน</div>
                            </div>
                            <div className="rounded-2xl border border-purple-100 bg-white p-3">
                                <div className="text-[11px] font-semibold text-purple-700">กองทุนไตวาย (CKD)</div>
                                <div className="mt-1 text-lg font-bold text-purple-950">
                                    ฿{Number(smtSummary.total_ckd || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-[11px] text-purple-600 font-medium">{smtSummary.count_ckd} งวดโอน (แยกเด็ดขาด)</div>
                            </div>
                            <div className="rounded-2xl border border-slate-100 bg-white p-3">
                                <div className="text-[11px] font-semibold text-slate-500">รวมทั้งหมดในระบบ</div>
                                <div className="mt-1 text-lg font-bold text-slate-900">
                                    ฿{Number(smtSummary.total_all || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-[11px] text-slate-400">{smtSummary.count_all} งวดโอน</div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <Panel
                title="ดาวน์โหลด REP จาก e-Claim NHSO (OFC)"
                description="หลัง login จะไปที่หน้า Validation OFC แล้วดาวน์โหลดทั้งเดือนนำเข้า (ซ้ำแล้วอัปเดต)"
                className="mb-6"
                action={
                    nhsoPortal.session ? (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-xl"
                            onClick={() => router.post(claimRoute(mod, 'nhso_clear'))}
                        >
                            ล้าง session
                        </Button>
                    ) : undefined
                }
            >
                {!nhsoPortal?.configured ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                        <div className="flex items-start gap-2">
                            <Shield className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                                ยังไม่ได้ตั้งค่าบัญชี NHSO ในไฟล์ <code className="rounded bg-white/80 px-1">.env</code>
                                <div className="mt-2 font-mono text-xs leading-relaxed text-amber-900/90">
                                    CGD_ECLAIM_USERNAME=...
                                    <br />
                                    CGD_ECLAIM_PASSWORD=...
                                </div>
                                <div className="mt-2 text-xs">
                                    เป้าหมาย:{' '}
                                    <a className="underline" href={nhsoPortal.validation_url} target="_blank" rel="noreferrer">
                                        Validation OFC
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <StatusPill
                                label={
                                    phase === 'configure_totp'
                                        ? 'ตั้งค่า Authenticator'
                                        : phase === 'awaiting_otp'
                                          ? 'รอ OTP'
                                          : phase === 'authenticated'
                                            ? 'พร้อมดาวน์โหลด'
                                            : phase === 'done'
                                              ? 'เสร็จแล้ว'
                                              : 'รอเริ่ม'
                                }
                                className={
                                    phase === 'authenticated'
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : phase === 'awaiting_otp' || phase === 'configure_totp'
                                          ? 'border-amber-200 bg-amber-50 text-amber-800'
                                          : 'border-slate-200 bg-slate-50 text-slate-600'
                                }
                            />
                            {nhsoPortal.has_totp && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                                    ⚡ ผูก OTP อัตโนมัติแล้ว
                                </span>
                            )}
                            {nhsoPortal.username_hint && <span>บัญชี: {nhsoPortal.username_hint}</span>}
                            {nhsoPortal.session?.year && nhsoPortal.session?.month && (
                                <span>
                                    เดือนเป้าหมาย: {MONTHS.find((m) => m.v === nhsoPortal.session?.month)?.l}/
                                    {(nhsoPortal.session.year || 0) + 543}
                                </span>
                            )}
                        </div>

                        {(errors?.nhso || errors?.otp) && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 space-y-1">
                                <div className="font-semibold flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                                    <span>แจ้งเตือนจากระบบยืนยันตัวตน e-Claim / NHSO IAM</span>
                                </div>
                                <p className="text-xs text-rose-700 leading-relaxed">
                                    {errors.nhso || errors.otp}
                                </p>
                            </div>
                        )}

                        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                            <div className="space-y-1">
                                <Label>ปี (ค.ศ.)</Label>
                                <Select
                                    value={year}
                                    onValueChange={(v) => {
                                        setYear(v);
                                        startForm.setData('year', Number(v));
                                    }}
                                    disabled={phase === 'awaiting_otp' || phase === 'configure_totp' || phase === 'authenticated'}
                                >
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {years.map((y) => (
                                            <SelectItem key={y} value={String(y)}>
                                                {y + 543} ({y})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>เดือน</Label>
                                <Select
                                    value={month}
                                    onValueChange={(v) => {
                                        setMonth(v);
                                        startForm.setData('month', Number(v));
                                    }}
                                    disabled={phase === 'awaiting_otp' || phase === 'configure_totp' || phase === 'authenticated'}
                                >
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MONTHS.map((m) => (
                                            <SelectItem key={m.v} value={String(m.v)}>
                                                {m.l}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                type="button"
                                className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                                disabled={startForm.processing || (!nhsoPortal.configured && !startForm.data.password)}
                                onClick={() => {
                                    startForm.setData({
                                        year: Number(year),
                                        month: Number(month),
                                        username: startForm.data.username,
                                        password: startForm.data.password,
                                        totp_secret: startForm.data.totp_secret,
                                        remember: startForm.data.remember,
                                        auto_otp: startForm.data.auto_otp,
                                    });
                                    startForm.post(claimRoute(mod, 'nhso_start'));
                                }}
                            >
                                <KeyRound className="mr-2 h-4 w-4" />
                                {startForm.processing ? 'กำลังเข้าสู่ระบบ...' : '1) เริ่มเข้าสู่ระบบ'}
                            </Button>
                        </div>

                        {/* กล่องตั้งค่า / เปลี่ยนรหัสผ่าน e-Claim ในกรณีรหัสผ่านหมดอายุ 90 วัน หรือเพิ่งเปลี่ยนใหม่ */}
                        {(phase === 'idle' || phase === 'unknown') && (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 transition-all">
                                <div className="flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setCustomCreds(!customCreds)}
                                        className="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                                    >
                                        <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                                        <span>ระบุรหัสผ่าน e-Claim / รหัสลับ Authenticator (OTP) สำหรับเข้าสู่ระบบอัตโนมัติ</span>
                                        {customCreds ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                    </button>
                                    <span className="text-[11px] text-slate-400">สปสช. บังคับเปลี่ยนรหัสผ่านทุก 90 วัน</span>
                                </div>

                                {customCreds && (
                                    <div className="mt-3 space-y-3 pt-3 border-t border-slate-200/80">
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="space-y-1">
                                                <Label className="text-xs text-slate-600">ชื่อผู้ใช้งาน (Citizen ID 13 หลัก)</Label>
                                                <Input
                                                    placeholder="5710430101150 (เว้นว่างเพื่อใช้ค่าเดิม)"
                                                    value={startForm.data.username}
                                                    onChange={(e) => startForm.setData('username', e.target.value)}
                                                    className="rounded-xl text-xs bg-white"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs text-slate-600">รหัสผ่านใหม่ (e-Claim Password)</Label>
                                                <div className="relative">
                                                    <Input
                                                        type={showPassword ? 'text' : 'password'}
                                                        placeholder="กรอกรหัสผ่าน e-Claim ล่าสุด"
                                                        value={startForm.data.password}
                                                        onChange={(e) => startForm.setData('password', e.target.value)}
                                                        className="rounded-xl text-xs bg-white pr-9"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                    >
                                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-1 sm:col-span-2">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs text-slate-600">รหัสลับ Google Authenticator (TOTP Secret Key) — สำหรับกรอก OTP อัตโนมัติ</Label>
                                                    <span className="text-[11px] text-emerald-700 font-medium">แนะนำ: กรอกครั้งเดียว One-Click Login ตลอดไป</span>
                                                </div>
                                                <Input
                                                    placeholder="เช่น JBSWY3DPEHPK3PXP (เว้นว่างเพื่อใช้ค่าเดิมใน .env)"
                                                    value={startForm.data.totp_secret}
                                                    onChange={(e) => startForm.setData('totp_secret', e.target.value)}
                                                    className="rounded-xl text-xs bg-white font-mono"
                                                />
                                                <p className="text-[11px] text-slate-500">
                                                    หากระบุ Secret Key ไว้ ระบบจะคำนวณรหัส OTP 6 หลักและยืนยันให้อัตโนมัติทันที ไม่ต้องเปิดโทรศัพท์ดูรหัส
                                                </p>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5 pt-1">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="auto_otp_check"
                                                    checked={startForm.data.auto_otp}
                                                    onChange={(e) => startForm.setData('auto_otp', e.target.checked)}
                                                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                />
                                                <label htmlFor="auto_otp_check" className="text-xs text-slate-700 font-medium cursor-pointer">
                                                    ยืนยัน OTP อัตโนมัติทันทีเมื่อเข้าสู่ระบบ (One-Click Auto-Submit OTP)
                                                </label>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="remember_nhso_pwd"
                                                    checked={startForm.data.remember}
                                                    onChange={(e) => startForm.setData('remember', e.target.checked)}
                                                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                />
                                                <label htmlFor="remember_nhso_pwd" className="text-xs text-slate-600 cursor-pointer">
                                                    บันทึกรหัสผ่านและ Secret Key นี้ลงในระบบ (.env) เพื่อไม่ต้องกรอกใหม่ในครั้งถัดไป
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {(phase === 'awaiting_otp' || phase === 'configure_totp') && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm space-y-4">
                                <div>
                                    <div className="flex items-center gap-2 text-sm font-bold text-amber-950">
                                        <KeyRound className="h-4 w-4 text-amber-600" />
                                        {phase === 'configure_totp'
                                            ? '2) ตั้งค่าผูก Google Authenticator ใหม่ (ครั้งแรกของบัญชีนี้)'
                                            : '2) กรอกรหัสยืนยันตัวตน Google Authenticator (6 หลัก)'}
                                    </div>
                                    <div className="mt-1 text-xs text-amber-900/90 leading-relaxed">
                                        {phase === 'configure_totp'
                                            ? 'บัญชี e-Claim ของท่านอยู่ในขั้นตอนตั้งค่าความปลอดภัยครั้งแรก โปรดสแกน QR Code ด้านล่างนี้เพื่อเพิ่มบัญชีลงในแอป แล้วนำรหัส 6 หลักจากรายการที่เพิ่งเพิ่มใหม่มากรอก'
                                            : 'เปิดแอป Google Authenticator หรือ Microsoft Authenticator บนโทรศัพท์ แล้วกรอกรหัส 6 หลักปัจจุบัน'}
                                    </div>
                                </div>

                                {phase === 'configure_totp' && (
                                    <div className="rounded-2xl border border-amber-300 bg-white p-4 shadow-sm space-y-3">
                                        <div className="text-center">
                                            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                                                <QrIcon className="h-3.5 w-3.5" />
                                                <span>ขั้นตอนที่ 1: สแกน QR Code เพื่อเพิ่มบัญชีลงในแอป</span>
                                            </div>

                                            <div className="mt-3 flex justify-center">
                                                {nhsoPortal.session?.totp_qr ? (
                                                    <div className="rounded-2xl border-2 border-amber-200 bg-white p-2 shadow-sm">
                                                        <img
                                                            src={nhsoPortal.session.totp_qr}
                                                            alt="QR Code สำหรับผูก Authenticator"
                                                            className="h-48 w-48 object-contain"
                                                        />
                                                    </div>
                                                ) : qrFallback ? (
                                                    <div className="rounded-2xl border-2 border-amber-200 bg-white p-2 shadow-sm">
                                                        <img
                                                            src={qrFallback}
                                                            alt="QR Code สำหรับผูก Authenticator"
                                                            className="h-48 w-48 object-contain"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="flex h-48 w-48 items-center justify-center rounded-2xl border border-dashed border-slate-300 text-xs text-slate-400">
                                                        กำลังโหลด QR Code...
                                                    </div>
                                                )}
                                            </div>

                                            <p className="mt-2 text-xs text-slate-500">
                                                เปิดแอป <span className="font-semibold text-slate-700">Google Authenticator</span> ในโทรศัพท์ → กดปุ่ม <span className="font-semibold text-slate-700">+ (เพิ่ม)</span> → เลือก <span className="font-semibold text-slate-700">สแกน QR โค้ด</span>
                                            </p>
                                        </div>

                                        {nhsoPortal.session?.totp_secret && (
                                            <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-center">
                                                <div className="text-[11px] text-slate-500">หากกล้องสแกนไม่ได้ ให้เพิ่มแบบคีย์ด้วยตนเอง (Manual Key):</div>
                                                <div className="mt-1 flex items-center justify-center gap-2">
                                                    <code className="rounded bg-white px-2 py-0.5 font-mono text-xs font-bold text-slate-800 border border-slate-200">
                                                        {nhsoPortal.session.totp_secret}
                                                    </code>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 text-xs rounded-lg"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(nhsoPortal.session?.totp_secret || '');
                                                            setCopiedSecret(true);
                                                            setTimeout(() => setCopiedSecret(false), 2000);
                                                        }}
                                                    >
                                                        {copiedSecret ? <Check className="h-3 w-3 text-emerald-600 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                                                        {copiedSecret ? 'คัดลอกแล้ว' : 'คัดลอกรหัสลับ'}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900 leading-relaxed flex items-start gap-2">
                                            <Info className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                                            <div>
                                                <span className="font-bold">⚠️ สำคัญมาก:</span> รหัสตัวเลข 6 หลักที่จะกรอกด้านล่างนี้ <strong>ต้องมาจากรายการ e-Claim ที่เพิ่งสแกน QR Code นี้เท่านั้น</strong> หากใช้รหัสจาก e-Claim เดิมที่เคยมีอยู่ในโทรศัพท์ ระบบจะแจ้งว่ารหัสไม่ถูกต้อง (เพราะรหัสลับคนละชุดกัน)
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <div className="flex items-center justify-between text-xs font-semibold text-amber-950 mb-1.5">
                                        <span>
                                            {phase === 'configure_totp'
                                                ? 'ขั้นตอนที่ 2: กรอกรหัส 6 หลักจากรายการที่เพิ่งสแกน'
                                                : 'กรอกรหัส 6 หลักจากแอป Authenticator'}
                                        </span>
                                        <span className="flex items-center gap-1.5 font-normal text-amber-800">
                                            <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                            รอบรหัสปัจจุบันเหลืออีก: <strong className="font-mono font-bold text-amber-950">{countdown}</strong> วินาที
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-end gap-3">
                                        <div className="space-y-1">
                                            <Input
                                                id="nhso-otp"
                                                inputMode="numeric"
                                                maxLength={6}
                                                placeholder="000000"
                                                className="w-44 rounded-xl font-mono text-xl tracking-[0.3em] bg-white text-center font-bold text-slate-900 shadow-sm"
                                                value={otpForm.data.otp}
                                                onChange={(e) =>
                                                    otpForm.setData('otp', e.target.value.replace(/\D/g, '').slice(0, 6))
                                                }
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            className="rounded-xl bg-amber-600 hover:bg-amber-700 shadow-sm font-semibold"
                                            disabled={otpForm.processing || otpForm.data.otp.length !== 6}
                                            onClick={() => otpForm.post(claimRoute(mod, 'nhso_otp'))}
                                        >
                                            {otpForm.processing ? 'กำลังตรวจสอบ...' : 'ยืนยันรหัส OTP'}
                                        </Button>

                                        {nhsoPortal.session?.current_otp && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="rounded-xl border-amber-300 bg-amber-100/70 hover:bg-amber-200 text-amber-950 text-xs font-semibold"
                                                onClick={() => {
                                                    otpForm.setData('otp', nhsoPortal.session?.current_otp || '');
                                                }}
                                            >
                                                ⚡ ใส่รหัสอัตโนมัติ ({nhsoPortal.session.current_otp})
                                            </Button>
                                        )}
                                    </div>

                                    {phase === 'configure_totp' && (
                                        <div className="pt-2">
                                            <label className="flex items-center gap-2 text-xs text-amber-900 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={otpForm.data.remember_totp}
                                                    onChange={(e) => otpForm.setData('remember_totp', e.target.checked)}
                                                    className="h-3.5 w-3.5 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                                                />
                                                บันทึกรหัสลับ (Secret Key) นี้ลงระบบอัตโนมัติ (.env) เพื่อเข้าสู่ระบบครั้งถัดไปโดยไม่ต้องกรอก OTP อีก
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {phase === 'authenticated' && (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-4">
                                <div>
                                    <div className="text-sm font-semibold text-emerald-950">
                                        3) ตรวจสอบและดาวน์โหลดไฟล์จาก e-Claim NHSO
                                    </div>
                                    <div className="mt-1 text-xs text-emerald-900/80">
                                        ระบบจะดึงเฉพาะลิงก์ <code className="rounded bg-white/80 px-1">download excel</code> และตรวจสอบความซ้ำซ้อนกับไฟล์ที่เคยนำเข้าแล้วโดยอัตโนมัติ
                                    </div>
                                </div>

                                {scanSummary ? (
                                    <div className="rounded-xl border border-emerald-300 bg-white p-3.5 shadow-sm space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                            <div className="flex items-center gap-2">
                                                <Layers className="h-4 w-4 text-emerald-600" />
                                                <span className="text-sm font-semibold text-slate-800">
                                                    สรุปรายการไฟล์บน e-Claim ({scanSummary.allowed_files} ไฟล์)
                                                </span>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 rounded-lg text-xs text-slate-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                disabled={scanForm.processing}
                                                onClick={handleScan}
                                            >
                                                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${scanForm.processing ? 'animate-spin' : ''}`} />
                                                {scanForm.processing ? 'กำลังตรวจสอบ...' : 'ตรวจไฟล์ใหม่'}
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2.5 text-xs">
                                            <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-2 text-center">
                                                <div className="text-slate-500 font-medium">ไฟล์ทั้งหมด</div>
                                                <div className="text-base font-bold text-slate-800">{scanSummary.allowed_files}</div>
                                            </div>
                                            <div className="rounded-lg border border-sky-200 bg-sky-50/80 p-2 text-center">
                                                <div className="text-sky-700 font-medium">ไฟล์ใหม่ (ยังไม่โหลด)</div>
                                                <div className="text-base font-bold text-sky-800">{scanSummary.new_files}</div>
                                            </div>
                                            <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-2 text-center">
                                                <div className="text-emerald-700 font-medium">เคยดาวน์โหลดแล้ว</div>
                                                <div className="text-base font-bold text-emerald-800">{scanSummary.existing_files}</div>
                                            </div>
                                        </div>

                                        <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-2.5">
                                            <label className="flex items-start gap-2.5 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="mt-0.5 h-4 w-4 rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500"
                                                    checked={downloadForm.data.skip_existing}
                                                    onChange={(e) => downloadForm.setData('skip_existing', e.target.checked)}
                                                />
                                                <div className="text-xs">
                                                    <span className="font-semibold text-emerald-950">
                                                        ข้ามไฟล์ที่เคยดาวน์โหลดและนำเข้าแล้ว ({scanSummary.existing_files} ไฟล์)
                                                    </span>
                                                    <span className="ml-1.5 inline-block rounded bg-emerald-200/60 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-900">แนะนำ</span>
                                                    <p className="mt-0.5 text-emerald-800/80">
                                                        {downloadForm.data.skip_existing
                                                            ? `ระบบจะดาวน์โหลดเฉพาะไฟล์ใหม่ (${scanSummary.new_files} ไฟล์) ช่วยประหยัดเวลาและป้องกัน timeout`
                                                            : 'ปิดการข้าม: ระบบจะดาวน์โหลดและอัปเดตทับไฟล์เดิมทั้งหมดในเดือนนี้'}
                                                    </p>
                                                </div>
                                            </label>
                                        </div>

                                        {scanSummary.files && scanSummary.files.length > 0 && (
                                            <div className="pt-1">
                                                <button
                                                    type="button"
                                                    className="flex items-center gap-1 text-xs font-medium text-emerald-800 hover:text-emerald-950"
                                                    onClick={() => setShowFileList(!showFileList)}
                                                >
                                                    {showFileList ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                                    <span>{showFileList ? 'ซ่อนรายชื่อไฟล์' : `ดูรายละเอียดรายชื่อไฟล์ (${scanSummary.files.length} รายการ)`}</span>
                                                </button>

                                                {showFileList && (
                                                    <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-inner">
                                                        <table className="w-full text-left text-xs">
                                                            <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200">
                                                                <tr>
                                                                    <th className="px-3 py-2 font-medium">ชื่อไฟล์</th>
                                                                    <th className="px-3 py-2 font-medium">สถานะในระบบ</th>
                                                                    <th className="px-3 py-2 text-right font-medium">ข้อมูลที่นำเข้า</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                {scanSummary.files.map((f, i) => (
                                                                    <tr key={i} className={f.already_downloaded ? 'bg-slate-50/50 text-slate-600' : 'bg-white font-medium text-slate-900'}>
                                                                        <td className="px-3 py-2 font-mono text-[11px] truncate max-w-xs" title={f.filename}>
                                                                            {f.filename}
                                                                        </td>
                                                                        <td className="px-3 py-2 whitespace-nowrap">
                                                                            {f.already_downloaded ? (
                                                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                                                                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" /> โหลดแล้ว
                                                                                </span>
                                                                            ) : (
                                                                                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                                                                                    <FileCheck className="h-3 w-3 text-sky-600" /> ไฟล์ใหม่
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-right text-[11px] text-slate-500 whitespace-nowrap">
                                                                            {f.batch ? (
                                                                                <span>{f.batch.row_count?.toLocaleString()} แถว · {money(f.batch.total_approved)} บ.</span>
                                                                            ) : (
                                                                                <span className="text-slate-400">—</span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                                        <div className="text-xs text-slate-600">
                                            ยังไม่มีข้อมูลรายการไฟล์ของเดือนนี้ — กดตรวจสอบเพื่อสแกนรายการไฟล์
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="rounded-lg text-xs"
                                            disabled={scanForm.processing}
                                            onClick={handleScan}
                                        >
                                            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${scanForm.processing ? 'animate-spin' : ''}`} />
                                            {scanForm.processing ? 'กำลังตรวจสอบ...' : 'ตรวจสอบรายการไฟล์'}
                                        </Button>
                                    </div>
                                )}

                                {(pendingDownloads > 0 || downloadTotal > 0) && (
                                    <div className="text-sm font-medium text-emerald-900">
                                        ความคืบหน้าการดาวน์โหลด: {downloadDone}/{downloadTotal || '?'}
                                        {pendingDownloads > 0 ? ` · เหลือ ${pendingDownloads} ไฟล์` : ' · ครบแล้ว'}
                                    </div>
                                )}

                                <div className="flex flex-wrap items-end gap-3 pt-1">
                                    <div className="space-y-1">
                                        <Label>จำนวนไฟล์ต่อครั้ง</Label>
                                        <Select
                                            value={String(downloadForm.data.batch_size)}
                                            onValueChange={(v) => downloadForm.setData('batch_size', Number(v))}
                                        >
                                            <SelectTrigger className="w-36 rounded-xl">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0">ทั้งหมด</SelectItem>
                                                {[1, 3, 5, 10, 20].map((n) => (
                                                    <SelectItem key={n} value={String(n)}>
                                                        {n} ไฟล์
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <label className="flex items-center gap-2 pb-2 text-sm text-emerald-950">
                                        <input
                                            type="checkbox"
                                            className="rounded border-emerald-300"
                                            checked={downloadForm.data.auto_reconcile}
                                            onChange={(e) => downloadForm.setData('auto_reconcile', e.target.checked)}
                                        />
                                        เปรียบเทียบทันทีหลังนำเข้า
                                    </label>
                                </div>

                                {scanSummary && downloadForm.data.skip_existing && scanSummary.new_files === 0 && scanSummary.allowed_files > 0 ? (
                                    <div className="rounded-xl border border-emerald-300 bg-emerald-100/60 p-3 text-xs text-emerald-950 flex items-start gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="font-semibold">ไฟล์ทั้งหมด {scanSummary.allowed_files} ไฟล์ในเดือนนี้ถูกดาวน์โหลดและนำเข้าครบถ้วนแล้ว</span>
                                            <p className="mt-0.5 text-emerald-800">
                                                ไม่มีไฟล์ใหม่ที่ต้องดาวน์โหลด · หากต้องการนำเข้าซ้ำ ให้เอาเครื่องหมายถูกออกจาก <em>'ข้ามไฟล์ที่เคยดาวน์โหลดแล้ว'</em> ด้านบน
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        <Button
                                            type="button"
                                            className="rounded-xl bg-emerald-700 hover:bg-emerald-800"
                                            disabled={downloadForm.processing}
                                            onClick={() => postDownload(0)}
                                        >
                                            <CloudDownload className="mr-2 h-4 w-4" />
                                            {downloadForm.processing
                                                ? 'กำลังดาวน์โหลด...'
                                                : scanSummary && downloadForm.data.skip_existing
                                                  ? scanSummary.new_files > 0
                                                      ? `ดาวน์โหลดเฉพาะไฟล์ใหม่ (${scanSummary.new_files} ไฟล์)`
                                                      : 'ดาวน์โหลดไฟล์'
                                                  : pendingDownloads > 0
                                                    ? `ดาวน์โหลดที่เหลือทั้งหมด (${pendingDownloads} ไฟล์)`
                                                    : !downloadForm.data.skip_existing
                                                      ? `ดาวน์โหลดซ้ำทั้งหมด (${scanSummary?.allowed_files || 'ทุก'} ไฟล์)`
                                                      : 'ดาวน์โหลดทุกไฟล์ + นำเข้า'}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="rounded-xl"
                                            disabled={downloadForm.processing || downloadForm.data.batch_size === 0}
                                            onClick={() =>
                                                postDownload(
                                                    downloadForm.data.batch_size > 0 ? downloadForm.data.batch_size : 5,
                                                )
                                            }
                                        >
                                            {pendingDownloads > 0
                                                ? `ชุดถัดไป (${downloadForm.data.batch_size || 5} ไฟล์)`
                                                : `เริ่มแบบทีละชุด (${downloadForm.data.batch_size || 5})`}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </Panel>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <Panel title="อัปโหลดไฟล์ด้วยตนเอง" description={`รองรับหลายไฟล์ สูงสุด ${MAX_FILES} ไฟล์ · ชื่อต้องขึ้นต้น ${allowedPrefixHint}`}>
                    <form onSubmit={submit} className="space-y-4">
                        <div
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDragOver(true);
                            }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setDragOver(false);
                                addFiles(e.dataTransfer.files);
                            }}
                            className={`rounded-3xl border-2 border-dashed px-6 py-10 text-center transition ${
                                dragOver ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50/50'
                            }`}
                        >
                            <FileSpreadsheet className="mx-auto h-10 w-10 text-emerald-600" />
                            <div className="mt-3 text-sm font-semibold text-slate-800">ลากหลายไฟล์มาวางที่นี่ หรือเลือกไฟล์</div>
                            <div className="mt-1 text-xs text-slate-500">
                                ต้องขึ้นต้นด้วย {allowedPrefixHint} · .xls / .xlsx / .csv
                            </div>
                            <div className="mt-4">
                                <Input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xls,.xlsx,.csv"
                                    multiple
                                    onChange={(e) => {
                                        addFiles(e.target.files);
                                        // ให้เลือกชุดเดิมซ้ำได้อีกครั้ง
                                        e.target.value = '';
                                    }}
                                />
                            </div>
                            {form.errors.files && <div className="mt-2 text-sm text-rose-600">{form.errors.files}</div>}
                            {rejectedNames.length > 0 && (
                                <div className="mt-2 text-left text-sm text-amber-700">
                                    ข้าม {rejectedNames.length} ไฟล์ที่ชื่อไม่ขึ้นต้นด้วย {allowedPrefixHint}
                                    <ul className="mt-1 list-disc pl-5 text-xs">
                                        {rejectedNames.slice(0, 5).map((name) => (
                                            <li key={name}>{name}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {form.data.files.length > 0 && (
                            <div className="rounded-2xl border border-emerald-100 bg-white">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-50 px-4 py-3">
                                    <div className="text-sm font-semibold text-emerald-900">
                                        ไฟล์ที่เลือก {form.data.files.length.toLocaleString('th-TH')} ไฟล์
                                        <span className="ml-2 font-normal text-emerald-700/80">
                                            · {totalSizeMb.toFixed(1)} MB
                                        </span>
                                    </div>
                                    <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={clearFiles}>
                                        ล้างรายการ
                                    </Button>
                                </div>
                                <ul className="max-h-56 divide-y divide-slate-50 overflow-y-auto">
                                    {form.data.files.map((file, index) => (
                                        <li key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                                            <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-600" />
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate font-medium text-slate-800">{file.name}</div>
                                                <div className="text-[11px] text-slate-400">
                                                    {(file.size / 1024).toFixed(0)} KB
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeFile(index)}
                                                className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                                title="เอาออก"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm text-sky-900">
                            <div className="flex items-start gap-2">
                                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                                <div className="space-y-1">
                                    <div>นำเข้าได้หลายไฟล์ในครั้งเดียว — ระบบประมวลผลทีละไฟล์</div>
                                    <div>ถ้าเลขเอกสารหรือชื่อไฟล์ซ้ำกับที่มีอยู่ จะอัปเดตชุดเดิม (แทนที่ข้อมูลเก่า)</div>
                                    <div>
                                        {isRepOnly ? (
                                            <>
                                                ไฟล์ <strong>_APPEAL</strong> = ผลอุทธรณ์จาก REP · รออุทธรณ์สร้างจากยอดขาดใน REP
                                                (เรียกเก็บ &gt; ชดเชยสุทธิ) · ใช้ข้อมูล REP เท่านั้น ไม่ใช้ STM · Error แก้ด้วยไฟล์ REP
                                                ปกติรอบถัดไป (จับคู่ SEQ)
                                            </>
                                        ) : (
                                            <>
                                                ไฟล์ <strong>_APPEAL</strong> = ผลอุทธรณ์ · จับคู่ SEQ กับ STM → สำเร็จ/ไม่สำเร็จ · ไม่มี SEQ ใน STM = ยังไม่สำเร็จ (คงยอดรออัปเดต) หรือสำเร็จถ้ายอดเท่า
                                                ไม่ใช่การแก้ Error code · Error แก้ด้วยไฟล์ REP ปกติรอบถัดไป (จับคู่ SEQ)
                                            </>
                                        )}
                                    </div>
                                    <div>ช่วงวันที่ HOSxP เลือกที่หน้าเปรียบเทียบ (ค่าเริ่มต้นใช้ช่วงจากไฟล์)</div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <Label>หมายเหตุ</Label>
                            <Input
                                className="mt-1"
                                value={form.data.notes}
                                onChange={(e) => form.setData('notes', e.target.value)}
                                placeholder="เช่น งวด ก.ค. 69 รอบ 1 (ใช้ร่วมทุกไฟล์ในชุดนี้)"
                            />
                        </div>

                        <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                                type="checkbox"
                                checked={form.data.auto_reconcile}
                                onChange={(e) => form.setData('auto_reconcile', e.target.checked)}
                                className="rounded border-slate-300"
                            />
                            เปรียบเทียบรายไฟล์ทันทีหลังนำเข้า (แนะนำ: ปิดไว้ แล้วไปสรุปรวมทุกไฟล์ที่หน้าตรวจสอบ)
                        </label>

                        <Button
                            type="submit"
                            disabled={form.data.files.length === 0 || form.processing}
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            {form.processing
                                ? `กำลังนำเข้า ${form.data.files.length} ไฟล์...`
                                : `นำเข้าและตรวจสอบ ${form.data.files.length || ''} ไฟล์`.trim()}
                        </Button>
                    </form>
                </Panel>

                <Panel title="โครงสร้างไฟล์ที่รองรับ" description={`ชื่อไฟล์ต้องขึ้นต้นด้วย ${allowedPrefixHint}`}>
                    <ul className="space-y-2 text-sm text-slate-600">
                        {[
                            `ใช้เฉพาะไฟล์ที่ขึ้นชื่อ ${allowedPrefixHint} (รวม _APPEAL)`,
                            'เลือกหลายไฟล์ได้ในครั้งเดียว สูงสุด 50 ไฟล์',
                            'ไฟล์ซ้ำ (เลขเอกสาร หรือชื่อไฟล์เดิม) → อัปเดตชุดเดิมอัตโนมัติ',
                            'แท็บ Detail — HN / PID / SEQ NO / Error Code / กองทุน / เรียกเก็บ / ชดเชยสุทธิ',
                            'ชดเชยสุทธิ — ยอดที่กองทุนจ่าย · ยอดขาด = เรียกเก็บ − ชดเชยสุทธิ · HOSxP นับเฉพาะ SEQ ตรง',
                            'แท็บ Data Sheet — รายงานกองทุนจ่าย 0 บาท พร้อมเหตุผล/หมายเหตุ',
                            isRepOnly
                                ? 'อปท. ใช้ REP เป็นหลัก · สรุป Error code และการอุทธรณ์จาก REP เท่านั้น'
                                : 'ไฟล์ REP Statement — ยังรองรับ พึงรับทั้งหมด ตามเดิม',
                        ].map((item) => (
                            <li key={item} className="rounded-2xl border border-slate-100 bg-white px-3 py-2.5">
                                {item}
                            </li>
                        ))}
                    </ul>
                </Panel>
            </div>

            <div className="mt-6">
                <Panel title="ประวัติการนำเข้า" description="จัดการไฟล์และรันเปรียบเทียบใหม่ได้">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                    <th className="px-3 py-2">ไฟล์</th>
                                    <th className="px-3 py-2">ช่วงจากไฟล์</th>
                                    <th className="px-3 py-2 text-right">รายการ</th>
                                    <th className="px-3 py-2 text-right">เรียกเก็บ</th>
                                    <th className="px-3 py-2 text-right">พึงรับ</th>
                                    <th className="px-3 py-2">สถานะ</th>
                                    <th className="px-3 py-2 text-right">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {batches.data.map((batch) => (
                                    <tr key={batch.id} className="border-b border-slate-50">
                                        <td className="px-3 py-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="font-semibold text-slate-800">
                                                    {batch.document_no || batch.filename}
                                                </div>
                                                {batch.file_kind === 'appeal' && (
                                                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                                        APPEAL
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                {batch.created_at}
                                                {batch.imported_by ? ` · ${batch.imported_by}` : ''}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-slate-600">
                                            {batch.visit_date_min || '-'} → {batch.visit_date_max || '-'}
                                        </td>
                                        <td className="px-3 py-3 text-right">{batch.row_count.toLocaleString()}</td>
                                        <td className="px-3 py-3 text-right">{money(batch.total_claim)}</td>
                                        <td className="px-3 py-3 text-right">{money(batch.total_approved)}</td>
                                        <td className="px-3 py-3">
                                            <StatusPill
                                                label={batch.status === 'reconciled' ? 'เปรียบเทียบแล้ว' : 'นำเข้าแล้ว'}
                                                className="border-emerald-200 bg-emerald-50 text-emerald-700"
                                            />
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="flex justify-end gap-2">
                                                <Button asChild size="sm" variant="outline" className="rounded-xl">
                                                    <Link href={claimRoute(mod, 'show', batch.id)}>เปิด</Link>
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="rounded-xl"
                                                    onClick={() => router.post(claimRoute(mod, 'reconcile', batch.id))}
                                                >
                                                    <RefreshCw className="h-3.5 w-3.5" />
                                                </Button>
                                                <DeleteBatchButton
                                                    batchId={batch.id}
                                                    module={mod}
                                                    documentNo={batch.document_no}
                                                    filename={batch.filename}
                                                    rowCount={batch.row_count}
                                                    label="ลบ"
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Panel>
            </div>
        </QualityPage>
    );
}
