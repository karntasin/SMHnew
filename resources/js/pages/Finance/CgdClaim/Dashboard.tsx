import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    FileCheck2,
    FileWarning,
    Upload,
    Wallet,
} from 'lucide-react';
import { QualityPage, Panel, StatusPill } from '@/components/quality/quality-ui';
import DataHubSubNav, { dataHubBreadcrumbs } from '../DataHub/DataHubSubNav';
import ClaimModuleSubNav from '../DataHub/ClaimModuleSubNav';
import { Button } from '@/components/ui/button';
import DeleteBatchButton from './DeleteBatchButton';

interface BatchSummary {
    id: number;
    filename: string;
    document_no: string | null;
    row_count: number;
    total_claim: number;
    total_approved: number;
    visit_date_min: string | null;
    visit_date_max: string | null;
    status: string;
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
    batches: BatchSummary[];
    summary: {
        total_hosxp: number;
        total_stm_claim: number;
        total_stm_approved: number;
        total_shortfall: number;
        matched_ok: number;
        matched_short: number;
        matched_over: number;
        only_hosxp: number;
        only_stm: number;
        hosxp_count: number;
        stm_count: number;
        start_date: string;
        end_date: string;
        document_no?: string | null;
        filename?: string | null;
    } | null;
    kpis: {
        batch_count: number;
        row_count: number;
        total_claim: number;
        total_approved: number;
        latest_shortfall: number;
        latest_matched_ok: number;
        latest_matched_short: number;
        latest_only_hosxp: number;
        latest_only_stm: number;
    };
}

const money = (n: number) =>
    new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

