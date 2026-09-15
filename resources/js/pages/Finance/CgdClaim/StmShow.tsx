import React from 'react';
import { Link } from '@inertiajs/react';
import { ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { QualityPage, Panel, StatusPill } from '@/components/quality/quality-ui';
import DataHubSubNav, { dataHubBreadcrumbs } from '../DataHub/DataHubSubNav';
import ClaimModuleSubNav from '../DataHub/ClaimModuleSubNav';
import { Button } from '@/components/ui/button';

interface Props {
    import: {
        id: number;
        claim_submission_no: string;
        filename: string;
        hcode: string | null;
        hospital_name: string | null;
        province: string | null;
        channel: string | null;
        period_label: string | null;
        reported_at: string | null;
        detail_count: number;
        summary_count: number;
        rep_count: number;
        total_claim: number;
        total_approved: number;
        visit_date_min: string | null;
        visit_date_max: string | null;
        sheet_names: string[];
        imported_by?: string | null;
        created_at: string;
        notes?: string | null;
    };
    summaries: Array<{
        id: number;
        rep_no: string | null;
        period: string | null;
        hcode: string | null;
        count_total: number;
        count_pass: number;
        count_fail: number;
        amount_claim: number;
        amount_act: number;
        amount_drug: number;
        amount_treat: number;
        amount_paid_total: number;
    }>;
    details: {
        data: Array<{
            id: number;
            rep_no: string | null;
            row_no: number | null;
            hn: string | null;
            pid: string | null;
            seq_no: string | null;
            patient_name: string | null;
            visit_date: string | null;
            amount_claim: number;
            amount_approved: number;
            amount_treat: number;
            amount_drug: number;
        }>;
        links: { url: string | null; label: string; active: boolean }[];
        current_page?: number;
        last_page?: number;
    };
}

const money = (n: number) =>
    new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

export default function StmShow({ import: batch, summaries, details }: Props) {
    return (
        <QualityPage
            tone="emerald"
            icon={FileSpreadsheet}
            badge="Financial Data Hub"
            title={batch.claim_submission_no}
            subtitle={`เลขที่นำเบิก · ${batch.filename} · นำเข้า ${batch.created_at}`}
            breadcrumbs={dataHubBreadcrumbs({
                title: batch.claim_submission_no,
                href: route('finance.cgd.stm.show', batch.id),
            })}
            headTitle={`STM ${batch.claim_submission_no}`}
            subNav={<DataHubSubNav active="finance.cgd.dashboard" />}
            actions={
                <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" className="rounded-xl">
                        <Link href={route('finance.cgd.stm.index')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            กลับรายการ STM
                        </Link>
                    </Button>
                    <Button asChild className="rounded-xl bg-emerald-700 hover:bg-emerald-800">
                        <Link href={route('finance.cgd.stm.compare', batch.id)}>
                            เปรียบเทียบ HOSxP
                        </Link>
                    </Button>
                </div>
            }
        >
            <ClaimModuleSubNav
                dashboardUrl={route('finance.cgd.dashboard')}
                importUrl={route('finance.cgd.import')}
                stmUrl={route('finance.cgd.stm.index')}
                precheckUrl={route('finance.cgd.precheck')}
                active="stm"
            />

            <div className="mb-4 flex flex-wrap gap-2">
                <StatusPill
                    label={`เลขที่นำเบิก ${batch.claim_submission_no}`}
                    className="border-emerald-200 bg-emerald-50 text-emerald-800"
                />
                {(batch.sheet_names || []).map((name) => (
                    <StatusPill key={name} label={name} className="border-slate-200 bg-white text-slate-700" />
                ))}
                <StatusPill
                    label={`${batch.detail_count.toLocaleString()} รายการ · ${batch.rep_count} REP`}
                    className="border-sky-200 bg-sky-50 text-sky-800"
                />
            </div>

            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { label: 'เรียกเก็บรวม', value: money(batch.total_claim) },
                    { label: 'พึงรับรวม', value: money(batch.total_approved) },
                    {
                        label: 'ช่วงวันเข้ารักษา',
                        value: `${batch.visit_date_min || '-'} → ${batch.visit_date_max || '-'}`,
                    },
                    {
                        label: 'หน่วยบริการ',
                        value: [batch.hcode, batch.hospital_name].filter(Boolean).join(' ') || '-',
                    },
                ].map((card) => (
                    <div key={card.label} className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                        <div className="text-xs text-slate-500">{card.label}</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900">{card.value}</div>
                    </div>
                ))}
            </div>

            <Panel title="แท็บ สรุป(พึงรับ)" description="แยกตาม REP NO">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                <th className="px-3 py-2">REP NO</th>
                                <th className="px-3 py-2 text-right">ทั้งหมด</th>
                                <th className="px-3 py-2 text-right">ผ่าน</th>
                                <th className="px-3 py-2 text-right">ไม่ผ่าน</th>
                                <th className="px-3 py-2 text-right">เรียกเก็บ</th>
                                <th className="px-3 py-2 text-right">ค่ายา</th>
                                <th className="px-3 py-2 text-right">ค่ารักษา</th>
                                <th className="px-3 py-2 text-right">จ่ายชดเชยทั้งสิ้น</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summaries.map((row) => (
                                <tr key={row.id} className="border-b border-slate-50">
                                    <td className="px-3 py-2 font-medium">{row.rep_no}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{row.count_total.toLocaleString()}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{row.count_pass.toLocaleString()}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{row.count_fail.toLocaleString()}</td>
                                    <td className="px-3 py-2 text-right">{money(row.amount_claim)}</td>
                                    <td className="px-3 py-2 text-right">{money(row.amount_drug)}</td>
                                    <td className="px-3 py-2 text-right">{money(row.amount_treat)}</td>
                                    <td className="px-3 py-2 text-right font-semibold">{money(row.amount_paid_total)}</td>
                                </tr>
                            ))}
                            {summaries.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-3 py-8 text-center text-slate-400">
                                        ไม่มีข้อมูลสรุป
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Panel>

            <div className="mt-6">
                <Panel title="แท็บ พึงรับ (รายละเอียด)" description="รายการตาม SEQ">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                                    <th className="px-3 py-2">REP</th>
                                    <th className="px-3 py-2">HN</th>
                                    <th className="px-3 py-2">SEQ</th>
                                    <th className="px-3 py-2">ชื่อ</th>
                                    <th className="px-3 py-2">วันที่</th>
                                    <th className="px-3 py-2 text-right">เรียกเก็บ</th>
                                    <th className="px-3 py-2 text-right">พึงรับ</th>
                                    <th className="px-3 py-2 text-right">ค่ารักษา</th>
                                    <th className="px-3 py-2 text-right">ค่ายา</th>
                                </tr>
                            </thead>
                            <tbody>
                                {details.data.map((row) => (
                                    <tr key={row.id} className="border-b border-slate-50">
                                        <td className="px-3 py-2 whitespace-nowrap">{row.rep_no || '-'}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{row.hn}</td>
                                        <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{row.seq_no}</td>
                                        <td className="px-3 py-2">{row.patient_name || '-'}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{row.visit_date || '-'}</td>
                                        <td className="px-3 py-2 text-right">{money(row.amount_claim)}</td>
                                        <td className="px-3 py-2 text-right">{money(row.amount_approved)}</td>
                                        <td className="px-3 py-2 text-right">{money(row.amount_treat)}</td>
                                        <td className="px-3 py-2 text-right">{money(row.amount_drug)}</td>
                                    </tr>
                                ))}
                                {details.data.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="px-3 py-8 text-center text-slate-400">
                                            ไม่มีรายละเอียด
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {(details.last_page || 1) > 1 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {details.links.map((link, idx) =>
                                link.url ? (
                                    <Link
                                        key={`${link.label}-${idx}`}
                                        href={link.url}
                                        className={`rounded-lg border px-3 py-1.5 text-sm ${
                                            link.active
                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                                                : 'border-slate-200 bg-white text-slate-600'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ) : (
                                    <span
                                        key={`${link.label}-${idx}`}
                                        className="rounded-lg border border-slate-100 px-3 py-1.5 text-sm text-slate-300"
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ),
                            )}
                        </div>
                    )}
                </Panel>
            </div>
        </QualityPage>
    );
}
