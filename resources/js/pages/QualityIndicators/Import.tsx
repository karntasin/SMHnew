import React, { useEffect, useMemo, useState } from 'react';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import {
    BarChart2,
    CheckCircle2,
    FileDown,
    FileSpreadsheet,
    History,
    Upload,
    XCircle,
    AlertTriangle,
} from 'lucide-react';
import { QualityPage, Panel, StatCard, StatusPill, EmptyState, qualityInput } from '@/components/quality/quality-ui';
import IndicatorsSubNav from '@/pages/QualityIndicators/IndicatorsSubNav';
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface Department {
    id: number;
    name: string;
}

interface Team {
    id: number;
    abbreviation: string;
    name_th: string;
}

interface ImportLogRow {
    id: number;
    type: string;
    status: string;
    original_filename: string;
    owner_label: string;
    indicators_create: number;
    indicators_update: number;
    entries_create: number;
    entries_update: number;
    row_errors: number;
    user?: { id: number; name: string } | null;
    created_at?: string;
    confirmed_at?: string | null;
    error_message?: string | null;
}

interface PreviewRow {
    row: number;
    action: string;
    messages?: string[];
    data: Record<string, unknown>;
}

interface PreviewPayload {
    log: ImportLogRow & { payload?: unknown };
    preview: {
        can_confirm: boolean;
        counts: {
            indicators_create: number;
            indicators_update: number;
            entries_create: number;
            entries_update: number;
            errors: number;
        };
        indicators: PreviewRow[];
        entries: PreviewRow[];
        errors: { sheet: string; row: number; messages: string[] }[];
        owner_label: string;
    };
}

const statusLabel: Record<string, string> = {
    pending: 'รอยืนยัน',
    completed: 'สำเร็จ',
    failed: 'ล้มเหลว',
    cancelled: 'ยกเลิก',
};

const actionLabel: Record<string, string> = {
    create: 'สร้างใหม่',
    update: 'อัปเดต',
    error: 'ผิดพลาด',
};

