import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { ClipboardCheck, Search } from 'lucide-react';
import { QualityPage, Panel, StatusPill, EmptyState } from '@/components/quality/quality-ui';
import EnvSubNav from '@/pages/Env/EnvSubNav';
import AssetsSubNav from '@/pages/Env/Assets/AssetsSubNav';
import InspectionSubNav from '@/pages/Env/Assets/Inspection/InspectionSubNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';


interface LineOption {
    id: number;
    code: string;
    name: string;
    short_name?: string | null;
    count: number;
}

interface Asset {
    id: number;
    line?: LineOption | null;
    registry_status: string;
    registry_status_label: string;
    name: string;
    model?: string | null;
    serial_number?: string | null;
    stock_number?: string | null;
    brand?: string | null;
    price?: number | null;
    issue_location?: string | null;
    location?: string | null;
    risk_level: string;
    risk_level_label?: string;
    inspection_status_label?: string;
}

interface Props {
    assets: {
        data: Asset[];
        links: { url: string | null; label: string; active: boolean }[];
        total: number;
        from?: number | null;
        to?: number | null;
    };
    lines: LineOption[];
    registryStatuses: { value: string; label: string; count: number }[];
    summary: { total: number; value: number };
    filters: {
        line_id?: number | null;
        registry_status?: string | null;
        q?: string;
    };
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

export default function Inspection({ assets, lines, registryStatuses, summary, filters }: Props) {
    const [q, setQ] = useState(filters.q || '');

    const applyFilters = (next: Partial<Props['filters']> = {}) => {
        router.get(
            route('env.assets.inspection'),
            {
                line_id: next.line_id !== undefined ? next.line_id || undefined : filters.line_id || undefined,
                registry_status:
                    next.registry_status !== undefined
                        ? next.registry_status || undefined
                        : filters.registry_status || undefined,
                q: next.q !== undefined ? next.q || undefined : q || undefined,
            },
            { preserveState: true, replace: true },
        );
    };

    return (
        <QualityPage
            tone="teal"
            icon={ClipboardCheck}
            badge="ศูนย์พัฒนาคุณภาพ · ENV"
            title="การสอบเทียบครุภัณฑ์"
            subtitle="แสดงเฉพาะรายการที่กำหนดการสอบเทียบเป็น “สอบเทียบ”"
            breadcrumbs={[
                { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
                { title: 'ENV', href: route('env.index') },
                { title: 'ทะเบียนครุภัณฑ์', href: route('env.assets.index') },
                { title: 'การสอบเทียบ', href: route('env.assets.inspection') },
            ]}
            headTitle="การสอบเทียบครุภัณฑ์ ENV"
            subNav={<EnvSubNav active="env.assets.index" />}
        >
            <AssetsSubNav active="inspection" />
            <InspectionSubNav active="catalog" />

            <div className="mb-4 grid gap-3 sm:grid-cols-2">

                <div className="rounded-2xl border border-teal-100 bg-white px-4 py-3 shadow-sm">
                    <div className="text-xs text-slate-500">รายการที่ต้องสอบเทียบ</div>
                    <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                        {summary.total.toLocaleString('th-TH')}
                    </div>
                </div>
                <div className="rounded-2xl border border-teal-100 bg-white px-4 py-3 shadow-sm">
                    <div className="text-xs text-slate-500">มูลค่ารวม</div>
                    <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{money(summary.value)}</div>
                </div>
            </div>

            <Panel title="สายงาน" className="mb-4">
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => applyFilters({ line_id: null })}>
                        <StatusPill
                            label={`ทุกสาย · ${lines.reduce((s, l) => s + l.count, 0).toLocaleString('th-TH')}`}
                            className={cn(
                                'border-slate-200 bg-white text-slate-700',
                                !filters.line_id && 'ring-2 ring-teal-400 ring-offset-1',
                            )}
                        />
                    </button>
                    {lines.map((line) => (
                        <button key={line.id} type="button" onClick={() => applyFilters({ line_id: line.id })}>
                            <StatusPill
                                label={`${line.name} · ${line.count.toLocaleString('th-TH')}`}
                                className={cn(
                                    'border-teal-200 bg-teal-50 text-teal-800',
                                    filters.line_id === line.id && 'ring-2 ring-teal-400 ring-offset-1',
                                )}
                            />
                        </button>
                    ))}
                </div>
            </Panel>

            <Panel title="สถานะ" className="mb-4">
                <div className="flex flex-wrap gap-2">
                    {registryStatuses.map((s) => (
                        <button
                            key={s.value}
                            type="button"
                            onClick={() =>
                                applyFilters({
                                    registry_status: filters.registry_status === s.value ? null : s.value,
                                })
                            }
                        >
                            <StatusPill
                                label={`${s.label} · ${s.count.toLocaleString('th-TH')}`}
                                className={cn(
                                    registryStyle[s.value],
                                    filters.registry_status === s.value && 'ring-2 ring-teal-400 ring-offset-1',
                                )}
                            />
                        </button>
                    ))}
                </div>
            </Panel>

            <Panel
                title="รายการที่ต้องสอบเทียบ"
                description={`แสดง ${assets.from ?? 0}-${assets.to ?? 0} จาก ${assets.total.toLocaleString('th-TH')} รายการ`}
                action={
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative min-w-[220px]">
                            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') applyFilters({ q });
                                }}
                                placeholder="ค้นหา รายการ / หมายเลข สป. / SN"
                                className="rounded-xl pl-9"
                            />
                        </div>
                        <Button variant="outline" className="rounded-xl" onClick={() => applyFilters({ q })}>
                            ค้นหา
                        </Button>
                    </div>
                }
            >
                {assets.data.length === 0 ? (
                    <EmptyState text="ไม่พบรายการที่ต้องสอบเทียบ" />
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full min-w-[1000px] border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                    <th className="px-3 py-2.5">การสอบเทียบ</th>
                                    <th className="px-3 py-2.5">สถานะ</th>
                                    <th className="px-3 py-2.5">สาย</th>
                                    <th className="px-3 py-2.5">รายการ</th>
                                    <th className="px-3 py-2.5">หมายเลข สป.</th>
                                    <th className="px-3 py-2.5">ความเสี่ยง</th>
                                    <th className="px-3 py-2.5 text-right">ราคา</th>
                                    <th className="px-3 py-2.5">ที่ตั้ง</th>
                                    <th className="px-3 py-2.5"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {assets.data.map((item) => (
                                    <tr key={item.id} className="border-b border-slate-50 hover:bg-teal-50/30">
                                        <td className="px-3 py-2.5 align-top">
                                            <StatusPill
                                                label={item.inspection_status_label || 'สอบเทียบ'}
                                                className="border-violet-200 bg-violet-50 text-violet-800"
                                            />
                                        </td>
                                        <td className="px-3 py-2.5 align-top">
                                            <StatusPill
                                                label={item.registry_status_label}
                                                className={registryStyle[item.registry_status]}
                                            />
                                        </td>
                                        <td className="px-3 py-2.5 align-top text-xs text-slate-600">
                                            {item.line?.short_name || item.line?.name || '-'}
                                        </td>
                                        <td className="max-w-[220px] px-3 py-2.5 align-top">
                                            <div className="font-medium text-slate-900">{item.name}</div>
                                            {item.serial_number && (
                                                <div className="mt-0.5 font-mono text-[11px] text-slate-500">
                                                    SN {item.serial_number}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5 align-top font-mono text-xs">
                                            {item.stock_number || '-'}
                                        </td>
                                        <td className="px-3 py-2.5 align-top text-xs">
                                            {item.risk_level_label || item.risk_level || '-'}
                                        </td>
                                        <td className="px-3 py-2.5 align-top text-right tabular-nums">
                                            {money(item.price)}
                                        </td>
                                        <td className="max-w-[160px] px-3 py-2.5 align-top text-xs text-slate-600">
                                            <div className="line-clamp-3">
                                                {item.issue_location || item.location || '-'}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5 align-top text-right">
                                            <Button asChild size="sm" variant="outline" className="rounded-xl">
                                                <Link href={route('env.assets.index', { q: item.stock_number || item.name })}>
                                                    เปิดในทะเบียน
                                                </Link>
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {assets.links?.length > 3 && (
                    <div className="mt-4 flex flex-wrap gap-1">
                        {assets.links.map((link, i) => (
                            <Button
                                key={`${link.label}-${i}`}
                                size="sm"
                                variant={link.active ? 'default' : 'outline'}
                                className="rounded-lg"
                                disabled={!link.url}
                                onClick={() => link.url && router.get(link.url)}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </Panel>
        </QualityPage>
    );
}
