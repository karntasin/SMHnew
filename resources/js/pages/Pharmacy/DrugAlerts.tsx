import React, { useEffect, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import PharmacySubNav, { pharmacyBreadcrumbs } from '@/pages/Pharmacy/PharmacySubNav';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ThaiDatePicker } from '@/components/ui/thai-date-picker';
import { cn } from '@/lib/utils';
import {
    AlertTriangle,
    Filter,
    Info,
    Loader2,
    Pill,
    ShieldAlert,
    Users,
    Activity,
} from 'lucide-react';

type AlertRow = {
    hn: string;
    vn: string;
    patient_name: string;
    vstdate: string;
    icode: string;
    drug_name: string;
    drug_group: string;
    strength: string | null;
    strength_mg: number | null;
    qty: number | null;
    usage_text: string;
    usage_code: string | null;
    tablets_per_dose: number | null;
    times_per_day: number | null;
    daily_tablets: number | null;
    daily_mg: number | null;
    dose_calc: string | null;
    dose_exceeded: boolean;
    egfr: number | null;
    egfr_date: string | null;
    severity: string;
    severity_label: string;
    note: string;
    max_dose_mg: number | null;
};

type Result = {
    connected: boolean;
    connection: { message?: string; checked_at?: string | null };
    filters: { start_date: string; end_date: string; severity: string | null; limit: number };
    summary: {
        prescriptions: number;
        alerts: number;
        contraindicated: number;
        alert: number;
        dose_exceeded: number;
        missing_egfr: number;
        patients: number;
    };
    alerts: AlertRow[];
    catalog_count: number;
    catalog_groups: string[];
};

type CatalogItem = {
    icode: string;
    name: string;
    group: string;
    strength_mg: number | null;
};

