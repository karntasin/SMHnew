import React from 'react';
import { Link } from '@inertiajs/react';
import {
    Leaf,
    Box,
    Wrench,
    AlertTriangle,
    Archive,
    Image as ImageIcon,
    FileSpreadsheet,
    Plus,
    RefreshCw,
} from 'lucide-react';
import { QualityPage, StatCard, Panel, StatusPill } from '@/components/quality/quality-ui';
import EnvSubNav from '@/pages/Env/EnvSubNav';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LineRow {
    id: number;
    code: string;
    name: string;
    short_name?: string | null;
    total: number;
    normal: number;
    repair: number;
    pending_disposal: number;
    disposed: number;
    with_image: number;
    value: number;
}

interface Props {
    dashboard: {
        total: number;
        normal: number;
        repair: number;
        pending_disposal: number;
        disposed: number;
        with_image: number;
        image_coverage: number;
        value: number;
        status_values: { key: string; label: string; total: number; value: number }[];
        lines: LineRow[];
        recent_changes: {
            id: number;
            asset_name?: string | null;
            stock_number?: string | null;
            line?: string | null;
            from?: string | null;
            to?: string | null;
            event_date?: string | null;
            note?: string | null;
        }[];
    };
}

const money = (n?: number | null) =>
    n == null
        ? '-'
        : new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const statusTone: Record<string, string> = {
    normal: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    repair: 'border-amber-200 bg-amber-50 text-amber-800',
    pending_disposal: 'border-orange-200 bg-orange-50 text-orange-800',
    disposed: 'border-slate-200 bg-slate-100 text-slate-600',
};

export default function Index({ dashboard }: Props) {
    const d = dashboard;

    return (
        <QualityPage
            tone="teal"
            icon={Leaf}
            badge="ศูนย์พัฒนาคุณภาพ · ENV"
            title="Dashboard ครุภัณฑ์ ENV"
            subtitle="สรุปทะเบียนบัญชีคุมสิ่งอุปกรณ์ แยกสายงานและสถานะ"
            breadcrumbs={[
                { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
                { title: 'ENV', href: route('env.index') },
            ]}
            headTitle="Dashboard ENV"
            subNav={<EnvSubNav active="env.index" />}
            actions={
                <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" className="rounded-xl">
                        <Link href={route('env.assets.report')}>
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            รายงานแยกสาย
                        </Link>
                    </Button>
                    <Button asChild className="rounded-xl">
                        <Link href={route('env.assets.index')}>
                            <Plus className="mr-2 h-4 w-4" />
                            ขึ้นทะเบียน
                        </Link>
                    </Button>
                </div>
            }
        >
            <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="ครุภัณฑ์ทั้งหมด" value={d.total} sub="รายการในบัญชีคุม" icon={Box} tone="teal" />
                <StatCard label="ปกติ" value={d.normal} sub="สถานะปกติ" icon={Leaf} tone="teal" />
                <StatCard label="ส่งซ่อม" value={d.repair} sub="อยู่ระหว่างซ่อม" icon={Wrench} tone="amber" />
                <StatCard
                    label="รอจำหน่าย"
                    value={d.pending_disposal}
                    sub="รอดำเนินการจำหน่าย"
                    icon={AlertTriangle}
                    tone="rose"
                />
            </div>

            <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="จำหน่าย" value={d.disposed} sub="ตัดออกจากบัญชีคุม" icon={Archive} tone="slate" />
                <StatCard
                    label="มีรูปประกอบ"
                    value={d.with_image}
                    sub={`ครอบคลุม ${d.image_coverage}%`}
                    icon={ImageIcon}
                    tone="cyan"
                />
                <div className="rounded-2xl border border-teal-100 bg-white px-4 py-4 shadow-sm sm:col-span-2">
                    <div className="text-xs text-slate-500">มูลค่าคงคุม (ปกติ + ส่งซ่อม + รอจำหน่าย)</div>
                    <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{money(d.value)}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {d.status_values.map((s) => (
                            <StatusPill
                                key={s.key}
                                label={`${s.label} ${s.total.toLocaleString('th-TH')}`}
                                className={statusTone[s.key]}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <Panel
                title="สรุปแยกสายงาน"
                description="คลิกสายเพื่อเปิดทะเบียน หรือดูรายงานของสายนั้น"
                className="mb-4"
            >
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full min-w-[900px] border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                <th className="px-3 py-2.5">สายงาน</th>
                                <th className="px-3 py-2.5 text-right">ทั้งหมด</th>
                                <th className="px-3 py-2.5 text-right">ปกติ</th>
                                <th className="px-3 py-2.5 text-right">ส่งซ่อม</th>
                                <th className="px-3 py-2.5 text-right">รอจำหน่าย</th>
                                <th className="px-3 py-2.5 text-right">จำหน่าย</th>
                                <th className="px-3 py-2.5 text-right">มีรูป</th>
                                <th className="px-3 py-2.5 text-right">มูลค่าคงคุม</th>
                                <th className="px-3 py-2.5"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {d.lines.map((line) => (
                                <tr key={line.id} className="border-b border-slate-50 hover:bg-teal-50/30">
                                    <td className="px-3 py-2.5 font-medium text-slate-900">
                                        {line.name}
                                        {line.short_name ? (
                                            <span className="ml-2 text-xs text-slate-400">({line.short_name})</span>
                                        ) : null}
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">{line.total.toLocaleString('th-TH')}</td>
                                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">
                                        {line.normal.toLocaleString('th-TH')}
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums text-amber-700">
                                        {line.repair.toLocaleString('th-TH')}
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums text-orange-700">
                                        {line.pending_disposal.toLocaleString('th-TH')}
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">
                                        {line.disposed.toLocaleString('th-TH')}
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">
                                        {line.with_image.toLocaleString('th-TH')}
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">{money(line.value)}</td>
                                    <td className="px-3 py-2.5">
                                        <div className="flex justify-end gap-1">
                                            <Button asChild size="sm" variant="ghost" className="rounded-lg">
                                                <Link href={route('env.assets.index', { line_id: line.id })}>ทะเบียน</Link>
                                            </Button>
                                            <Button asChild size="sm" variant="outline" className="rounded-lg">
                                                <Link href={route('env.assets.report', { line_id: line.id })}>รายงาน</Link>
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {d.lines.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-3 py-8 text-center text-sm text-slate-500">
                                        ยังไม่มีข้อมูล — รัน php artisan env:import-registry
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Panel>

            <Panel title="การเปลี่ยนสถานะล่าสุด" description="ประวัติจากระบบเปลี่ยนสถานะในทะเบียน">
                {d.recent_changes.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <RefreshCw className="h-4 w-4" />
                        ยังไม่มีประวัติการเปลี่ยนสถานะ
                    </div>
                ) : (
                    <div className="space-y-2">
                        {d.recent_changes.map((item) => (
                            <div
                                key={item.id}
                                className={cn(
                                    'flex flex-wrap items-start justify-between gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2.5',
                                )}
                            >
                                <div>
                                    <div className="font-medium text-slate-900">{item.asset_name || '-'}</div>
                                    <div className="mt-0.5 text-xs text-slate-500">
                                        {[item.line, item.stock_number ? `สป. ${item.stock_number}` : null]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </div>
                                    {item.note && <div className="mt-1 text-xs text-slate-500">{item.note}</div>}
                                </div>
                                <div className="text-right text-xs">
                                    <div className="text-slate-500">{item.event_date || '-'}</div>
                                    <div className="mt-1 font-medium text-slate-800">
                                        {item.from || '-'} → {item.to || '-'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Panel>
        </QualityPage>
    );
}
