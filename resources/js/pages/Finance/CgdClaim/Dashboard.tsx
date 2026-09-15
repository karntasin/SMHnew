import React, { useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    Download,
    FileCheck2,
    FileSpreadsheet,
    FileText,
    FileWarning,
    RefreshCw,
    Upload,
    Wallet,
} from 'lucide-react';
import { QualityPage, Panel, StatusPill } from '@/components/quality/quality-ui';
import DataHubSubNav, { dataHubBreadcrumbs } from '../DataHub/DataHubSubNav';
import ClaimModuleSubNav from '../DataHub/ClaimModuleSubNav';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ThaiDatePicker } from '@/components/ui/thai-date-picker';
import { claimRoute, resolveClaimModule, type ClaimModuleMeta } from './claimModule';

interface ImportSummary {
    id: number;
    batch_id?: number;
    claim_submission_no: string;
    filename: string;
    detail_count: number;
    rep_count: number;
    total_claim: number;
    total_approved: number;
    visit_date_min: string | null;
    visit_date_max: string | null;
    created_at: string;
    latest_reconciliation: {
        total_shortfall: number;
        matched_ok: number;
        matched_short: number;
        only_hosxp: number;
        only_stm: number;
    } | null;
}

interface Props {
    hosxpReady: boolean;
    imports: ImportSummary[];
    summary: {
        id: number;
        scope?: string;
        total_hosxp: number;
        total_hosxp_paid?: number;
        total_hosxp_net?: number;
        total_hosxp_unmatched?: number;
        total_hosxp_unmatched_net?: number;
        matched_hosxp_count?: number;
        total_stm_claim: number;
        total_stm_approved: number;
        total_shortfall: number;
        matched_ok: number;
        matched_short: number;
        matched_over: number;
        only_hosxp: number;
        only_stm: number;
        stm_out_of_range?: number;
        hosxp_count: number;
        stm_count: number;
        start_date: string;
        end_date: string;
    } | null;
    stmRange: {
        min: string | null;
        max: string | null;
        row_count: number;
    };
    filters: {
        start_date?: string | null;
        end_date?: string | null;
    };
    kpis: {
        import_count: number;
        row_count: number;
        rep_count: number;
        total_claim: number;
        total_approved: number;
        latest_shortfall: number;
        latest_matched_ok: number;
        latest_matched_short: number;
        latest_only_hosxp: number;
        latest_only_stm: number;
    };
    caseTracking?: {
        error_open: number;
        error_still_open: number;
        error_fixed: number;
        appeal_eligible: number;
        appeal_submitted: number;
        appeal_approved: number;
        appeal_settled: number;
        appeal_still_short: number;
        appeal_denied: number;
    } | null;
    module?: ClaimModuleMeta;
}

const money = (n: number | null | undefined) =>
    new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

const num = (n: number | null | undefined) => (Number(n) || 0).toLocaleString('th-TH');