export default function ImportPage({
    departments,
    teams,
    logs,
    defaults,
    pendingPreview,
}: {
    departments: Department[];
    teams: Team[];
    logs: ImportLogRow[];
    defaults?: { type?: string; department_id?: string | number | null; team_id?: string | number | null };
    pendingPreview?: PreviewPayload | null;
}) {
    const { flash, errors } = usePage().props as {
        flash?: { success?: string; error?: string };
        errors?: Record<string, string>;
    };

    const [preview, setPreview] = useState<PreviewPayload | null>(pendingPreview ?? null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmText, setConfirmText] = useState('');

    useEffect(() => {
        if (pendingPreview) {
            setPreview(pendingPreview);
        }
    }, [pendingPreview]);

    const { data, setData, post, processing, reset } = useForm({
        type: (defaults?.type as string) || 'department',
        department_id: defaults?.department_id ? String(defaults.department_id) : '',
        team_id: defaults?.team_id ? String(defaults.team_id) : '',
        file: null as File | null,
    });

    const ownerHint = useMemo(() => {
        if (data.type === 'organization') return 'นำเข้าเป็นตัวชี้วัดระดับองค์กร';
        if (data.type === 'department') {
            const dept = departments.find((d) => String(d.id) === data.department_id);
            return dept ? `นำเข้าเข้าแผนก: ${dept.name}` : 'กรุณาเลือกแผนก/หน่วยงาน';
        }
        const team = teams.find((t) => String(t.id) === data.team_id);
        return team ? `นำเข้าเข้าทีม: ${team.abbreviation} - ${team.name_th}` : 'กรุณาเลือกทีม HA';
    }, [data.type, data.department_id, data.team_id, departments, teams]);

    const handlePreview = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('quality-indicators.import.preview'), {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    const handleConfirm = () => {
        if (!preview?.log?.id) return;
        router.post(
            route('quality-indicators.import.confirm', preview.log.id),
            { confirm_text: confirmText },
            {
                onSuccess: () => {
                    setConfirmOpen(false);
                    setConfirmText('');
                    setPreview(null);
                    reset('file');
                },
            },
        );
    };

    const handleCancelPreview = () => {
        if (!preview?.log?.id) {
            setPreview(null);
            return;
        }
        router.post(route('quality-indicators.import.cancel', preview.log.id), {}, {
            preserveScroll: true,
            onSuccess: () => setPreview(null),
        });
    };

    const breadcrumbs = [
        { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
        { title: 'ตัวชี้วัดคุณภาพ', href: route('quality-indicators.index') },
        { title: 'นำเข้า Excel', href: route('quality-indicators.import.index') },
    ];

    return (
        <QualityPage
            tone="emerald"
            icon={FileSpreadsheet}
            badge="ศูนย์พัฒนาคุณภาพ · ตัวชี้วัด"
            title="นำเข้าตัวชี้วัดจาก Excel"
            subtitle="ดาวน์โหลดเทมเพลต → เลือกองค์กร/แผนก/ทีม → ตรวจสอบตัวอย่าง → ยืนยันนำเข้า (มี log)"
            breadcrumbs={breadcrumbs}
            headTitle="นำเข้าตัวชี้วัด"
            actions={
                <a href={route('quality-indicators.import.template')}>
                    <Button type="button" variant="outline" className="rounded-xl border-emerald-200 text-emerald-800 hover:bg-emerald-50">
                        <FileDown className="mr-2 h-4 w-4" />
                        ดาวน์โหลดเทมเพลต
                    </Button>
                </a>
            }
            subNav={<IndicatorsSubNav active="quality-indicators.import.index" />}
        >
            {flash?.success && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {flash.success}
                </div>
            )}
            {(flash?.error || errors?.import || errors?.file) && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {flash?.error || errors?.import || errors?.file}
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
                <StatCard label="ขั้นตอนที่ 1" value="เทมเพลต" sub="ดาวน์โหลดโครงสร้างไฟล์" icon={FileDown} tone="cyan" />
                <StatCard label="ขั้นตอนที่ 2" value="ตรวจสอบ" sub="ดูตัวอย่างก่อนนำเข้า" icon={AlertTriangle} tone="amber" />
                <StatCard label="ขั้นตอนที่ 3" value="ยืนยัน + Log" sub="พิมพ์คำว่า ยืนยัน" icon={History} tone="emerald" />
            </div>

            <Panel title="เลือกปลายทางและอัปโหลดไฟล์" description={ownerHint}>
                <form onSubmit={handlePreview} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-1.5">
                            <Label>ระดับ</Label>
                            <Select
                                value={data.type}
                                onValueChange={(v) => {
                                    setData('type', v);
                                    setData('department_id', '');
                                    setData('team_id', '');
                                }}
                            >
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="organization">ระดับองค์กร</SelectItem>
                                    <SelectItem value="department">ระดับแผนก/ฝ่าย</SelectItem>
                                    <SelectItem value="ha_team">ระดับทีม HA</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors?.type && <p className="text-xs text-rose-600">{errors.type}</p>}
                        </div>

                        {data.type === 'department' && (
                            <div className="space-y-1.5 md:col-span-2">
                                <Label>แผนก/หน่วยงาน</Label>
                                <Select value={data.department_id || undefined} onValueChange={(v) => setData('department_id', v)}>
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue placeholder="เลือกแผนก" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map((d) => (
                                            <SelectItem key={d.id} value={String(d.id)}>
                                                {d.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors?.department_id && <p className="text-xs text-rose-600">{errors.department_id}</p>}
                            </div>
                        )}

                        {data.type === 'ha_team' && (
                            <div className="space-y-1.5 md:col-span-2">
                                <Label>ทีม HA</Label>
                                <Select value={data.team_id || undefined} onValueChange={(v) => setData('team_id', v)}>
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue placeholder="เลือกทีม" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teams.map((t) => (
                                            <SelectItem key={t.id} value={String(t.id)}>
                                                {t.abbreviation} - {t.name_th}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors?.team_id && <p className="text-xs text-rose-600">{errors.team_id}</p>}
                            </div>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="file">ไฟล์ Excel (.xlsx)</Label>
                        <Input
                            id="file"
                            type="file"
                            accept=".xlsx,.xls"
                            className={cn(qualityInput, 'cursor-pointer')}
                            onChange={(e) => setData('file', e.target.files?.[0] ?? null)}
                        />
                        <p className="text-xs text-slate-500">
                            ชีต <strong>indicators</strong> / <strong>entries</strong>: แถว 1 = หัวตาราง, แถว 2 = คำอธิบาย
                            (ระบบข้าม), แถว 3 ขึ้นไป = ข้อมูล · ช่องที่ขึ้นต้นด้วย [ไม่บังคับ] เว้นว่างได้
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button type="submit" disabled={processing} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
                            <Upload className="mr-2 h-4 w-4" />
                            {processing ? 'กำลังตรวจสอบ...' : 'อัปโหลดและตรวจสอบ'}
                        </Button>
                        <a href={route('quality-indicators.import.template')}>
                            <Button type="button" variant="outline" className="rounded-xl">
                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                                เทมเพลตว่าง
                            </Button>
                        </a>
                    </div>
                </form>
            </Panel>

            {preview && (
                <Panel
                    title="ยืนยันก่อนนำเข้า"
                    description={`ปลายทาง: ${preview.preview.owner_label} · ไฟล์: ${preview.log.original_filename}`}
                    action={
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" className="rounded-xl" onClick={handleCancelPreview}>
                                ยกเลิก
                            </Button>
                            <Button
                                type="button"
                                className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                                disabled={!preview.preview.can_confirm}
                                onClick={() => setConfirmOpen(true)}
                            >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                ยืนยันนำเข้า
                            </Button>
                        </div>
                    }
                >
                    <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
                        <MiniStat label="ตัวชี้วัดใหม่" value={preview.preview.counts.indicators_create} tone="emerald" />
                        <MiniStat label="อัปเดตตัวชี้วัด" value={preview.preview.counts.indicators_update} tone="cyan" />
                        <MiniStat label="ผลวัดใหม่" value={preview.preview.counts.entries_create} tone="teal" />
                        <MiniStat label="อัปเดตผลวัด" value={preview.preview.counts.entries_update} tone="amber" />
                        <MiniStat label="แถวผิดพลาด" value={preview.preview.counts.errors} tone="rose" />
                    </div>

                    {!preview.preview.can_confirm && (
                        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            ยังยืนยันไม่ได้ — มีแถวผิดพลาดหรือไม่มีข้อมูลที่นำเข้าได้ กรุณาแก้ไฟล์แล้วอัปโหลดใหม่
                        </div>
                    )}

                    {preview.preview.errors.length > 0 && (
                        <div className="mb-4 overflow-hidden rounded-xl border border-rose-200">
                            <div className="bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">รายการผิดพลาด</div>
                            <ul className="max-h-48 divide-y divide-rose-100 overflow-auto bg-white text-sm">
                                {preview.preview.errors.map((err, idx) => (
                                    <li key={`${err.sheet}-${err.row}-${idx}`} className="px-3 py-2 text-rose-700">
                                        ชีต {err.sheet} แถว {err.row}: {err.messages.join(', ')}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <PreviewTable title="ชีต indicators" rows={preview.preview.indicators} cols={['code', 'name', 'unit', 'target_value', 'link_code']} />
                    <div className="mt-4">
                        <PreviewTable
                            title="ชีต entries"
                            rows={preview.preview.entries}
                            cols={['code', 'period_date', 'numerator', 'denominator', 'result_value']}
                        />
                    </div>
                </Panel>
            )}

            <Panel title="ประวัติการนำเข้า (Log)" description="เก็บรายการอัปโหลด/ยืนยันล่าสุด 30 รายการ">
                {logs.length === 0 ? (
                    <EmptyState text="ยังไม่มีประวัติการนำเข้า" />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 text-slate-500">
                                    <th className="py-2 pr-3 font-medium">เวลา</th>
                                    <th className="py-2 pr-3 font-medium">ไฟล์</th>
                                    <th className="py-2 pr-3 font-medium">ปลายทาง</th>
                                    <th className="py-2 pr-3 font-medium">สถานะ</th>
                                    <th className="py-2 pr-3 font-medium">สรุป</th>
                                    <th className="py-2 font-medium">โดย</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log.id} className="border-b border-slate-100">
                                        <td className="py-2.5 pr-3 text-slate-600">{log.created_at}</td>
                                        <td className="py-2.5 pr-3">
                                            <Link
                                                href={route('quality-indicators.import.show', log.id)}
                                                className="font-medium text-emerald-700 hover:underline"
                                            >
                                                {log.original_filename}
                                            </Link>
                                        </td>
                                        <td className="py-2.5 pr-3 text-slate-700">{log.owner_label}</td>
                                        <td className="py-2.5 pr-3">
                                            <StatusPill
                                                label={statusLabel[log.status] || log.status}
                                                className={cn(
                                                    log.status === 'completed' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                                                    log.status === 'pending' && 'border-amber-200 bg-amber-50 text-amber-700',
                                                    log.status === 'failed' && 'border-rose-200 bg-rose-50 text-rose-700',
                                                    log.status === 'cancelled' && 'border-slate-200 bg-slate-50 text-slate-600',
                                                )}
                                            />
                                        </td>
                                        <td className="py-2.5 pr-3 text-xs text-slate-500">
                                            QI +{log.indicators_create}/~{log.indicators_update} · Entry +{log.entries_create}/~
                                            {log.entries_update}
                                            {log.row_errors > 0 ? ` · err ${log.row_errors}` : ''}
                                        </td>
                                        <td className="py-2.5 text-slate-600">{log.user?.name || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ยืนยันการนำเข้าข้อมูล</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2 text-left">
                            <p>
                                ข้อมูลจะถูกนำเข้าสู่ <strong>{preview?.preview.owner_label}</strong> ตามไฟล์ที่ตรวจสอบแล้ว
                            </p>
                            <p>พิมพ์คำว่า <strong>ยืนยัน</strong> ในช่องด้านล่างเพื่อป้องกันการนำเข้าผิดพลาด</p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Input
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder='พิมพ์ "ยืนยัน"'
                        className="rounded-xl"
                    />
                    {errors?.confirm_text && <p className="text-xs text-rose-600">{errors.confirm_text}</p>}
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                            disabled={confirmText !== 'ยืนยัน'}
                            onClick={(e) => {
                                e.preventDefault();
                                handleConfirm();
                            }}
                        >
                            นำเข้าข้อมูล
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </QualityPage>
    );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: string }) {
    const tones: Record<string, string> = {
        emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        cyan: 'border-cyan-200 bg-cyan-50 text-cyan-800',
        teal: 'border-teal-200 bg-teal-50 text-teal-800',
        amber: 'border-amber-200 bg-amber-50 text-amber-800',
        rose: 'border-rose-200 bg-rose-50 text-rose-800',
    };
    return (
        <div className={cn('rounded-xl border px-3 py-2', tones[tone] || tones.emerald)}>
            <div className="text-[11px] opacity-80">{label}</div>
            <div className="text-xl font-bold">{value}</div>
        </div>
    );
}

function PreviewTable({ title, rows, cols }: { title: string; rows: PreviewRow[]; cols: string[] }) {
    if (rows.length === 0) {
        return (
            <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-700">{title}</h4>
                <EmptyState text="ไม่มีแถวในชีตนี้" />
            </div>
        );
    }

    return (
        <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-700">{title}</h4>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[640px] text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500">
                        <tr>
                            <th className="px-3 py-2 font-medium">แถว</th>
                            <th className="px-3 py-2 font-medium">การทำงาน</th>
                            {cols.map((c) => (
                                <th key={c} className="px-3 py-2 font-medium">
                                    {c}
                                </th>
                            ))}
                            <th className="px-3 py-2 font-medium">หมายเหตุ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.slice(0, 50).map((row) => (
                            <tr key={`${title}-${row.row}`} className="border-t border-slate-100">
                                <td className="px-3 py-2">{row.row}</td>
                                <td className="px-3 py-2">
                                    <span
                                        className={cn(
                                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium',
                                            row.action === 'create' && 'bg-emerald-50 text-emerald-700',
                                            row.action === 'update' && 'bg-sky-50 text-sky-700',
                                            row.action === 'error' && 'bg-rose-50 text-rose-700',
                                        )}
                                    >
                                        {row.action === 'error' ? <XCircle className="h-3 w-3" /> : <BarChart2 className="h-3 w-3" />}
                                        {actionLabel[row.action] || row.action}
                                    </span>
                                </td>
                                {cols.map((c) => (
                                    <td key={c} className="px-3 py-2 text-slate-700">
                                        {String(row.data?.[c] ?? '-')}
                                    </td>
                                ))}
                                <td className="px-3 py-2 text-rose-600">{row.messages?.join(', ') || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {rows.length > 50 && <p className="px-3 py-2 text-xs text-slate-500">แสดง 50 แถวแรกจากทั้งหมด {rows.length} แถว</p>}
            </div>
        </div>
    );
}