const severityStyle: Record<string, string> = {
    contraindicated: 'bg-rose-100 text-rose-800 border-rose-200',
    alert: 'bg-amber-100 text-amber-900 border-amber-200',
    dose_exceeded: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200',
    missing_egfr: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function DrugAlerts({
    result,
    catalog = [],
    severityOptions = [],
}: {
    result: Result;
    catalog: CatalogItem[];
    severityOptions: { value: string; label: string }[];
}) {
    const { url } = usePage();
    const [startDate, setStartDate] = useState(result.filters.start_date);
    const [endDate, setEndDate] = useState(result.filters.end_date);
    const [severity, setSeverity] = useState(result.filters.severity || 'all');
    const [showCatalog, setShowCatalog] = useState(false);
    const [applying, setApplying] = useState(false);

    useEffect(() => {
        setStartDate(result.filters.start_date);
        setEndDate(result.filters.end_date);
        setSeverity(result.filters.severity || 'all');
    }, [result.filters.start_date, result.filters.end_date, result.filters.severity]);

    const apply = (next?: { start_date?: string; end_date?: string; severity?: string }) => {
        const nextStart = next?.start_date ?? startDate;
        const nextEnd = next?.end_date ?? endDate;
        const nextSeverity = next?.severity ?? severity;

        if (next?.start_date !== undefined) setStartDate(next.start_date);
        if (next?.end_date !== undefined) setEndDate(next.end_date);
        if (next?.severity !== undefined) setSeverity(next.severity);

        setApplying(true);
        router.get(
            route('pharmacy.drug-alerts'),
            {
                start_date: nextStart || undefined,
                end_date: nextEnd || undefined,
                severity: nextSeverity && nextSeverity !== 'all' ? nextSeverity : 'all',
            },
            {
                preserveScroll: true,
                replace: true,
                onFinish: () => setApplying(false),
            },
        );
    };

    const s = result.summary;
    const activeSeverity = severity || 'all';

    return (
        <AppLayout
            breadcrumbs={pharmacyBreadcrumbs([{ title: 'แจ้งเตือนการใช้ยา', href: route('pharmacy.drug-alerts') }])}
        >
            <Head title="แจ้งเตือนการใช้ยา" />

            <div className="relative min-h-screen overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(244,63,94,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(13,148,136,0.1),_transparent_45%)]" />

                <div className="relative container mx-auto space-y-6 px-4 py-6">
                    <PharmacySubNav active="pharmacy.drug-alerts" />

                    <section className="overflow-hidden rounded-[2rem] border border-rose-100 bg-gradient-to-br from-slate-900 via-rose-950 to-orange-950 p-6 text-white shadow-2xl shadow-rose-900/20 md:p-8">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                            <div className="max-w-2xl space-y-3">
                                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-rose-100 backdrop-blur">
                                    <ShieldAlert className="h-3.5 w-3.5" />
                                    แจ้งเตือนการใช้ยา · ตามค่า eGFR ล่าสุด
                                </div>
                                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">ตรวจขนาดยาตามช่วง eGFR</h1>
                                <p className="text-sm text-rose-100/80 md:text-base">
                                    หาช่วง eGFR ของผู้ป่วย → ได้ Max mg/วัน แล้วเทียบกับขนาดที่สั่ง
                                    (ความแรง × จำนวนต่อครั้ง × ครั้งต่อวัน) ว่าเกินเพดานหรือไม่
                                    ({result.catalog_count} รายการยาในแคตตาล็อก)
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {[
                                { label: 'รายการแจ้งเตือน', value: s.alerts, icon: AlertTriangle },
                                { label: 'ห้ามใช้', value: s.contraindicated, icon: ShieldAlert },
                                { label: 'ผู้ป่วยเกี่ยวข้อง', value: s.patients, icon: Users },
                                { label: 'ใบสั่งที่สแกน', value: s.prescriptions, icon: Activity },
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                                        <div className="flex items-center gap-2 text-xs text-rose-100/70">
                                            <Icon className="h-3.5 w-3.5" />
                                            {item.label}
                                        </div>
                                        <div className="mt-1 text-2xl font-bold tabular-nums">{item.value.toLocaleString('th-TH')}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {!result.connected && (
                        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                                <div className="font-semibold">เชื่อมต่อ HOSxP ไม่ได้</div>
                                <div className="text-amber-800/80">{result.connection?.message || 'กรุณาตรวจสอบการตั้งค่าฐานข้อมูล'}</div>
                            </div>
                        </div>
                    )}

                    <section className="relative z-20 rounded-[2rem] border border-slate-200/80 bg-white/95 p-5 shadow-xl shadow-slate-900/5 md:p-6">
                        <div className="flex flex-col gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">ตัวกรอง</h2>
                                <p className="text-sm text-slate-500">
                                    ช่วงวันที่สั่งยา และระดับความรุนแรงของการแจ้งเตือน
                                    {url.includes('start_date') || url.includes('severity') ? (
                                        <span className="ml-1 text-rose-600">· กำลังแสดงผลตามตัวกรอง</span>
                                    ) : null}
                                </p>
                            </div>

                            <form
                                className="flex w-full flex-col gap-3 rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-50/70 via-white to-orange-50/50 p-4 sm:flex-row sm:flex-wrap sm:items-end"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    apply();
                                }}
                            >
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
                                <div className="min-w-[160px] space-y-1">
                                    <Label className="text-xs text-slate-500">ระดับ</Label>
                                    <select
                                        className="flex h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm shadow-sm"
                                        value={activeSeverity}
                                        onChange={(e) => setSeverity(e.target.value)}
                                    >
                                        {severityOptions.map((o) => (
                                            <option key={o.value} value={o.value}>
                                                {o.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <Button
                                    type="submit"
                                    disabled={applying}
                                    className="h-11 rounded-xl bg-rose-600 hover:bg-rose-700"
                                >
                                    {applying ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Filter className="mr-2 h-4 w-4" />
                                    )}
                                    กรองข้อมูล
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-11 rounded-xl"
                                    onClick={() => setShowCatalog((v) => !v)}
                                >
                                    <Pill className="mr-2 h-4 w-4" />
                                    {showCatalog ? 'ซ่อนแคตตาล็อก' : 'ดูแคตตาล็อกยา'}
                                </Button>
                            </form>

                            <div className="flex flex-wrap gap-2">
                                {(
                                    [
                                        { key: 'all', label: `ทั้งหมด ${s.alerts}`, className: 'bg-slate-100 text-slate-700 border-slate-200' },
                                        { key: 'contraindicated', label: `ห้ามใช้ ${s.contraindicated ?? 0}`, className: severityStyle.contraindicated },
                                        { key: 'alert', label: `ALERT ${s.alert ?? 0}`, className: severityStyle.alert },
                                        { key: 'dose_exceeded', label: `เกิน Max ${s.dose_exceeded ?? 0}`, className: severityStyle.dose_exceeded },
                                        { key: 'missing_egfr', label: `ไม่มี eGFR ${s.missing_egfr ?? 0}`, className: severityStyle.missing_egfr },
                                    ] as const
                                ).map((chip) => (
                                    <button
                                        key={chip.key}
                                        type="button"
                                        disabled={applying}
                                        onClick={() => apply({ severity: chip.key })}
                                        className={cn(
                                            'rounded-full border px-3 py-1 text-xs font-semibold transition hover:scale-[1.02] disabled:opacity-60',
                                            chip.className,
                                            activeSeverity === chip.key && 'ring-2 ring-rose-400 ring-offset-1',
                                        )}
                                    >
                                        {chip.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>

                    {showCatalog && (
                        <section className="rounded-[2rem] border border-slate-200 bg-white/95 p-5 shadow-lg">
                            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                                <Info className="h-4 w-4 text-teal-600" />
                                รายการยาใน guideline ({catalog.length})
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-left text-sm">
                                    <thead className="border-b text-xs uppercase tracking-wide text-slate-500">
                                        <tr>
                                            <th className="px-3 py-2">icode</th>
                                            <th className="px-3 py-2">ยา</th>
                                            <th className="px-3 py-2">กลุ่ม</th>
                                            <th className="px-3 py-2">ความแรง</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {catalog.map((d) => (
                                            <tr key={d.icode} className="border-b border-slate-100">
                                                <td className="px-3 py-2 font-mono text-xs">{d.icode}</td>
                                                <td className="px-3 py-2">{d.name}</td>
                                                <td className="px-3 py-2 text-slate-500">{d.group}</td>
                                                <td className="px-3 py-2">{d.strength_mg ? `${d.strength_mg} mg` : '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/95 shadow-xl shadow-slate-900/5">
                        <div className="border-b border-slate-100 px-5 py-4">
                            <h2 className="text-lg font-bold text-slate-800">รายการแจ้งเตือน</h2>
                            <p className="text-sm text-slate-500">
                                แจ้งเฉพาะกรณีห้ามใช้ / ALERT เมื่อขนาดเกิน Max ตามช่วง eGFR / ไม่มีค่า eGFR
                            </p>
                        </div>

                        {result.alerts.length === 0 ? (
                            <div className="px-5 py-12 text-center text-sm text-slate-500">
                                <div className="font-medium text-slate-700">ไม่พบการแจ้งเตือนในช่วงที่เลือก</div>
                                <div className="mt-1">
                                    สแกนแล้ว {s.prescriptions.toLocaleString('th-TH')} ใบสั่ง — ลองขยายช่วงวันที่
                                    หรือเลือกตัวกรอง “ทั้งหมด”
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                        <tr>
                                            <th className="px-4 py-3">ระดับ</th>
                                            <th className="px-4 py-3">ผู้ป่วย</th>
                                            <th className="px-4 py-3">ยา / ขนาด</th>
                                            <th className="px-4 py-3">วิธีทานที่สั่ง</th>
                                            <th className="px-4 py-3">ขนาด/วัน</th>
                                            <th className="px-4 py-3">eGFR</th>
                                            <th className="px-4 py-3">วันที่สั่ง</th>
                                            <th className="px-4 py-3">คำแนะนำ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.alerts.map((row, idx) => (
                                            <tr key={`${row.vn}-${row.icode}-${idx}`} className="border-t border-slate-100 hover:bg-rose-50/30">
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={cn(
                                                            'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                                                            severityStyle[row.severity] || severityStyle.missing_egfr,
                                                        )}
                                                    >
                                                        {row.severity_label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-slate-900">{row.patient_name}</div>
                                                    <div className="font-mono text-xs text-slate-500">HN {row.hn}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-slate-800">{row.drug_name}</div>
                                                    <div className="text-xs text-slate-500">
                                                        {row.strength || (row.strength_mg != null ? `${row.strength_mg} mg` : '—')}
                                                        {' · '}
                                                        {row.drug_group}
                                                        {row.qty != null ? ` · จ่าย ${row.qty}` : ''}
                                                    </div>
                                                </td>
                                                <td className="max-w-[220px] px-4 py-3 text-slate-700">
                                                    <div className="text-sm leading-snug">{row.usage_text || '—'}</div>
                                                    {(row.tablets_per_dose != null || row.times_per_day != null) && (
                                                        <div className="mt-1 text-xs text-slate-500">
                                                            {row.tablets_per_dose != null ? `${row.tablets_per_dose} เม็ด/ครั้ง` : '—'}
                                                            {' · '}
                                                            {row.times_per_day != null ? `${row.times_per_day} ครั้ง/วัน` : '—'}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 tabular-nums">
                                                    {row.daily_mg != null ? (
                                                        <>
                                                            <div className={cn('font-semibold', row.dose_exceeded ? 'text-fuchsia-700' : 'text-slate-900')}>
                                                                {row.daily_mg.toLocaleString('th-TH')} mg/วัน
                                                            </div>
                                                            {row.dose_calc && (
                                                                <div className="text-[11px] text-slate-500">{row.dose_calc}</div>
                                                            )}
                                                            <div className="text-xs text-slate-500">
                                                                Max {row.max_dose_mg != null ? `${row.max_dose_mg} mg/วัน` : '—'}
                                                            </div>
                                                            {row.dose_exceeded && (
                                                                <div className="mt-0.5 text-[11px] font-semibold text-fuchsia-700">เกินเพดาน</div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-slate-400">คำนวณไม่ได้</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 tabular-nums">
                                                    {row.egfr != null ? (
                                                        <>
                                                            <div className="font-semibold text-slate-900">{row.egfr}</div>
                                                            <div className="text-xs text-slate-500">{row.egfr_date || '—'}</div>
                                                        </>
                                                    ) : (
                                                        <span className="text-slate-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-slate-600">{row.vstdate}</td>
                                                <td className="max-w-xs px-4 py-3 text-slate-600">
                                                    {row.note}
                                                    {row.max_dose_mg != null && (
                                                        <div className="mt-1 text-xs font-medium text-orange-700">
                                                            สูงสุดแนะนำ {row.max_dose_mg} mg/วัน
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </AppLayout>
    );
}
