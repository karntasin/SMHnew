import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import { QualityPage, Panel, StatusPill } from '@/components/quality/quality-ui';
import EnvSubNav from '@/pages/Env/EnvSubNav';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface LineOption {
    id: number;
    code: string;
    name: string;
    short_name?: string | null;
}

interface LineSummary extends LineOption {
    total: number;
    normal: number;
    repair: number;
    pending_disposal: number;
    disposed: number;
    with_image: number;
    value: number;
}

interface AssetRow {
    id: number;
    registry_status: string;
    registry_status_label: string;
    name: string;
    stock_number?: string | null;
    serial_number?: string | null;
    brand?: string | null;
    model?: string | null;
    condition_code?: string | null;
    company?: string | null;
    fiscal_year?: string | null;
    budget_type?: string | null;
    price?: number | null;
    issue_location?: string | null;
    control_number?: string | null;
    image_path?: string | null;
    line?: LineOption | null;
}

interface Props {
    lines: LineOption[];
    lineSummaries: LineSummary[];
    assets: AssetRow[];
    registryStatuses: { value: string; label: string; count: number; value_sum: number }[];
    summary: { total: number; with_image: number; value: number };
    filters: { line_id?: number | null; registry_status?: string | null };
    generated_at: string;
}

const money = (n?: number | null) =>
    n == null
        ? '-'
        : new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const registryStyle: Record<string, string> = {
    normal: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    repair: 'border-amber-200 bg-amber-50 text-amber-800',
    pending_disposal: 'border-orange-200 bg-orange-50 text-orange-800',
    disposed: 'border-slate-200 bg-slate-100 text-slate-600',
};

