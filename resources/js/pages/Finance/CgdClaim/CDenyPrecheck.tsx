import React, { useMemo, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    BookOpen,
    CheckCircle2,
    FileWarning,
    RefreshCw,
    ShieldAlert,
    Stethoscope,
} from 'lucide-react';
import { QualityPage, Panel, StatusPill, StatCard } from '@/components/quality/quality-ui';
import DataHubSubNav, { dataHubBreadcrumbs } from '../DataHub/DataHubSubNav';
import ClaimModuleSubNav from '../DataHub/ClaimModuleSubNav';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ThaiDatePicker } from '@/components/ui/thai-date-picker';
import { cn } from '@/lib/utils';
import { maskCid, maskPatientName } from '@/lib/pii';
import { claimRoute, resolveClaimModule, type ClaimModuleMeta } from './claimModule';

type Severity = 'red' | 'yellow' | 'green';

interface Finding {
    severity: Severity;
    code?: string | null;
    title: string;
    guide: string;
    field: string;
}

interface VisitRow {
    vn: string;
    hn: string;
    patient_name?: string | null;
    pid?: string | null;
    visit_date: string;
    visit_time?: string | null;
    department?: string | null;
    pttype_label?: string | null;
    total: number;
    diagnoses: Array<{ icd10: string; diagtype: string; is_principal: boolean; is_hai: boolean }>;
    item_count: number;
    approve?: {
        codes?: string[];
        sources?: string[];
        auth_datetime?: string | null;
        in_visit_pttype?: boolean;
        from_edc?: boolean;
    };
    projects?: {
        visit_project_code?: string | null;
        visit_project_name?: string | null;
        fee_schedules?: Array<{ type_code?: string | null; type_name?: string | null; sub_type_name?: string | null }>;
        item_projects?: Array<{ icode: string; name: string; nhso_project_code: string; nhso_project_name?: string | null }>;
    };
    ned?: {
        items?: Array<{ icode: string; name: string; qty?: number | string | null }>;
        missing_reason?: Array<{ icode: string; name: string }>;
    };
    blood?: {
        has_transfusion?: boolean;
        operations?: Array<{ icd9?: string | null; name?: string | null }>;
    };
    prior_stm_errors?: Array<{ error_code: string; count: number; last_visit_date?: string | null }>;
    severity: Severity;
    findings: Finding[];
}

interface StmInsightCode {
    code: string;
    count: number;
    description: string;
    rule: string;
}

interface Props {
    module?: ClaimModuleMeta;
    visit_date: string;
    severity: 'all' | Severity;
    hosxpReady: boolean;
    summary: { total: number; red: number; yellow: number; green: number };
    visits: VisitRow[];
    references: Array<{ title: string; detail: string }>;
    catalogSource: string;
    stmInsights?: { total_error_rows: number; top_codes: StmInsightCode[] };
}

const SEVERITY_META: Record<Severity, { label: string; className: string; hint: string }> = {
    red: {
        label: 'แดง — เสี่ยงติด C แน่นอน',
        className: 'border-rose-200 bg-rose-50 text-rose-700',
        hint: 'ข้อมูลขาด/ผิดพลาดร้ายแรง',
    },
    yellow: {
        label: 'เหลือง — เสี่ยง Deny',
        className: 'border-amber-200 bg-amber-50 text-amber-800',
        hint: 'ข้อมูลไม่ครบถ้วนสมบูรณ์',
    },
    green: {
        label: 'เขียว — ผ่านเกณฑ์',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        hint: 'ผ่านเกณฑ์เบื้องต้นที่ตรวจได้',
    },
};