export default function CgdClaimDashboard({ hosxpReady, batches, summary, kpis }: Props) {
    const { flash } = usePage().props as { flash?: { success?: string } };

    return (
        <QualityPage
            tone="emerald"
            icon={FileCheck2}
            badge="Financial Data Hub"
            title="ตรวจเบิกจ่ายตรง กรมบัญชีกลาง"
            subtitle="เปรียบเทียบ Visit HOSxP กับไฟล์ STM จาก สปสช. ด้วย HN · PID · SEQ NO"
            breadcrumbs={dataHubBreadcrumbs({ title: 'ตรวจจ่ายตรง', href: route('finance.cgd.dashboard') })}
            headTitle="ตรวจเบิกจ่ายตรง"
            subNav={<DataHubSubNav active="finance.cgd.dashboard" />}
            actions={
                <Button asChild className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
                    <Link href={route('finance.cgd.import')}>
                        <Upload className="mr-2 h-4 w-4" />
                        นำเข้าไฟล์ STM
                    </Link>
                </Button>
            }
        >
            <ClaimModuleSubNav
                dashboardUrl={route('finance.cgd.dashboard')}
                importUrl={route('finance.cgd.import')}
                importLabel="นำเข้า STM"
                active="dashboard"
            />

            {flash?.success && (
                <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {flash.success}
                </div>
            )}

            {!hosxpReady && (
                <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    ยังเชื่อมต่อ HOSxP ไม่ได้ — สามารถนำเข้า STM ได้ แต่ยังเปรียบเทียบยอดไม่ได้จนกว่าการเชื่อมต่อจะพร้อม
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                    { label: 'ไฟล์ STM ที่นำเข้า', value: kpis.batch_count.toLocaleString(), hint: `${kpis.row_count.toLocaleString()} รายการ`, icon: FileCheck2 },
                    { label: 'ยอดเรียกเก็บรวม', value: money(kpis.total_claim), hint: 'จากไฟล์ STM', icon: Wallet },
                    { label: 'ยอดพึงรับรวม', value: money(kpis.total_approved), hint: 'อนุมัติจาก Statement', icon: CheckCircle2 },
                    { label: 'ยอดขาดล่าสุด', value: money(kpis.latest_shortfall), hint: `${kpis.latest_matched_short} รายการขาดเงิน`, icon: FileWarning, danger: true },
                ].map((card) => (
                    <div
                        key={card.label}
                        className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm shadow-emerald-900/5"
                    >
                        <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{card.label}</div>
                            <card.icon className={`h-4 w-4 ${card.danger ? 'text-rose-500' : 'text-emerald-600'}`} />
                        </div>
                        <div className={`mt-2 text-2xl font-bold ${card.danger ? 'text-rose-600' : 'text-slate-900'}`}>{card.value}</div>
                        <div className="mt-1 text-xs text-slate-500">{card.hint}</div>
                    </div>
                ))}
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <Panel title="ผลการเปรียบเทียบล่าสุด" description="จับคู่ HN + PID + SEQ NO แล้วเทียบยอด HOSxP กับพึงรับ STM">
                    {summary ? (
                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <StatusPill label={summary.document_no || summary.filename || 'STM'} className="border-emerald-200 bg-emerald-50 text-emerald-800" />
                                <StatusPill
                                    label={`${summary.start_date} → ${summary.end_date}`}
                                    className="border-slate-200 bg-slate-50 text-slate-700"
                                />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                                    <div className="text-xs text-slate-500">HOSxP Total</div>
                                    <div className="mt-1 text-xl font-bold text-slate-900">{money(summary.total_hosxp)}</div>
                                    <div className="text-xs text-slate-500">{summary.hosxp_count.toLocaleString()} visits</div>
                                </div>
                                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                                    <div className="text-xs text-emerald-700">STM พึงรับ</div>
                                    <div className="mt-1 text-xl font-bold text-emerald-800">{money(summary.total_stm_approved)}</div>
                                    <div className="text-xs text-emerald-700/80">{summary.stm_count.toLocaleString()} รายการ</div>
                                </div>
                                <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
                                    <div className="text-xs text-rose-700">ยอดขาด</div>
                                    <div className="mt-1 text-xl font-bold text-rose-700">{money(summary.total_shortfall)}</div>
                                    <div className="text-xs text-rose-700/80">โรงพยาบาลควรได้เพิ่ม</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                                {[
                                    ['ตรงกัน', summary.matched_ok, 'text-emerald-700 bg-emerald-50'],
                                    ['ขาดเงิน', summary.matched_short, 'text-rose-700 bg-rose-50'],
                                    ['เกิน', summary.matched_over, 'text-amber-700 bg-amber-50'],
                                    ['เฉพาะ HOSxP', summary.only_hosxp, 'text-sky-700 bg-sky-50'],
                                    ['เฉพาะ STM', summary.only_stm, 'text-violet-700 bg-violet-50'],
                                ].map(([label, value, cls]) => (
                                    <div key={String(label)} className={`rounded-2xl px-3 py-3 text-center ${cls}`}>
                                        <div className="text-lg font-bold">{Number(value).toLocaleString()}</div>
                                        <div className="text-[11px] font-medium">{label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center text-sm text-slate-500">
                            ยังไม่มีผลการเปรียบเทียบ — เริ่มจากนำเข้าไฟล์ STM_xxxxx_OPxxxxxx_xx.xls
                        </div>
                    )}
                </Panel>

                <Panel title="วิธีใช้งานสั้น ๆ" description="3 ขั้นตอนจบ">
                    <ol className="space-y-3 text-sm text-slate-600">
                        <li className="flex gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">1</span>
                            ดาวน์โหลด Statement จาก e-Claim (ไฟล์ STM)
                        </li>
                        <li className="flex gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">2</span>
                            นำเข้าที่เมนู “นำเข้า STM” ระบบจะดึง Visit สิทธิ์จ่ายตรงจาก HOSxP ให้เอง
                        </li>
                        <li className="flex gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">3</span>
                            ดูรายการขาดเงิน แล้วส่งออก Excel / PDF
                        </li>
                    </ol>
                    <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs leading-relaxed text-emerald-900">
                        ค่าเริ่มต้น: OPD · pttype LIKE 12% · ไม่รวมแผนก 021 · จับคู่ HN + PID + SEQ NO
                    </div>
                </Panel>
            </div>

            <div className="mt-6">
                <Panel title="ไฟล์ที่นำเข้าล่าสุด" description="คลิกเพื่อดูรายละเอียดและส่งออกรายงาน">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                    <th className="px-3 py-2">เอกสาร</th>
                                    <th className="px-3 py-2">ช่วงวันที่</th>
                                    <th className="px-3 py-2 text-right">รายการ</th>
                                    <th className="px-3 py-2 text-right">เรียกเก็บ</th>
                                    <th className="px-3 py-2 text-right">ยอดขาด</th>
                                    <th className="px-3 py-2">สถานะ</th>
                                    <th className="px-3 py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {batches.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                                            ยังไม่มีไฟล์
                                        </td>
                                    </tr>
                                )}
                                {batches.map((batch) => (
                                    <tr key={batch.id} className="border-b border-slate-50 hover:bg-emerald-50/40">
                                        <td className="px-3 py-3">
                                            <div className="font-semibold text-slate-800">{batch.document_no || batch.filename}</div>
                                            <div className="text-xs text-slate-400">{batch.created_at}</div>
                                        </td>
                                        <td className="px-3 py-3 text-slate-600">
                                            {batch.visit_date_min || '-'} → {batch.visit_date_max || '-'}
                                        </td>
                                        <td className="px-3 py-3 text-right">{batch.row_count.toLocaleString()}</td>
                                        <td className="px-3 py-3 text-right">{money(batch.total_claim)}</td>
                                        <td className="px-3 py-3 text-right font-semibold text-rose-600">
                                            {money(batch.latest_reconciliation?.total_shortfall || 0)}
                                        </td>
                                        <td className="px-3 py-3">
                                            <StatusPill
                                                label={batch.status === 'reconciled' ? 'เปรียบเทียบแล้ว' : 'นำเข้าแล้ว'}
                                                className={
                                                    batch.status === 'reconciled'
                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                        : 'border-slate-200 bg-slate-50 text-slate-600'
                                                }
                                            />
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button asChild variant="outline" size="sm" className="rounded-xl">
                                                    <Link href={route('finance.cgd.show', batch.id)}>เปิด</Link>
                                                </Button>
                                                <DeleteBatchButton
                                                    batchId={batch.id}
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