export default function CgdClaimDashboard({
    hosxpReady,
    imports = [],
    summary,
    stmRange,
    filters,
    kpis,
    caseTracking = null,
    module,
}: Props) {
    const safeKpis = {
        import_count: Number(kpis?.import_count) || 0,
        row_count: Number(kpis?.row_count) || 0,
        rep_count: Number(kpis?.rep_count) || 0,
        total_claim: Number(kpis?.total_claim) || 0,
        total_approved: Number(kpis?.total_approved) || 0,
        latest_shortfall: Number(kpis?.latest_shortfall) || 0,
        latest_matched_ok: Number(kpis?.latest_matched_ok) || 0,
        latest_matched_short: Number(kpis?.latest_matched_short) || 0,
        latest_only_hosxp: Number(kpis?.latest_only_hosxp) || 0,
        latest_only_stm: Number(kpis?.latest_only_stm) || 0,
    };
    const safeStmRange = {
        min: stmRange?.min ?? null,
        max: stmRange?.max ?? null,
        row_count: Number(stmRange?.row_count) || 0,
    };
    const mod = resolveClaimModule(module);
    const sourceLabel = mod.labels.source;
    const sourceAllLabel = mod.labels.source_all;
    const { flash } = usePage().props as { flash?: { success?: string; error?: string } };
    const [startDate, setStartDate] = useState(filters?.start_date || safeStmRange.min || '');
    const [endDate, setEndDate] = useState(filters?.end_date || safeStmRange.max || '');
    const [processing, setProcessing] = useState(false);

    const runCompare = () => {
        if (!startDate || !endDate) return;
        setProcessing(true);
        router.post(
            claimRoute(mod, 'reconcile_all'),
            { start_date: startDate, end_date: endDate },
            { onFinish: () => setProcessing(false) },
        );
    };

    const useStmRange = () => {
        if (safeStmRange.min) setStartDate(safeStmRange.min);
        if (safeStmRange.max) setEndDate(safeStmRange.max);
    };

    return (
        <QualityPage
            tone="emerald"
            icon={FileCheck2}
            badge="Financial Data Hub"
            title={mod.title}
            subtitle={
                mod.primary_source === 'rep'
                    ? `${sourceLabel} เป็นหลัก · จับคู่ HOSxP ด้วย SEQ · แสดง Error จาก REP ตามเลข REP`
                    : 'STM เป็นหลัก · จับคู่ HOSxP ด้วย SEQ · แสดง Error จาก REP ตามเลข REP'
            }
            breadcrumbs={dataHubBreadcrumbs({ title: mod.short, href: claimRoute(mod, 'dashboard') })}
            headTitle={mod.title}
            subNav={<DataHubSubNav active={mod.routes.dashboard} />}
            actions={
                mod.has_stm ? (
                    <Button asChild className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
                        <Link href={claimRoute(mod, 'stm_index')}>
                            <Upload className="mr-2 h-4 w-4" />
                            นำเข้า STM
                        </Link>
                    </Button>
                ) : (
                    <Button asChild variant="outline" className="rounded-xl">
                        <Link href={claimRoute(mod, 'compare')}>
                            <FileCheck2 className="mr-2 h-4 w-4" />
                            เปรียบเทียบรายละเอียด
                        </Link>
                    </Button>
                )
            }
        >
            <ClaimModuleSubNav
                dashboardUrl={claimRoute(mod, 'dashboard')}
                importUrl={claimRoute(mod, 'import')}
                stmUrl={mod.has_stm ? claimRoute(mod, 'stm_index') : undefined}
                precheckUrl={mod.key === 'cgd' ? claimRoute(mod, 'precheck') : undefined}
                importLabel={mod.labels.import_rep}
                active="dashboard"
            />

            {flash?.success && (
                <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {flash.success}
                </div>
            )}
            {flash?.error && (
                <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    {flash.error}
                </div>
            )}

            {!hosxpReady && (
                <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    ยังเชื่อมต่อ HOSxP ไม่ได้ — สามารถนำเข้า {sourceLabel} ได้ แต่ยังเปรียบเทียบยอดไม่ได้จนกว่าการเชื่อมต่อจะพร้อม
                </div>
            )}

            {mod.key === 'cgd' && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-100 bg-gradient-to-r from-rose-50 via-amber-50 to-emerald-50 px-4 py-3">
                    <div>
                        <p className="text-sm font-semibold text-slate-800">แจ้งเตือนตรวจก่อนเบิก C Deny (รายวัน)</p>
                        <p className="text-xs text-slate-600">
                            แดง = ขาด/ผิดพลาดร้ายแรง · เหลือง = ไม่ครบถ้วน · เขียว = ผ่านเกณฑ์ — เลือกวันรับบริการแล้วตรวจจาก HOSxP ก่อนส่ง e-Claim
                        </p>
                    </div>
                    <Button asChild className="rounded-xl bg-rose-600 hover:bg-rose-700">
                        <Link href={claimRoute(mod, 'precheck')}>เปิดแดชบอร์ดวันนี้</Link>
                    </Button>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                    {
                        label: mod.primary_source === 'rep' ? `ไฟล์ ${sourceLabel} (เลขที่นำเบิก)` : 'ชุด STM (เลขที่นำเบิก)',
                        value: num(safeKpis.import_count),
                        hint: `${num(safeKpis.row_count)} รายการ · ${num(safeKpis.rep_count)} REP`,
                        icon: FileSpreadsheet,
                    },
                    { label: 'ยอดเรียกเก็บรวม', value: money(safeKpis.total_claim), hint: `จากทุกชุด ${sourceAllLabel}`, icon: Wallet },
                    {
                        label: 'ยอดพึงรับรวม',
                        value: money(safeKpis.total_approved),
                        hint: `พึงรับทั้งหมดจาก ${sourceLabel}`,
                        icon: CheckCircle2,
                    },
                    {
                        label: 'ยอดขาด (สรุปล่าสุด)',
                        value: money(safeKpis.latest_shortfall),
                        hint: 'เรียกเก็บ − พึงรับ',
                        icon: FileWarning,
                        danger: true,
                    },
                ].map((card) => (
                    <div
                        key={card.label}
                        className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-900/5"
                    >
                        <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{card.label}</div>
                            <card.icon className={`h-4 w-4 ${card.danger ? 'text-rose-500' : 'text-emerald-600'}`} />
                        </div>
                        <div className={`mt-2 text-2xl font-bold ${card.danger ? 'text-rose-600' : 'text-slate-900'}`}>
                            {card.value}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{card.hint}</div>
                    </div>
                ))}
            </div>

            {caseTracking && (
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    <Panel
                        title="สรุป Error code จาก REP"
                        description="ติดตามจากไฟล์ REP เท่านั้น · แก้แล้วเมื่อมี REP คนละเลขที่ SEQ เดิมไม่มี Error"
                    >
                        <div className="grid grid-cols-3 gap-2">
                            {(
                                [
                                    [
                                        'ค้างอยู่',
                                        (caseTracking.error_open || 0) + (caseTracking.error_still_open || 0),
                                        'errors',
                                        null,
                                        'text-rose-700 bg-rose-50',
                                    ],
                                    ['ยัง Error', caseTracking.error_open || 0, 'errors', 'open', 'text-rose-700 bg-rose-50/70'],
                                    ['แก้แล้ว', caseTracking.error_fixed || 0, 'errors', 'fixed', 'text-emerald-700 bg-emerald-50'],
                                ] as const
                            ).map(([label, value, tab, errorStatus, cls]) => (
                                <Link
                                    key={String(label)}
                                    href={claimRoute(mod, 'compare', {
                                        tab,
                                        ...(errorStatus ? { error_status: errorStatus } : {}),
                                    })}
                                    className={`rounded-2xl px-3 py-3 text-center transition hover:ring-2 hover:ring-rose-300 ${cls}`}
                                >
                                    <div className="text-lg font-bold">{num(value)}</div>
                                    <div className="text-[11px] font-medium">{label}</div>
                                </Link>
                            ))}
                        </div>
                    </Panel>
                    <Panel
                        title="สรุปการอุทธรณ์จาก REP"
                        description="รออุทธรณ์ = เรียกเก็บ > ชดเชยสุทธิใน REP · อัปเดตผลด้วยไฟล์ _APPEAL (ไม่มี STM)"
                    >
                        <div className="grid grid-cols-3 gap-2">
                            {(
                                [
                                    [
                                        'รออุทธรณ์',
                                        (caseTracking.appeal_eligible || 0) + (caseTracking.appeal_submitted || 0),
                                        'appeals',
                                        null,
                                        'text-sky-700 bg-sky-50',
                                    ],
                                    [
                                        'อุทธรณ์สำเร็จ',
                                        caseTracking.appeal_approved || 0,
                                        'appeals',
                                        'approved',
                                        'text-emerald-700 bg-emerald-50',
                                    ],
                                    [
                                        'ไม่สำเร็จ/บางส่วน',
                                        caseTracking.appeal_denied || 0,
                                        'appeals',
                                        'denied',
                                        'text-amber-700 bg-amber-50',
                                    ],
                                ] as const
                            ).map(([label, value, tab, appealStatus, cls]) => (
                                <Link
                                    key={String(label)}
                                    href={claimRoute(mod, 'compare', {
                                        tab,
                                        ...(appealStatus ? { appeal_status: appealStatus } : {}),
                                    })}
                                    className={`rounded-2xl px-3 py-3 text-center transition hover:ring-2 hover:ring-sky-300 ${cls}`}
                                >
                                    <div className="text-lg font-bold">{num(value)}</div>
                                    <div className="text-[11px] font-medium">{label}</div>
                                </Link>
                            ))}
                        </div>
                    </Panel>
                </div>
            )}

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <Panel
                    title="ผลการเปรียบเทียบล่าสุด"
                    description={`HOSxP จับคู่ SEQ กับ ${sourceLabel} · ยอดขาด = เรียกเก็บ ${sourceLabel} − พึงรับ ${sourceLabel}`}
                >
                    {summary ? (
                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <StatusPill
                                    label={`ทุกชุด ${sourceAllLabel} · ${num(summary.stm_count)} รายการ`}
                                    className="border-emerald-200 bg-emerald-50 text-emerald-800"
                                />
                                <StatusPill
                                    label={`HOSxP ${summary.start_date} → ${summary.end_date}`}
                                    className="border-slate-200 bg-slate-50 text-slate-700"
                                />
                                <StatusPill
                                    label={`SEQ ตรง ${num(summary.matched_hosxp_count)} visits`}
                                    className="border-emerald-200 bg-white text-emerald-800"
                                />
                            </div>

                            <div className="flex flex-wrap gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3">
                                <div className="mr-auto self-center text-sm font-semibold text-emerald-950">
                                    ดาวน์โหลดรายงานสรุป
                                </div>
                                <Button asChild className="rounded-xl bg-emerald-700 hover:bg-emerald-800">
                                    <a href={claimRoute(mod, 'summary_export')}>
                                        <Download className="mr-2 h-4 w-4" />
                                        Excel
                                    </a>
                                </Button>
                                <Button asChild variant="outline" className="rounded-xl border-emerald-300 bg-white">
                                    <a href={claimRoute(mod, 'summary_export_pdf')}>
                                        <FileText className="mr-2 h-4 w-4" />
                                        PDF
                                    </a>
                                </Button>
                                <Button asChild variant="outline" className="rounded-xl">
                                    <Link href={claimRoute(mod, 'summary')}>ดูรายละเอียด / กรองก่อนโหลด</Link>
                                </Button>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                                    <div className="text-xs font-semibold text-slate-500">HOSxP (SEQ ตรง)</div>
                                    <div className="mt-1 text-xl font-bold text-slate-900">{money(summary.total_hosxp)}</div>
                                </div>
                                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                                    <div className="text-xs font-semibold text-emerald-700">เรียกเก็บ ({sourceLabel})</div>
                                    <div className="mt-1 text-xl font-bold text-emerald-900">{money(summary.total_stm_claim)}</div>
                                </div>
                                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                                    <div className="text-xs font-semibold text-emerald-700">พึงรับ ({sourceLabel})</div>
                                    <div className="mt-1 text-xl font-bold text-emerald-900">
                                        {money(summary.total_stm_approved)}
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4 sm:col-span-2 lg:col-span-3">
                                    <div className="text-xs font-semibold text-rose-700">ยอดขาด</div>
                                    <div className="mt-1 text-xl font-bold text-rose-700">{money(summary.total_shortfall)}</div>
                                    <div className="mt-1 text-xs text-rose-700/80">เรียกเก็บ − พึงรับ</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                                {[
                                    ['ตรงกัน', summary.matched_ok, 'matched_ok', 'text-emerald-700 bg-emerald-50'],
                                    ['ขาดเงิน', summary.matched_short, 'matched_short', 'text-rose-700 bg-rose-50'],
                                    ['ชดเชยเกิน', summary.matched_over, 'matched_over', 'text-amber-700 bg-amber-50'],
                                    ['HOSxP ไม่มี SEQ', summary.only_hosxp, 'only_hosxp', 'text-sky-700 bg-sky-50'],
                                    [`${sourceLabel} ไม่มี SEQ`, summary.only_stm, 'only_stm', 'text-violet-700 bg-violet-50'],
                                    ...(mod.has_stm
                                        ? [
                                              [
                                                  `${sourceLabel} นอกช่วง`,
                                                  summary.stm_out_of_range || 0,
                                                  'stm_out_of_range',
                                                  'text-orange-700 bg-orange-50',
                                              ] as const,
                                          ]
                                        : []),
                                ].map(([label, value, status, cls]) => (
                                    <Link
                                        key={String(status)}
                                        href={claimRoute(mod, 'summary', { status })}
                                        className={`rounded-2xl px-3 py-3 text-center transition hover:ring-2 hover:ring-emerald-300 ${cls}`}
                                    >
                                        <div className="text-lg font-bold">{num(value as number)}</div>
                                        <div className="text-[11px] font-medium">{label}</div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center text-sm text-slate-500">
                            ยังไม่มีสรุปเปรียบเทียบรวม — เลือกช่วงวันที่ HOSxP ทางขวา แล้วกดเปรียบเทียบ
                        </div>
                    )}
                </Panel>

                <Panel title="เปรียบเทียบกับ HOSxP" description={`ดึง Visit แล้วจับคู่ SEQ กับทุกชุด ${sourceAllLabel}`}>
                    <div className="space-y-3">
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-3 text-sm">
                            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                                ช่วงวันเข้ารักษาในไฟล์ {sourceAllLabel}
                            </div>
                            <div className="mt-1 font-semibold text-emerald-900">
                                {safeStmRange.min || '-'} → {safeStmRange.max || '-'}
                            </div>
                            <div className="mt-1 text-xs text-emerald-800/80">
                                รวม {num(safeStmRange.row_count)} รายการ จาก {num(safeKpis.import_count)} ชุด
                            </div>
                            {(safeStmRange.min || safeStmRange.max) && (
                                <button
                                    type="button"
                                    onClick={useStmRange}
                                    className="mt-2 text-xs font-semibold text-emerald-700 underline-offset-2 hover:underline"
                                >
                                    ใช้ช่วงวันที่จากไฟล์ {sourceLabel}
                                </button>
                            )}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="min-w-0">
                                <Label className="text-xs text-slate-500">วันเริ่มต้น HOSxP</Label>
                                <ThaiDatePicker
                                    value={startDate}
                                    onChange={setStartDate}
                                    placeholder="เลือกวันเริ่มต้น"
                                    className="mt-1 w-full max-w-none"
                                />
                            </div>
                            <div className="min-w-0">
                                <Label className="text-xs text-slate-500">วันสิ้นสุด HOSxP</Label>
                                <ThaiDatePicker
                                    value={endDate}
                                    onChange={setEndDate}
                                    placeholder="เลือกวันสิ้นสุด"
                                    className="mt-1 w-full max-w-none"
                                />
                            </div>
                        </div>

                        <Button
                            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700"
                            disabled={!hosxpReady || !startDate || !endDate || processing || safeKpis.import_count === 0}
                            onClick={runCompare}
                        >
                            <RefreshCw className={`mr-2 h-4 w-4 ${processing ? 'animate-spin' : ''}`} />
                            {processing ? 'กำลังเปรียบเทียบ...' : 'เปรียบเทียบและสรุปรายงาน'}
                        </Button>
                    </div>
                </Panel>
            </div>

            <div className="mt-6">
                <Panel
                    title={mod.primary_source === 'rep' ? `ไฟล์ ${sourceLabel} ตามเลขที่นำเบิก` : 'ชุด STM ตามเลขที่นำเบิก'}
                    description="กดเปิดเพื่อดูการจับคู่ HOSxP และ Error จาก REP"
                >
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                    <th className="px-3 py-2">เลขที่นำเบิก</th>
                                    <th className="px-3 py-2">ช่วงวันที่</th>
                                    <th className="px-3 py-2 text-right">รายการ</th>
                                    <th className="px-3 py-2 text-right">REP</th>
                                    <th className="px-3 py-2 text-right">เรียกเก็บ</th>
                                    <th className="px-3 py-2 text-right">พึงรับ</th>
                                    <th className="px-3 py-2">สถานะ</th>
                                    <th className="px-3 py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {imports.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-3 py-8 text-center text-slate-400">
                                            ยังไม่มีชุด {sourceAllLabel} — เริ่มจาก{mod.labels.import_rep}
                                        </td>
                                    </tr>
                                )}
                                {imports.map((row) => (
                                    <tr key={row.id} className="border-b border-slate-50 hover:bg-emerald-50/40">
                                        <td className="px-3 py-3">
                                            <div className="font-semibold text-slate-800">{row.claim_submission_no}</div>
                                            <div className="text-xs text-slate-400">{row.created_at}</div>
                                        </td>
                                        <td className="px-3 py-3 text-slate-600">
                                            {row.visit_date_min || '-'} → {row.visit_date_max || '-'}
                                        </td>
                                        <td className="px-3 py-3 text-right">{num(row.detail_count)}</td>
                                        <td className="px-3 py-3 text-right">{num(row.rep_count)}</td>
                                        <td className="px-3 py-3 text-right">{money(row.total_claim)}</td>
                                        <td className="px-3 py-3 text-right">{money(row.total_approved)}</td>
                                        <td className="px-3 py-3">
                                            <StatusPill
                                                label={row.latest_reconciliation ? 'เปรียบเทียบแล้ว' : 'นำเข้าแล้ว'}
                                                className={
                                                    row.latest_reconciliation
                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                        : 'border-slate-200 bg-slate-50 text-slate-600'
                                                }
                                            />
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            <Button asChild variant="outline" size="sm" className="rounded-xl">
                                                <Link
                                                    href={
                                                        mod.has_stm
                                                            ? claimRoute(mod, 'compare', row.id)
                                                            : claimRoute(mod, 'show', row.batch_id || row.id)
                                                    }
                                                >
                                                    เปิด
                                                </Link>
                                            </Button>
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