export default function CDenyPrecheck({
    module,
    visit_date,
    severity,
    hosxpReady,
    summary,
    visits,
    references,
    catalogSource,
    stmInsights,
}: Props) {
    const mod = resolveClaimModule(module);
    const [date, setDate] = useState(visit_date);
    const [openVn, setOpenVn] = useState<string | null>(visits[0]?.vn ?? null);
    const flash = (usePage().props as { flash?: { error?: string } }).flash;

    const applyFilters = (next?: { visit_date?: string; severity?: string }) => {
        router.get(
            claimRoute(mod, 'precheck'),
            {
                visit_date: next?.visit_date ?? date,
                severity: next?.severity ?? severity,
            },
            { preserveState: true, replace: true },
        );
    };

    const toneFor = (s: Severity) => SEVERITY_META[s];

    const filteredHint = useMemo(() => {
        if (severity === 'all') return `ทั้งหมด ${summary.total} ราย`;
        return `${SEVERITY_META[severity].label}: ${summary[severity]} ราย (จาก ${summary.total})`;
    }, [severity, summary]);

    return (
        <QualityPage
            tone="emerald"
            icon={ShieldAlert}
            badge="Financial Data Hub · จ่ายตรง"
            title="ตรวจก่อนเบิก C Deny"
            subtitle="ตรวจความครบถ้วนของข้อมูลผู้ป่วยสิทธิจ่ายตรงกรมบัญชีกลางก่อนส่ง e-Claim ตามรายละเอียดคำอธิบาย C Deny"
            breadcrumbs={dataHubBreadcrumbs({ title: 'ตรวจก่อนเบิก C Deny', href: claimRoute(mod, 'precheck') })}
            headTitle="ตรวจก่อนเบิก C Deny"
            actions={
                <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => applyFilters()}
                >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    รีเฟรช
                </Button>
            }
            subNav={
                <>
                    <DataHubSubNav active="finance.cgd.dashboard" />
                    <ClaimModuleSubNav
                        dashboardUrl={claimRoute(mod, 'dashboard')}
                        importUrl={claimRoute(mod, 'import')}
                        stmUrl={mod.has_stm ? claimRoute(mod, 'stm_index') : undefined}
                        precheckUrl={claimRoute(mod, 'precheck')}
                        active="precheck"
                    />
                </>
            }
        >
            {flash?.error && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {flash.error}
                </div>
            )}

            {!hosxpReady && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    เชื่อมต่อ HOSxP ไม่ได้ — ไม่สามารถดึง Visit ของวันที่เลือกได้
                </div>
            )}

            <Panel title="เลือกวันตรวจ" description="ดึง Visit สิทธิ 12% (จ่ายตรง) จาก HOSxP ตามวันรับบริการ">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[200px]">
                        <Label>วันรับบริการ</Label>
                        <ThaiDatePicker value={date} onChange={setDate} />
                    </div>
                    <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700" onClick={() => applyFilters({ visit_date: date })}>
                        ตรวจข้อมูล
                    </Button>
                    <p className="text-sm text-slate-500">{filteredHint}</p>
                </div>
            </Panel>

            {(stmInsights?.top_codes?.length ?? 0) > 0 && (
                <Panel
                    className="mt-4"
                    title="Rule จาก error จริงใน STM/REP"
                    description={`วิเคราะห์จาก ${stmInsights!.total_error_rows.toLocaleString()} แถวที่ติด C ในไฟล์ STM ที่นำเข้าแล้ว — ใช้กันซ้ำก่อนส่งเบิก`}
                >
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {stmInsights!.top_codes.map((row) => (
                            <div key={row.code} className="rounded-xl border border-slate-200 bg-white p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono text-sm font-semibold text-rose-700">C{row.code}</span>
                                    <span className="text-xs text-slate-500">{row.count.toLocaleString()} ครั้ง</span>
                                </div>
                                <p className="mt-1 text-sm text-slate-700">{row.description || '—'}</p>
                                <p className="mt-2 text-xs leading-relaxed text-emerald-800">
                                    <span className="font-semibold">Rule ที่ใช้กัน: </span>
                                    {row.rule}
                                </p>
                            </div>
                        ))}
                    </div>
                </Panel>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Visit ทั้งหมด" value={summary.total} icon={Stethoscope} tone="slate" />
                <button type="button" onClick={() => applyFilters({ severity: 'red' })} className="text-left">
                    <StatCard label="แดง (ติด C แน่นอน)" value={summary.red} icon={AlertTriangle} tone="rose" />
                </button>
                <button type="button" onClick={() => applyFilters({ severity: 'yellow' })} className="text-left">
                    <StatCard label="เหลือง (เสี่ยง Deny)" value={summary.yellow} icon={FileWarning} tone="amber" />
                </button>
                <button type="button" onClick={() => applyFilters({ severity: 'green' })} className="text-left">
                    <StatCard label="เขียว (ผ่านเกณฑ์)" value={summary.green} icon={CheckCircle2} tone="emerald" />
                </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                {(['all', 'red', 'yellow', 'green'] as const).map((key) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => applyFilters({ severity: key })}
                        className={cn(
                            'rounded-full border px-3 py-1 text-xs font-semibold',
                            severity === key ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-white text-slate-600',
                        )}
                    >
                        {key === 'all' ? 'ทั้งหมด' : SEVERITY_META[key].label}
                    </button>
                ))}
            </div>

            <Panel
                className="mt-4"
                title="รายการ Visit"
                description={`แหล่งเกณฑ์: ${catalogSource || 'C Deny catalog'}`}
            >
                {visits.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">ไม่พบ Visit ตามเงื่อนไข</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                                    <th className="py-2 pr-3">ระดับ</th>
                                    <th className="py-2 pr-3">HN / VN</th>
                                    <th className="py-2 pr-3">ผู้ป่วย</th>
                                    <th className="py-2 pr-3">สิทธิ / แผนก</th>
                                    <th className="py-2 pr-3">Dx / รายการ</th>
                                    <th className="py-2 pr-3">Approve / โครงการ</th>
                                    <th className="py-2 pr-3">ยอด</th>
                                    <th className="py-2">ประเด็น</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visits.map((v) => {
                                    const meta = toneFor(v.severity);
                                    const open = openVn === v.vn;
                                    return (
                                        <React.Fragment key={v.vn}>
                                            <tr
                                                className="cursor-pointer border-b border-slate-50 hover:bg-slate-50/80"
                                                onClick={() => setOpenVn(open ? null : v.vn)}
                                            >
                                                <td className="py-2.5 pr-3">
                                                    <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold', meta.className)}>
                                                        {meta.label.split('—')[0].trim()}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 pr-3 font-mono text-xs">
                                                    <div>HN {v.hn}</div>
                                                    <div className="text-slate-400">VN {v.vn}</div>
                                                </td>
                                                <td className="py-2.5 pr-3">
                                                    <div className="font-medium text-slate-800">{maskPatientName(v.patient_name)}</div>
                                                    <div className="font-mono text-xs text-slate-400">{maskCid(v.pid)}</div>
                                                </td>
                                                <td className="py-2.5 pr-3 text-slate-600">
                                                    <div>{v.pttype_label || '-'}</div>
                                                    <div className="text-xs text-slate-400">{v.department || '-'}</div>
                                                </td>
                                                <td className="py-2.5 pr-3 text-slate-600">
                                                    <div>
                                                        {v.diagnoses.filter((d) => d.is_principal).map((d) => d.icd10).join(', ') || '—'}
                                                    </div>
                                                    <div className="text-xs text-slate-400">{v.item_count} รายการ</div>
                                                </td>
                                                <td className="py-2.5 pr-3 text-slate-600">
                                                    <div className="font-mono text-xs">
                                                        {(v.approve?.codes && v.approve.codes.length > 0)
                                                            ? v.approve.codes.join(', ')
                                                            : '— ไม่มี Approve'}
                                                    </div>
                                                    <div className="text-xs text-slate-400">
                                                        {v.projects?.visit_project_code
                                                            ? `โครงการ ${v.projects.visit_project_code}`
                                                            : (v.projects?.item_projects?.length
                                                                ? `รายการโครงการ ${v.projects.item_projects.length}`
                                                                : (v.projects?.fee_schedules?.length
                                                                    ? `Fee Schedule ${v.projects.fee_schedules.length}`
                                                                    : 'ไม่มีโครงการ'))}
                                                    </div>
                                                </td>
                                                <td className="py-2.5 pr-3 font-mono text-slate-700">
                                                    {Number(v.total || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-2.5 text-slate-600">
                                                    {v.findings.filter((f) => f.severity !== 'green').length || 'ผ่าน'}
                                                </td>
                                            </tr>
                                            {open && (
                                                <tr className="border-b border-slate-100 bg-slate-50/60">
                                                    <td colSpan={8} className="px-3 py-3">
                                                        <div className="space-y-2">
                                                            {v.findings.map((f, idx) => (
                                                                <div key={`${v.vn}-${idx}`} className="rounded-xl border border-slate-200 bg-white p-3">
                                                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                                                        <StatusPill
                                                                            label={SEVERITY_META[f.severity].label}
                                                                            className={SEVERITY_META[f.severity].className}
                                                                        />
                                                                        {f.code && <span className="font-mono text-xs text-slate-500">รหัส {f.code}</span>}
                                                                    </div>
                                                                    <p className="text-sm font-semibold text-slate-800">{f.title}</p>
                                                                    <p className="mt-1 text-sm text-slate-600">
                                                                        <span className="font-medium text-slate-700">วิธีแก้: </span>
                                                                        {f.guide}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                            <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
                                                                <p>
                                                                    <span className="font-semibold text-slate-700">Approve Code: </span>
                                                                    {(v.approve?.codes && v.approve.codes.length > 0)
                                                                        ? v.approve.codes.join(', ')
                                                                        : 'ไม่พบ'}
                                                                    {v.approve?.auth_datetime ? ` · เวลา ${v.approve.auth_datetime}` : ''}
                                                                </p>
                                                                <p className="mt-1">
                                                                    <span className="font-semibold text-slate-700">แหล่งข้อมูล: </span>
                                                                    {(v.approve?.sources && v.approve.sources.length > 0)
                                                                        ? v.approve.sources.join(', ')
                                                                        : '-'}
                                                                    {v.approve?.in_visit_pttype ? ' · ลง visit_pttype แล้ว' : ''}
                                                                    {v.approve?.from_edc ? ' · จาก EDC' : ''}
                                                                </p>
                                                                <p className="mt-1">
                                                                    <span className="font-semibold text-slate-700">โครงการพิเศษ: </span>
                                                                    {v.projects?.visit_project_code
                                                                        ? `${v.projects.visit_project_code}${v.projects.visit_project_name ? ` (${v.projects.visit_project_name})` : ''}`
                                                                        : 'ไม่ระบุที่ Visit'}
                                                                </p>
                                                                {(v.projects?.fee_schedules?.length ?? 0) > 0 && (
                                                                    <p className="mt-1">
                                                                        Fee Schedule:{' '}
                                                                        {v.projects!.fee_schedules!
                                                                            .map((f) => f.type_name || f.type_code || '-')
                                                                            .join(', ')}
                                                                    </p>
                                                                )}
                                                                {(v.projects?.item_projects?.length ?? 0) > 0 && (
                                                                    <p className="mt-1">
                                                                        รายการผูกโครงการ:{' '}
                                                                        {v.projects!.item_projects!
                                                                            .map((p) => `${p.nhso_project_code}/${p.icode}`)
                                                                            .join(', ')}
                                                                    </p>
                                                                )}
                                                                {(v.ned?.missing_reason?.length ?? 0) > 0 && (
                                                                    <p className="mt-1 text-amber-800">
                                                                        NED ไม่มีเหตุผล EA–EF:{' '}
                                                                        {v.ned!.missing_reason!.map((d) => d.icode).join(', ')}
                                                                    </p>
                                                                )}
                                                                {(v.prior_stm_errors?.length ?? 0) > 0 && (
                                                                    <p className="mt-1">
                                                                        ประวัติ STM:{' '}
                                                                        {v.prior_stm_errors!
                                                                            .slice(0, 4)
                                                                            .map((e) => `C${e.error_code}×${e.count}`)
                                                                            .join(', ')}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            {v.diagnoses.length > 0 && (
                                                                <p className="text-xs text-slate-500">
                                                                    ICD: {v.diagnoses.map((d) => `${d.icd10}${d.is_principal ? ' (PDx)' : ''}${d.is_hai ? ' [HAI]' : ''}`).join(', ')}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>

            <Panel className="mt-4" title="แหล่งอ้างอิงมาตรฐาน" description="ใช้ประกอบการตีความผลการตรวจและบันทึกเวชระเบียน">
                <div className="grid gap-3 md:grid-cols-2">
                    {references.map((ref) => (
                        <div key={ref.title} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                            <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
                                <BookOpen className="h-4 w-4 text-emerald-600" />
                                {ref.title}
                            </div>
                            <p className="text-sm leading-relaxed text-slate-600">{ref.detail}</p>
                        </div>
                    ))}
                </div>
                <p className="mt-3 text-xs text-slate-400">
                    กลับไปที่{' '}
                    <Link href={claimRoute(mod, 'dashboard')} className="text-emerald-700 underline">
                        หน้าตรวจสอบ STM–HOSxP
                    </Link>{' '}
                    เมื่อต้องการเทียบหลังนำเข้า REP/STM
                </p>
            </Panel>
        </QualityPage>
    );
}