export default function Report({
    lines,
    lineSummaries,
    assets,
    registryStatuses,
    summary,
    filters,
    generated_at,
}: Props) {
    const [lineId, setLineId] = useState(filters.line_id ? String(filters.line_id) : '');
    const [status, setStatus] = useState(filters.registry_status || 'all');

    const selectedLine = lines.find((l) => l.id === Number(lineId));

    const apply = (nextLine?: string, nextStatus?: string) => {
        const lid = nextLine !== undefined ? nextLine : lineId;
        const st = nextStatus !== undefined ? nextStatus : status;
        router.get(
            route('env.assets.report'),
            {
                line_id: lid || undefined,
                registry_status: st && st !== 'all' ? st : undefined,
            },
            { preserveState: true, replace: true },
        );
    };

    return (
        <QualityPage
            tone="teal"
            icon={FileSpreadsheet}
            badge="ศูนย์พัฒนาคุณภาพ · ENV"
            title="รายงานครุภัณฑ์แยกสาย"
            subtitle={`สร้างเมื่อ ${generated_at} · เลือกสายงานเพื่อดูรายละเอียดบัญชีคุม`}
            breadcrumbs={[
                { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
                { title: 'ENV', href: route('env.index') },
                { title: 'รายงานแยกสาย', href: route('env.assets.report') },
            ]}
            headTitle="รายงานครุภัณฑ์แยกสาย"
            subNav={<EnvSubNav active="env.assets.report" />}
            actions={
                <Button asChild className="rounded-xl">
                    <a
                        href={route('env.assets.report-pdf', {
                            line_id: filters.line_id || undefined,
                            registry_status: filters.registry_status || undefined,
                        })}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <FileDown className="mr-2 h-4 w-4" />
                        ดาวน์โหลด PDF
                    </a>
                </Button>
            }
        >
            <Panel title="สรุปทุกสาย" className="mb-4 print:hidden">
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full min-w-[860px] border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[11px] font-semibold text-slate-500 uppercase">
                                <th className="px-3 py-2.5">สายงาน</th>
                                <th className="px-3 py-2.5 text-right">ทั้งหมด</th>
                                <th className="px-3 py-2.5 text-right">ปกติ</th>
                                <th className="px-3 py-2.5 text-right">ส่งซ่อม</th>
                                <th className="px-3 py-2.5 text-right">รอจำหน่าย</th>
                                <th className="px-3 py-2.5 text-right">จำหน่าย</th>
                                <th className="px-3 py-2.5 text-right">มูลค่าคงคุม</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lineSummaries.map((line) => (
                                <tr
                                    key={line.id}
                                    className={cn(
                                        'border-b border-slate-50 hover:bg-teal-50/40',
                                        Number(lineId) === line.id && 'bg-teal-50/60',
                                    )}
                                >
                                    <td className="px-3 py-2.5">
                                        <button
                                            type="button"
                                            className="font-medium text-teal-700 hover:underline"
                                            onClick={() => {
                                                setLineId(String(line.id));
                                                apply(String(line.id), status);
                                            }}
                                        >
                                            {line.name}
                                        </button>
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">{line.total.toLocaleString('th-TH')}</td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">{line.normal.toLocaleString('th-TH')}</td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">{line.repair.toLocaleString('th-TH')}</td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">
                                        {line.pending_disposal.toLocaleString('th-TH')}
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">{line.disposed.toLocaleString('th-TH')}</td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">{money(line.value)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Panel>

            <Panel
                title={selectedLine ? `รายละเอียด · ${selectedLine.name}` : 'รายละเอียดสายงาน'}
                description={`${summary.total.toLocaleString('th-TH')} รายการ · มูลค่าคงคุม ${money(summary.value)}`}
                action={
                    <div className="flex flex-wrap gap-2 print:hidden">
                        <Select
                            value={lineId}
                            onValueChange={(v) => {
                                setLineId(v);
                                apply(v, status);
                            }}
                        >
                            <SelectTrigger className="w-[220px] rounded-xl">
                                <SelectValue placeholder="เลือกสาย" />
                            </SelectTrigger>
                            <SelectContent>
                                {lines.map((line) => (
                                    <SelectItem key={line.id} value={String(line.id)}>
                                        {line.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={status}
                            onValueChange={(v) => {
                                setStatus(v);
                                apply(lineId, v);
                            }}
                        >
                            <SelectTrigger className="w-[180px] rounded-xl">
                                <SelectValue placeholder="สถานะ" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">ทุกสถานะ</SelectItem>
                                {registryStatuses.map((s) => (
                                    <SelectItem key={s.value} value={s.value}>
                                        {s.label} ({s.count})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button asChild variant="outline" className="rounded-xl">
                            <Link href={route('env.assets.index', { line_id: lineId || undefined })}>เปิดทะเบียน</Link>
                        </Button>
                    </div>
                }
            >
                <div className="mb-4 flex flex-wrap gap-2">
                    {registryStatuses.map((s) => (
                        <StatusPill
                            key={s.value}
                            label={`${s.label} · ${s.count.toLocaleString('th-TH')} · ${money(s.value_sum)}`}
                            className={registryStyle[s.value]}
                        />
                    ))}
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full min-w-[1000px] border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[11px] font-semibold text-slate-500 uppercase">
                                <th className="px-3 py-2.5">ลำดับ</th>
                                <th className="px-3 py-2.5">สถานะ</th>
                                <th className="px-3 py-2.5">รายการ</th>
                                <th className="px-3 py-2.5">หมายเลข สป.</th>
                                <th className="px-3 py-2.5">สถานภาพ</th>
                                <th className="px-3 py-2.5">ยี่ห้อ/รุ่น</th>
                                <th className="px-3 py-2.5">ปีงบ/ประเภทงบ</th>
                                <th className="px-3 py-2.5 text-right">ราคา</th>
                                <th className="px-3 py-2.5">อสอ./สป.4</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assets.map((item, idx) => (
                                <tr key={item.id} className="border-b border-slate-50">
                                    <td className="px-3 py-2 tabular-nums text-slate-500">{idx + 1}</td>
                                    <td className="px-3 py-2">
                                        <StatusPill
                                            label={item.registry_status_label}
                                            className={registryStyle[item.registry_status]}
                                        />
                                    </td>
                                    <td className="max-w-[220px] px-3 py-2">
                                        <div className="font-medium text-slate-900">{item.name}</div>
                                        {item.serial_number && (
                                            <div className="font-mono text-[11px] text-slate-500">SN {item.serial_number}</div>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 font-mono text-xs">{item.stock_number || '-'}</td>
                                    <td className="px-3 py-2 text-xs">{item.condition_code || '-'}</td>
                                    <td className="px-3 py-2 text-xs">
                                        <div>{item.brand || '-'}</div>
                                        <div className="text-slate-400">{item.model || ''}</div>
                                    </td>
                                    <td className="px-3 py-2 text-xs">
                                        <div>{item.fiscal_year || '-'}</div>
                                        <div className="text-slate-400">{item.budget_type || ''}</div>
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">{money(item.price)}</td>
                                    <td className="max-w-[160px] px-3 py-2 text-xs text-slate-600">
                                        <div className="line-clamp-2">{item.issue_location || '-'}</div>
                                    </td>
                                </tr>
                            ))}
                            {assets.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-3 py-10 text-center text-sm text-slate-500">
                                        ไม่พบรายการตามตัวกรอง
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Panel>
        </QualityPage>
    );
}
