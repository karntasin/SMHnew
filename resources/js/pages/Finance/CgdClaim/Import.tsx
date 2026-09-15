import React, { useMemo, useRef, useState } from 'react';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { FileSpreadsheet, Upload, RefreshCw, AlertTriangle, Info, X, KeyRound, CloudDownload, Shield } from 'lucide-react';
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

interface NhsoPortal {
    configured: boolean;
    session: {
        phase?: string;
        year?: number;
        month?: number;
        started_at?: string;
        totp_secret?: string | null;
        pending_downloads?: number;
        download_done?: number;
        download_total?: number;
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

export default function CgdClaimImport({ hosxpReady, batches, nhsoPortal, filenamePrefix, module }: Props) {
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
    const startForm = useForm({ year: Number(year), month: Number(month) });
    const otpForm = useForm({ otp: '' });
    const downloadForm = useForm({ notes: '', auto_reconcile: false, batch_size: 5 });
    const pendingDownloads = nhsoPortal?.session?.pending_downloads || 0;
    const downloadDone = nhsoPortal?.session?.download_done || 0;
    const downloadTotal = nhsoPortal?.session?.download_total || 0;

    const postDownload = (batchSize: number) => {
        downloadForm.transform((data) => ({ ...data, batch_size: batchSize }));
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
                            {nhsoPortal.username_hint && <span>บัญชี: {nhsoPortal.username_hint}</span>}
                            {nhsoPortal.session?.year && nhsoPortal.session?.month && (
                                <span>
                                    เดือนเป้าหมาย: {MONTHS.find((m) => m.v === nhsoPortal.session?.month)?.l}/
                                    {(nhsoPortal.session.year || 0) + 543}
                                </span>
                            )}
                        </div>

                        {(errors?.nhso || errors?.otp) && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                                {errors.nhso || errors.otp}
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
                                disabled={startForm.processing || !nhsoPortal.configured}
                                onClick={() => {
                                    startForm.setData({ year: Number(year), month: Number(month) });
                                    startForm.post(claimRoute(mod, 'nhso_start'));
                                }}
                            >
                                <KeyRound className="mr-2 h-4 w-4" />
                                {startForm.processing ? 'กำลังเข้าสู่ระบบ...' : '1) เริ่มเข้าสู่ระบบ'}
                            </Button>
                        </div>

                        {(phase === 'awaiting_otp' || phase === 'configure_totp') && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                                <div className="text-sm font-semibold text-amber-950">
                                    {phase === 'configure_totp'
                                        ? '2) ตั้งค่า Google Authenticator (ครั้งแรกของบัญชี SSO)'
                                        : '2) กรอกรหัส Google Authenticator (6 หลัก)'}
                                </div>
                                <div className="mt-1 text-xs text-amber-900/80">
                                    {phase === 'configure_totp'
                                        ? 'e-Claim ใช้ NHSO IAM แล้ว — ถ้ายังไม่เคยผูก Authenticator กับบัญชีนี้ ให้เพิ่มรหัสลับด้านล่างในแอป แล้วกรอกรหัส 6 หลัก'
                                        : 'เปิดแอป Authenticator แล้วกรอกรหัสปัจจุบัน ระบบจะส่งกลับไปยังหน้าเว็บ e-Claim ให้'}
                                </div>
                                {phase === 'configure_totp' && nhsoPortal.session?.totp_secret && (
                                    <div className="mt-3 rounded-xl border border-amber-300 bg-white px-3 py-2">
                                        <div className="text-xs text-slate-500">รหัสลับ (เพิ่มใน Google Authenticator แบบ manual)</div>
                                        <div className="mt-1 break-all font-mono text-base font-semibold tracking-wider text-slate-900">
                                            {nhsoPortal.session.totp_secret}
                                        </div>
                                    </div>
                                )}
                                <div className="mt-3 flex flex-wrap items-end gap-3">
                                    <div className="space-y-1">
                                        <Label htmlFor="nhso-otp">รหัส OTP</Label>
                                        <Input
                                            id="nhso-otp"
                                            inputMode="numeric"
                                            maxLength={6}
                                            placeholder="000000"
                                            className="w-40 rounded-xl font-mono text-lg tracking-[0.3em]"
                                            value={otpForm.data.otp}
                                            onChange={(e) =>
                                                otpForm.setData('otp', e.target.value.replace(/\D/g, '').slice(0, 6))
                                            }
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        className="rounded-xl"
                                        disabled={otpForm.processing || otpForm.data.otp.length !== 6}
                                        onClick={() => otpForm.post(claimRoute(mod, 'nhso_otp'))}
                                    >
                                        ยืนยัน OTP
                                    </Button>
                                </div>
                            </div>
                        )}

                        {phase === 'authenticated' && (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                                <div className="text-sm font-semibold text-emerald-950">
                                    3) ดาวน์โหลด Excel จากคอลัมน์ Excel File
                                </div>
                                <div className="mt-1 text-xs text-emerald-900/80">
                                    ใช้เฉพาะลิงก์ <code className="rounded bg-white/80 px-1">download excel</code> —
                                    ไม่ดึงตัวเลขผ่าน/ไม่ผ่าน และไม่ดึงไฟล์ .ecd
                                    <br />
                                    กด <strong>ดาวน์โหลดทุกไฟล์</strong> เพื่อนำเข้าครบในครั้งเดียว หรือเลือกทีละชุดถ้า timeout
                                </div>
                                {(pendingDownloads > 0 || downloadTotal > 0) && (
                                    <div className="mt-2 text-sm font-medium text-emerald-900">
                                        ความคืบหน้า: {downloadDone}/{downloadTotal || '?'}
                                        {pendingDownloads > 0 ? ` · เหลือ ${pendingDownloads} ไฟล์` : ' · ครบแล้ว'}
                                    </div>
                                )}
                                <div className="mt-3 flex flex-wrap items-end gap-3">
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
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        className="rounded-xl bg-emerald-700 hover:bg-emerald-800"
                                        disabled={downloadForm.processing}
                                        onClick={() => postDownload(0)}
                                    >
                                        <CloudDownload className="mr-2 h-4 w-4" />
                                        {downloadForm.processing
                                            ? 'กำลังดาวน์โหลดทุกไฟล์...'
                                            : pendingDownloads > 0
                                              ? `ดาวน์โหลดที่เหลือทั้งหมด (${pendingDownloads} ไฟล์)`
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
