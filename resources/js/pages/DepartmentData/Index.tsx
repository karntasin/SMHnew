import React, { useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThaiDatePicker, formatThaiDateFromIso } from '@/components/ui/thai-date-picker';
import {
    Activity,
    ArrowRight,
    Bed,
    Building2,
    ClipboardCheck,
    HeartPulse,
    LayoutDashboard,
    Leaf,
    Microscope,
    Scan,
    Search,
    Siren,
    Sparkles,
    Stethoscope,
    Users,
    AlertTriangle,
    Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface DepartmentCard {
    code: string;
    name: string;
    short: string;
    icon: string;
    color: string;
    accent: string;
    visits: number;
    patients: number;
    source?: 'ovst' | 'ipt' | 'lab' | 'xray' | 'checkup' | 'opd_screen';
    wait_mode?: 'opd' | 'er' | 'clinic';
    waiting_now?: number | null;
    waiting_over_60?: number | null;
    waiting_lab?: number | null;
    waiting_pharmacy?: number | null;
}

interface Props {
    departments: DepartmentCard[];
    totals: { visits: number; patients: number; departments: number };
    filters: { start_date: string; end_date: string };
    connection: { connected: boolean; message?: string };
    pharmacy_stock?: { low: number; empty: number; expiring_90d: number; href?: string };
}

const ICON_MAP: Record<string, LucideIcon> = {
    Stethoscope,
    Siren,
    Microscope,
    Scan,
    Bed,
    Activity,
    Building2,
    HeartPulse,
    Leaf,
    ClipboardCheck,
    Sparkles,
};

function formatNum(n: number): string {
    return n.toLocaleString('th-TH');
}

export default function DepartmentDataIndex({
    departments = [],
    totals,
    filters,
    connection,
    pharmacy_stock,
}: Props) {
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState(filters?.start_date || '');
    const [endDate, setEndDate] = useState(filters?.end_date || '');

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return departments;
        return departments.filter((d) =>
            [d.code, d.name, d.short].some((v) => String(v).toLowerCase().includes(q)),
        );
    }, [departments, search]);

    const applyDates = () => {
        router.get(
            route('department-data.index'),
            { start_date: startDate || undefined, end_date: endDate || undefined },
            { preserveState: true, replace: true },
        );
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Dashboard', href: '/dashboard' },
                { title: 'ข้อมูลรายแผนก', href: route('department-data.index') },
            ]}
        >
            <Head title="ข้อมูลรายแผนก" />

            <div className="relative min-h-screen overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(14,165,233,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(20,184,166,0.12),_transparent_45%)]" />
                <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl" />
                <div className="pointer-events-none absolute -right-16 top-80 h-80 w-80 rounded-full bg-teal-300/20 blur-3xl" />

                <div className="relative container mx-auto space-y-6 px-4 py-6">
                    <nav className="rounded-3xl border border-sky-100/80 bg-white/90 p-2 shadow-xl shadow-sky-900/5 backdrop-blur">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-2">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                                <Building2 className="h-3.5 w-3.5" />
                                Department Data Workspace
                            </div>
                            <div className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-medium text-sky-700">
                                Dashboard · แยกตาม main_dep
                            </div>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-1">
                            <div className="rounded-2xl border border-sky-400 bg-gradient-to-br from-sky-600 via-cyan-600 to-teal-600 px-3 py-3 text-white shadow-lg shadow-sky-900/20">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                                        <LayoutDashboard className="h-4 w-4" />
                                    </span>
                                    <span>
                                        <span className="block text-sm font-semibold">Dashboard รายแผนก</span>
                                        <span className="block text-[11px] text-sky-50">เลือกแผนกเพื่อดูภาพรวมและพิมพ์รายงาน</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </nav>

                    <section className="overflow-hidden rounded-[2rem] border border-sky-100 bg-gradient-to-br from-slate-900 via-sky-950 to-teal-900 p-6 text-white shadow-2xl shadow-sky-900/20 md:p-8">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                            <div className="max-w-2xl space-y-3">
                                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-sky-100 backdrop-blur">
                                    <Building2 className="h-3.5 w-3.5" />
                                    ข้อมูลรายแผนกจาก HOSxP
                                </div>
                                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">เลือกแผนก ดูแดชบอร์ด พิมพ์รายงานได้ทันที</h1>
                                <p className="text-sm text-sky-100/80 md:text-base">
                                    สรุปการรับบริการแยกตามรหัสแผนก (main_dep) ในตาราง ovst — ครบทั้งครั้งรับบริการ ผู้ป่วย มูลค่า และรายงาน PDF
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {[
                                { label: 'แผนกในระบบ', value: totals?.departments ?? 0 },
                                { label: 'ครั้งรับบริการ (ช่วงนี้)', value: formatNum(totals?.visits ?? 0) },
                                { label: 'ผู้ป่วย (HN)', value: formatNum(totals?.patients ?? 0) },
                            ].map((item) => (
                                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                                    <div className="text-2xl font-bold">{item.value}</div>
                                    <div className="text-xs text-sky-100/70">{item.label}</div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {!connection?.connected && (
                        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                                <div className="font-semibold">เชื่อมต่อ HOSxP ไม่ได้</div>
                                <div className="text-amber-800/80">{connection?.message || 'กรุณาตรวจสอบการตั้งค่าฐานข้อมูล'}</div>
                            </div>
                        </div>
                    )}

                    <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-xl shadow-slate-900/5 backdrop-blur md:p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">แผนกทั้งหมด</h2>
                                <p className="text-sm text-slate-500">
                                    กรองช่วงวันที่ (พ.ศ.) แล้วเลือกแผนกเพื่อเข้าแดชบอร์ด
                                    {startDate && endDate ? (
                                        <span className="mt-1 block text-sky-700">
                                            ช่วงที่เลือก: {formatThaiDateFromIso(startDate)} – {formatThaiDateFromIso(endDate)}
                                        </span>
                                    ) : null}
                                </p>
                            </div>
                            <div className="flex w-full flex-col gap-3 rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50/80 via-white to-teal-50/60 p-4 shadow-sm sm:flex-row sm:items-end lg:w-auto">
                                <div className="min-w-[200px] flex-1">
                                    <ThaiDatePicker
                                        value={startDate}
                                        onChange={setStartDate}
                                        label="วันเริ่มต้น"
                                        placeholder="เลือกวันเริ่ม"
                                        className="w-full max-w-none"
                                    />
                                </div>
                                <div className="min-w-[200px] flex-1">
                                    <ThaiDatePicker
                                        value={endDate}
                                        onChange={setEndDate}
                                        label="วันสิ้นสุด"
                                        placeholder="เลือกวันสิ้นสุด"
                                        className="w-full max-w-none"
                                    />
                                </div>
                                <Button onClick={applyDates} className="h-11 rounded-2xl bg-sky-600 hover:bg-sky-700">
                                    <Filter className="mr-2 h-4 w-4" />
                                    ใช้ช่วงวันที่
                                </Button>
                            </div>
                        </div>

                        <div className="relative mt-4 max-w-md">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="ค้นหารหัส / ชื่อแผนก..."
                                className="rounded-xl border-sky-100 bg-white pl-9 shadow-sm"
                            />
                        </div>
                    </section>

                    {pharmacy_stock && (pharmacy_stock.empty > 0 || pharmacy_stock.low > 0 || pharmacy_stock.expiring_90d > 0) && (
                        <Link
                            href={pharmacy_stock.href || '/pharmacy/inventory'}
                            className="block rounded-3xl border border-amber-200 bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 p-4 shadow-sm transition hover:border-amber-300 hover:shadow-md"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-start gap-3">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                                        <AlertTriangle className="h-5 w-5" />
                                    </span>
                                    <div>
                                        <div className="font-semibold text-amber-950">แจ้งเตือนสต็อกยา (คลัง / ห้องยา)</div>
                                        <div className="text-sm text-amber-800">
                                            หมด {formatNum(pharmacy_stock.empty)} · เหลือน้อย {formatNum(pharmacy_stock.low)} · ใกล้หมดอายุ {formatNum(pharmacy_stock.expiring_90d)}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-sm font-medium text-amber-800">เปิดคลังยา →</span>
                            </div>
                        </Link>
                    )}

                    <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {filtered.map((dept) => {
                            const Icon = ICON_MAP[dept.icon] || Building2;
                            return (
                                <Link
                                    key={dept.code}
                                    href={route('department-data.show', {
                                        code: dept.code,
                                        start_date: startDate || undefined,
                                        end_date: endDate || undefined,
                                    })}
                                    className="group"
                                >
                                    <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl hover:shadow-sky-900/10">
                                        <div className="relative p-3 pb-0">
                                            <div
                                                className="relative overflow-hidden rounded-2xl p-[3px]"
                                                style={{
                                                    background: `linear-gradient(135deg, ${dept.color} 0%, #67e8f9 55%, ${dept.color}88 100%)`,
                                                }}
                                            >
                                                <div className="relative flex aspect-[16/9] flex-col justify-between overflow-hidden rounded-[14px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 text-white">
                                                    <div className="flex items-start justify-between">
                                                        <Badge className="bg-white/90 text-slate-800 hover:bg-white">
                                                            {dept.code}
                                                        </Badge>
                                                        <span
                                                            className="flex h-10 w-10 items-center justify-center rounded-xl"
                                                            style={{ backgroundColor: `${dept.color}33`, color: dept.color }}
                                                        >
                                                            <Icon className="h-5 w-5" style={{ color: '#fff' }} />
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-bold leading-snug">{dept.short}</h3>
                                                        <p className="mt-1 line-clamp-2 text-xs text-white/70">{dept.name}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-1 flex-col space-y-3 p-4">
                                                    <div className="grid grid-cols-2 gap-2">
                                                <div className="rounded-2xl bg-sky-50 px-3 py-2">
                                                    <div className="text-lg font-bold text-sky-800">{formatNum(dept.visits)}</div>
                                                    <div className="text-[11px] text-sky-600">
                                                        {dept.source === 'ipt'
                                                            ? 'Admit (AN)'
                                                            : dept.source === 'lab'
                                                              ? 'ใบสั่งแล็บ'
                                                              : dept.source === 'xray'
                                                                ? 'รายการตรวจ'
                                                                : dept.source === 'checkup'
                                                                  ? 'ผู้รับบริการ'
                                                                  : dept.source === 'opd_screen'
                                                                    ? 'ครั้งคัดกรอง'
                                                                    : dept.wait_mode === 'er'
                                                                      ? 'ครั้งรับบริการ ER'
                                                                    : 'ครั้งรับบริการ'}
                                                    </div>
                                                </div>
                                                <div className="rounded-2xl bg-teal-50 px-3 py-2">
                                                    <div className="flex items-center gap-1 text-lg font-bold text-teal-800">
                                                        <Users className="h-3.5 w-3.5" />
                                                        {formatNum(dept.patients)}
                                                    </div>
                                                    <div className="text-[11px] text-teal-600">ผู้ป่วย (HN)</div>
                                                </div>
                                            </div>
                                            {dept.source === 'ipt' && (
                                                <div className="rounded-full bg-teal-50 px-2 py-1 text-center text-[11px] font-medium text-teal-700">
                                                    ข้อมูลจากตาราง ipt (ผู้ป่วยใน)
                                                </div>
                                            )}
                                            {dept.source === 'lab' && (
                                                <div className="rounded-full bg-violet-50 px-2 py-1 text-center text-[11px] font-medium text-violet-700">
                                                    ข้อมูลจากตาราง lab_head
                                                </div>
                                            )}
                                            {dept.source === 'xray' && (
                                                <div className="rounded-full bg-indigo-50 px-2 py-1 text-center text-[11px] font-medium text-indigo-700">
                                                    ข้อมูลจากตาราง xray_head / xray_report
                                                </div>
                                            )}
                                            {dept.source === 'checkup' && (
                                                <div className="rounded-full bg-blue-50 px-2 py-1 text-center text-[11px] font-medium text-blue-700">
                                                    ovst pttype=40 + patient_regiment / lab
                                                </div>
                                            )}
                                            {dept.source === 'opd_screen' && (
                                                <div className="rounded-full bg-sky-50 px-2 py-1 text-center text-[11px] font-medium text-sky-700">
                                                    ovst + opdscreen · ระยะเวลารอ service_time
                                                </div>
                                            )}
                                            {dept.source === 'ovst' && (
                                                <div className="rounded-full bg-slate-50 px-2 py-1 text-center text-[11px] font-medium text-slate-700">
                                                    ovst + service_time · โครงเดียวกับคัดกรอง OPD
                                                </div>
                                            )}
                                            {typeof dept.waiting_over_60 === 'number' && dept.waiting_over_60 > 0 && (
                                                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">
                                                    <div className="text-lg font-bold">{formatNum(dept.waiting_over_60)}</div>
                                                    <div className="text-[11px]">รอเกิน 60 นาทีวันนี้</div>
                                                </div>
                                            )}
                                            {typeof dept.waiting_lab === 'number' && dept.waiting_lab > 0 && (
                                                <div className="rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2 text-violet-800">
                                                    <div className="text-lg font-bold">{formatNum(dept.waiting_lab)}</div>
                                                    <div className="text-[11px]">รอ LAB วันนี้</div>
                                                </div>
                                            )}
                                            {typeof dept.waiting_pharmacy === 'number' && dept.waiting_pharmacy > 0 && (
                                                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                                                    <div className="text-lg font-bold">{formatNum(dept.waiting_pharmacy)}</div>
                                                    <div className="text-[11px]">รอจ่ายยาวันนี้</div>
                                                </div>
                                            )}
                                            {typeof dept.waiting_now === 'number' && dept.waiting_now > 0 && (dept.waiting_over_60 ?? 0) === 0 && (
                                                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                                                    <div className="text-lg font-bold">{formatNum(dept.waiting_now)}</div>
                                                    <div className="text-[11px]">กำลังรอขณะนี้</div>
                                                </div>
                                            )}
                                            <Button className={cn('mt-auto w-full rounded-xl bg-sky-600 hover:bg-sky-700')}>
                                                เปิดแดชบอร์ด
                                                <ArrowRight className="ml-2 h-4 w-4" />
                                            </Button>
                                        </div>
                                    </article>
                                </Link>
                            );
                        })}
                    </section>

                    {filtered.length === 0 && (
                        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 p-12 text-center text-slate-500">
                            ไม่พบแผนกที่ตรงกับการค้นหา
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
