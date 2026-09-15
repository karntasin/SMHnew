import React, { useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { ThaiDatePicker, formatThaiDateFromIso } from '@/components/ui/thai-date-picker';
import {
    Activity,
    AlertTriangle,
    ArrowLeft,
    Bed,
    Building2,
    CheckCircle2,
    ClipboardCheck,
    Clock3,
    FileDown,
    Filter,
    HeartPulse,
    Leaf,
    Microscope,
    Pill,
    Scan,
    Siren,
    Sparkles,
    Stethoscope,
    Target,
    Timer,
    Users,
    Wallet,
} from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { DepartmentWaitTimePanel, type WaitBand, type WaitQueueRow, type WaitStage } from '@/components/department-wait-time';

type Source = 'ovst' | 'ipt' | 'lab' | 'xray' | 'checkup' | 'opd_screen';

interface RankRow {
    code: string;
    name: string;
    total: number;
    revenue?: number;
    patients?: number;
    rate?: number;
}

interface LabMarkerRow {
    code: string;
    name: string;
    unit?: string;
    total: number;
    normal: number;
    abnormal: number;
    avg_value?: number;
}

interface Department {
    code: string;
    name: string;
    short: string;
    icon: string;
    color: string;
    source?: Source;
    resolved_wards?: { code: string; name: string }[];
}

interface Props {
    department: Department;
    connection: { connected: boolean; message?: string };
    filters: { start_date: string; end_date: string };
    source?: Source;
    summary: {
        visits: number;
        patients: number;
        revenue: number;
        avg_revenue: number;
        male: number;
        female: number;
        unknown_sex: number;
        admissions?: number;
        discharges?: number;
        active?: number;
        avg_los?: number;
        bed_days?: number;
        orders?: number;
        exams?: number;
        opd?: number;
        ipd?: number;
        confirmed?: number;
        pending?: number;
        outlab?: number;
        items?: number;
        abnormal?: number;
        critical?: number;
        read_film?: number;
        avg_tat_minutes?: number;
        with_lab?: number;
        without_lab?: number;
        lab_normal?: number;
        lab_abnormal?: number;
        lab_pending?: number;
        regiment_count?: number;
        screened?: number;
        screen_rate?: number;
        avg_los_minutes?: number;
        within_wait_target?: number;
        within_wait_rate?: number;
        wait_target_minutes?: number;
        waiting_now?: number;
        waiting_over_60?: number;
        waiting_lab?: number;
        waiting_lab_over_60?: number;
        waiting_pharmacy?: number;
        waiting_pharmacy_over_60?: number;
        wait_measured?: number;
        wait_over_target?: number;
        avg_in_hospital_minutes?: number;
        avg_lab_minutes?: number;
        avg_pharmacy_minutes?: number;
        high_bp?: number;
        high_bp_rate?: number;
        fever?: number;
        obese?: number;
        vitals_complete?: number;
        vitals_complete_rate?: number;
    };
    trend: { date: string; label: string; visits: number; patients: number }[];
    diagnoses?: { icd10: string; name: string; total: number }[];
    rights?: { code: string; name: string; visits: number; revenue: number }[];
    hourly: { hour: string; visits: number }[];
    wards?: { code: string; name: string; admissions: number; patients: number; active: number }[];
    forms?: RankRow[];
    items?: RankRow[];
    groups?: RankRow[];
    departments?: RankRow[];
    regiments?: RankRow[];
    personnel?: RankRow[];
    ages?: RankRow[];
    lab_status?: RankRow[];
    lab_markers?: LabMarkerRow[];
    wait_bands?: WaitBand[];
    wait_stages?: WaitStage[];
    wait_queue?: WaitQueueRow[];
    wait_lab_queue?: WaitQueueRow[];
    wait_pharmacy_queue?: WaitQueueRow[];
    wait_enabled?: boolean;
    wait_mode?: 'opd' | 'er' | 'clinic' | null;
    vitals?: RankRow[];
    specialties?: RankRow[];
    visit_status?: RankRow[];
    destinations?: RankRow[];
    complaints?: RankRow[];
    weekdays?: RankRow[];
    er_types?: RankRow[];
    er_pt_types?: RankRow[];
    zones?: { qi: string[]; ops: string[] };
    sections: Record<string, string>;
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

const PIE_COLORS = ['#0ea5e9', '#14b8a6', '#8b5cf6', '#f59e0b', '#f43f5e', '#6366f1', '#84cc16', '#06b6d4'];

const formatNum = (n: number, digits = 0) =>
    n.toLocaleString('th-TH', { minimumFractionDigits: digits, maximumFractionDigits: digits });

function formatTat(minutes?: number): string {
    const m = Number(minutes || 0);
    if (m <= 0) return '-';
    if (m < 60) return `${formatNum(m, 1)} นาที`;
    const h = Math.floor(m / 60);
    const rem = Math.round(m % 60);
    return `${h} ชม. ${rem} นาที`;
}

function SectionCard({
    id,
    title,
    description,
    pdfHref,
    children,
}: {
    id: string;
    title: string;
    description: string;
    pdfHref: string;
    children: React.ReactNode;
}) {
    return (
        <section id={id} className="scroll-mt-6 rounded-[2rem] border border-slate-200/80 bg-white/95 p-5 shadow-xl shadow-slate-900/5 backdrop-blur md:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">{title}</h2>
                    <p className="text-sm text-slate-500">{description}</p>
                </div>
                <a href={pdfHref} target="_blank" rel="noreferrer">
                    <Button type="button" variant="outline" className="rounded-xl border-sky-200 text-sky-800 hover:bg-sky-50">
                        <FileDown className="mr-2 h-4 w-4" />
                        PDF หัวข้อนี้
                    </Button>
                </a>
            </div>
            {children}
        </section>
    );
}

function ZoneBlock({
    id,
    tone,
    badge,
    title,
    subtitle,
    icon: ZoneIcon,
    children,
}: {
    id: string;
    tone: 'qi' | 'ops';
    badge: string;
    title: string;
    subtitle: string;
    icon: LucideIcon;
    children: React.ReactNode;
}) {
    const isQi = tone === 'qi';

    return (
        <div
            id={id}
            className={cn(
                'scroll-mt-6 space-y-4 rounded-[2rem] border p-4 md:p-5',
                isQi
                    ? 'border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white'
                    : 'border-slate-200/90 bg-gradient-to-br from-slate-50/90 via-sky-50/30 to-white',
            )}
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                    <div
                        className={cn(
                            'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
                            isQi ? 'bg-amber-100 text-amber-900' : 'bg-sky-100 text-sky-900',
                        )}
                    >
                        <ZoneIcon className="h-3.5 w-3.5" />
                        {badge}
                    </div>
                    <div>
                        <h2 className={cn('text-xl font-bold', isQi ? 'text-amber-950' : 'text-slate-800')}>{title}</h2>
                        <p className={cn('mt-1 max-w-3xl text-sm', isQi ? 'text-amber-900/75' : 'text-slate-500')}>{subtitle}</p>
                    </div>
                </div>
                {isQi ? (
                    <div className="rounded-2xl border border-amber-200 bg-white/80 px-3 py-2 text-xs text-amber-900/80">
                        รอยืนยันความถูกต้องก่อนเชื่อมโยงระบบตัวชี้วัดคุณภาพ
                    </div>
                ) : null}
            </div>
            <div className="space-y-4">{children}</div>
        </div>
    );
}

function RankTable({
    rows,
    valueLabel = 'จำนวน',
    showRevenue = false,
}: {
    rows: RankRow[];
    valueLabel?: string;
    showRevenue?: boolean;
}) {
    if (rows.length === 0) {
        return <p className="text-sm text-slate-500">ไม่มีข้อมูลในช่วงที่เลือก</p>;
    }

    const max = Math.max(...rows.map((r) => r.total), 1);

    return (
        <div className="space-y-3">
            {rows.map((row, idx) => (
                <div key={`${row.code}-${row.name}-${idx}`} className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                    <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-800">{row.name}</div>
                            {row.code && row.code !== row.name ? (
                                <div className="text-xs text-slate-500">รหัส {row.code}</div>
                            ) : null}
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-bold text-sky-800">{formatNum(row.total)}</div>
                            <div className="text-[11px] text-slate-500">{valueLabel}</div>
                        </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-sky-500" style={{ width: `${(row.total / max) * 100}%` }} />
                    </div>
                    {showRevenue && row.revenue != null ? (
                        <div className="mt-2 text-xs text-teal-700">มูลค่า {formatNum(row.revenue, 2)} บาท</div>
                    ) : null}
                </div>
            ))}
        </div>
    );
}

export default function DepartmentDataShow({
    department,
    connection,
    filters,
    source = 'ovst',
    summary,
    trend = [],
    diagnoses = [],
    rights = [],
    hourly = [],
    wards = [],
    forms = [],
    items = [],
    groups = [],
    departments = [],
    regiments = [],
    personnel = [],
    ages = [],
    lab_status = [],
    lab_markers = [],
    wait_bands = [],
    wait_stages = [],
    wait_queue = [],
    wait_lab_queue = [],
    wait_pharmacy_queue = [],
    wait_enabled = false,
    wait_mode = null,
    vitals = [],
    specialties = [],
    visit_status = [],
    destinations = [],
    complaints = [],
    weekdays = [],
    er_types = [],
    er_pt_types = [],
    zones = { qi: [], ops: [] },
    sections = {},
}: Props) {
    const [startDate, setStartDate] = useState(filters?.start_date || '');
    const [endDate, setEndDate] = useState(filters?.end_date || '');
    const Icon = ICON_MAP[department.icon] || Building2;
    const activeSource: Source = source || department.source || 'ovst';
    const isIpd = activeSource === 'ipt';
    const isLab = activeSource === 'lab';
    const isXray = activeSource === 'xray';
    const isCheckup = activeSource === 'checkup';
    const isOpdScreen = activeSource === 'opd_screen';
    const isEr = wait_mode === 'er';
    const isClinic = wait_mode === 'clinic';
    const isVisitLayout = isOpdScreen || isEr || isClinic;
    const isWaitEnabled = Boolean(wait_enabled || isVisitLayout);
    const activeWaitMode: 'opd' | 'er' | 'clinic' = wait_mode === 'er' ? 'er' : wait_mode === 'clinic' ? 'clinic' : 'opd';
    const waitTarget = summary.wait_target_minutes ?? 60;
    const qiSectionKeys = zones.qi?.length ? zones.qi : isOpdScreen ? ['wait_time', 'vitals'] : [];
    const opsSectionKeys = zones.ops?.length
        ? zones.ops
        : isOpdScreen
          ? ['summary', 'trend', 'ages', 'specialties', 'visit_status', 'destinations', 'complaints', 'diagnoses', 'rights', 'weekdays', 'hourly']
          : [];
    const hasZones = qiSectionKeys.length > 0 || opsSectionKeys.length > 0;
    const visitNoun = isOpdScreen ? 'คัดกรอง' : isEr ? 'ฉุกเฉิน' : department.short;

    const visitLabel = isIpd
        ? 'Admit (AN)'
        : isLab
          ? 'ใบสั่งแล็บ'
          : isXray
            ? 'รายการตรวจ'
            : isCheckup
              ? 'ผู้รับบริการ'
              : isOpdScreen
                ? 'ครั้งคัดกรอง'
                : isEr
                  ? 'ครั้งรับบริการ ER'
                  : 'ครั้งรับบริการ';
    const visitUnit = isIpd ? 'admit' : isLab ? 'order' : isXray ? 'exam' : isCheckup ? 'คน' : 'ครั้ง';

    const query = useMemo(
        () => ({
            start_date: startDate || undefined,
            end_date: endDate || undefined,
        }),
        [startDate, endDate],
    );

    const applyDates = () => {
        router.get(route('department-data.show', { code: department.code, ...query }), {}, { preserveState: true, replace: true });
    };

    const fullPdfHref = `${route('department-data.export-pdf', { code: department.code })}?${new URLSearchParams(
        Object.fromEntries(Object.entries(query).filter(([, v]) => v)) as Record<string, string>,
    ).toString()}`;

    const sectionPdf = (section: string) =>
        `${route('department-data.export-section-pdf', { code: department.code, section })}?${new URLSearchParams(
            Object.fromEntries(Object.entries(query).filter(([, v]) => v)) as Record<string, string>,
        ).toString()}`;

    const hourlyActive = hourly.filter((h) => h.visits > 0);
    const maxHour = Math.max(...hourly.map((h) => h.visits), 1);

    const visitHeroKpis = [
        { label: isOpdScreen ? 'ครั้งคัดกรอง (VN)' : isEr ? 'ครั้งรับบริการ ER' : 'ครั้งรับบริการ (VN)', value: formatNum(summary.visits), icon: isEr ? Siren : Stethoscope },
        { label: 'ผู้ป่วย (HN)', value: formatNum(summary.patients), icon: Users },
        { label: 'กำลังรอขณะนี้', value: formatNum(summary.waiting_now ?? 0), icon: Timer },
        { label: 'รอ LAB', value: formatNum(summary.waiting_lab ?? 0), icon: Microscope },
        { label: 'รอจ่ายยา', value: formatNum(summary.waiting_pharmacy ?? 0), icon: Pill },
        { label: 'รอเกิน 60 นาที', value: formatNum(summary.waiting_over_60 ?? 0), icon: AlertTriangle },
    ];

    const heroKpis = isVisitLayout
        ? visitHeroKpis
        : isCheckup
        ? [
              { label: 'ผู้รับบริการ (VN)', value: formatNum(summary.visits), icon: ClipboardCheck },
              { label: 'ผู้ป่วย (HN)', value: formatNum(summary.patients), icon: Users },
              { label: 'มีผล Lab', value: formatNum(summary.with_lab ?? 0), icon: Microscope },
              { label: 'ผล Lab ปกติ', value: formatNum(summary.lab_normal ?? 0), icon: CheckCircle2 },
              { label: 'ผล Lab ผิดปกติ', value: formatNum(summary.lab_abnormal ?? 0), icon: AlertTriangle },
              { label: 'ยังไม่มีผล Lab', value: formatNum(summary.lab_pending ?? 0), icon: Timer },
              { label: 'หน่วยงาน/หน่วย', value: formatNum(summary.regiment_count ?? 0), icon: Building2 },
              { label: 'มูลค่ารวม (บาท)', value: formatNum(summary.revenue, 2), icon: Wallet },
          ]
        : isLab
          ? [
                { label: 'ใบสั่งแล็บ', value: formatNum(summary.orders ?? summary.visits), icon: Microscope },
                { label: 'ผู้ป่วย (HN)', value: formatNum(summary.patients), icon: Users },
                { label: 'รายงานแล้ว', value: formatNum(summary.confirmed ?? 0), icon: CheckCircle2 },
                { label: 'รอผล', value: formatNum(summary.pending ?? 0), icon: Timer },
                { label: 'OPD / IPD', value: `${formatNum(summary.opd ?? 0)} / ${formatNum(summary.ipd ?? 0)}`, icon: Building2 },
                { label: 'TAT เฉลี่ย', value: formatTat(summary.avg_tat_minutes), icon: Clock3 },
                { label: 'มูลค่ารวม (บาท)', value: formatNum(summary.revenue, 2), icon: Wallet },
                { label: 'รายการในผล', value: formatNum(summary.items ?? 0), icon: ClipboardCheck },
            ]
          : isXray
            ? [
                  { label: 'รายการตรวจ', value: formatNum(summary.exams ?? summary.visits), icon: Scan },
                  { label: 'ผู้ป่วย (HN)', value: formatNum(summary.patients), icon: Users },
                  { label: 'Visit (VN)', value: formatNum(summary.orders ?? 0), icon: Activity },
                  { label: 'ยืนยันผลแล้ว', value: formatNum(summary.confirmed ?? 0), icon: CheckCircle2 },
                  { label: 'OPD / IPD', value: `${formatNum(summary.opd ?? 0)} / ${formatNum(summary.ipd ?? 0)}`, icon: Building2 },
                  { label: 'TAT เฉลี่ย', value: formatTat(summary.avg_tat_minutes), icon: Clock3 },
                  { label: 'มูลค่ารวม (บาท)', value: formatNum(summary.revenue, 2), icon: Wallet },
                  { label: 'เฉลี่ยต่อ Visit', value: formatNum(summary.avg_revenue, 2), icon: Wallet },
              ]
            : isIpd
              ? [
                    { label: 'Admit (AN)', value: formatNum(summary.admissions ?? summary.visits), icon: Activity },
                    { label: 'ผู้ป่วย (HN)', value: formatNum(summary.patients), icon: Users },
                    { label: 'จำหน่ายแล้ว', value: formatNum(summary.discharges ?? 0), icon: ClipboardCheck },
                    { label: 'ยัง admit อยู่', value: formatNum(summary.active ?? 0), icon: Bed },
                    { label: 'วันนอนเฉลี่ย', value: formatNum(summary.avg_los ?? 0, 2), icon: Clock3 },
                    { label: 'Bed days', value: formatNum(summary.bed_days ?? 0), icon: Building2 },
                    { label: 'มูลค่ารวม (บาท)', value: formatNum(summary.revenue, 2), icon: Wallet },
                    { label: 'เฉลี่ยต่อ Admit', value: formatNum(summary.avg_revenue, 2), icon: Wallet },
                ]
              : [
                    { label: 'ครั้งรับบริการ', value: formatNum(summary.visits), icon: Activity },
                    { label: 'ผู้ป่วย (HN)', value: formatNum(summary.patients), icon: Users },
                    { label: 'มูลค่ารวม (บาท)', value: formatNum(summary.revenue, 2), icon: Wallet },
                    { label: 'เฉลี่ยต่อครั้ง', value: formatNum(summary.avg_revenue, 2), icon: Wallet },
                    ...(isWaitEnabled
                        ? [
                              { label: 'กำลังรอขณะนี้', value: formatNum(summary.waiting_now ?? 0), icon: Timer },
                              { label: 'รอเกิน 60 นาที', value: formatNum(summary.waiting_over_60 ?? 0), icon: AlertTriangle },
                          ]
                        : []),
                ];

    const waitHint =
        activeWaitMode === 'er'
            ? `QI · ลงทะเบียน → บันทึกบริการ ER (service20/3 → 12) เป้า ≤ ${waitTarget} นาที`
            : activeWaitMode === 'clinic'
              ? `ลงทะเบียน → ปิดบริการ (service20 → 12) เป้า ≤ ${waitTarget} นาที`
              : 'QI-OPD-001 · รอพบแพทย์ service4→5';

    const qiKpis = [
        ...(isOpdScreen
            ? [{ label: '% ได้รับการคัดกรอง', value: `${formatNum(summary.screen_rate ?? 0, 1)}%`, hint: 'QI-OPD-006', icon: CheckCircle2 }]
            : [
                  {
                      label: '% มีบันทึกคัดกรอง',
                      value: `${formatNum(summary.screen_rate ?? 0, 1)}%`,
                      hint: 'ovst + opdscreen',
                      icon: CheckCircle2,
                  },
              ]),
        {
            label: `ตามเป้า ≤${waitTarget} นาที`,
            value: `${formatNum(summary.within_wait_rate ?? 0, 1)}%`,
            hint: waitHint,
            icon: Timer,
        },
        {
            label: activeWaitMode === 'opd' ? 'รอพบแพทย์ เฉลี่ย' : 'เวลารอเฉลี่ย',
            value: formatNum(summary.avg_los_minutes ?? 0, 1),
            hint:
                activeWaitMode === 'er'
                    ? 'ลงทะเบียน → บันทึกบริการ ER (service20/3 → 12)'
                    : activeWaitMode === 'clinic'
                      ? 'ลงทะเบียน → ปิดบริการ (service20 → 12)'
                      : 'เริ่มคัดกรอง → แพทย์เริ่มตรวจ (service4 → 5)',
            icon: Clock3,
        },
        {
            label: 'กำลังรอเกิน 60 นาที',
            value: formatNum(summary.waiting_over_60 ?? 0),
            hint: `${formatNum(summary.waiting_now ?? 0)} รายกำลังรอวันนี้`,
            icon: AlertTriangle,
        },
        {
            label: 'รอจ่ายยาตอนนี้',
            value: formatNum(summary.waiting_pharmacy ?? 0),
            hint: 'เริ่ม Key ยา → ยังไม่จ่าย (service6 → 16)',
            icon: Pill,
        },
        {
            label: 'BP สูง',
            value: `${formatNum(summary.high_bp ?? 0)} (${formatNum(summary.high_bp_rate ?? 0, 1)}%)`,
            hint: 'opdscreen BPS/BPD',
            icon: HeartPulse,
        },
        {
            label: 'Vitals ครบ',
            value: `${formatNum(summary.vitals_complete_rate ?? 0, 1)}%`,
            hint: 'BP + น้ำหนัก + ส่วน + อุณหภูมิ',
            icon: ClipboardCheck,
        },
        { label: 'มีไข้', value: formatNum(summary.fever ?? 0), hint: 'อุณหภูมิ ≥ 37.5°C', icon: AlertTriangle },
    ];

    const sourceHint = isOpdScreen
        ? `ข้อมูลจาก ovst.main_dep = ${department.code} + opdscreen · รอพบแพทย์นับจาก service4 ถึง service5 (เป้า ≤ ${waitTarget} นาที) · ชั่วโมงอยู่ใน รพ. นับจาก service20`
        : isEr
          ? `ข้อมูลจาก ovst.main_dep = ${department.code} + er_regist / opdscreen · เวลารอรับบริการ ER นับจากลงทะเบียน (service20/3) ถึงบันทึกบริการ (service12) เป้า ≤ ${waitTarget} นาที`
          : isClinic
            ? `ข้อมูลจาก ovst.main_dep = ${department.code} + opdscreen · เวลารอรับบริการนับจากลงทะเบียน (service20) ถึงปิดบริการ (service12) เป้า ≤ ${waitTarget} นาที`
        : isWaitEnabled
          ? `แดชบอร์ดจาก ovst.main_dep = ${department.code} · ระยะเวลารอคอยจากตาราง service_time (เป้า ≤ ${waitTarget} นาที)`
          : isCheckup
        ? 'ข้อมูลจาก ovst (pttype = 40) + patient_regiment และเชื่อม lab_head / lab_order เพื่อสรุปผล Lab ปกติ/ผิดปกติ'
        : isLab
          ? 'ข้อมูลจากตาราง lab_head (+ lab_order_service / lab_items) — ปริมาณงาน ฟอร์ม กลุ่มตรวจ และหน่วยงานที่ส่ง'
          : isXray
            ? 'ข้อมูลจากตาราง xray_head / xray_report (+ xray_items) — ปริมาณงาน ชนิดตรวจ และหน่วยงานที่ส่ง'
            : isIpd
              ? `ข้อมูลผู้ป่วยในจากตาราง ipt · หอ ${(department.resolved_wards || []).map((w) => w.name).join(', ') || 'ตามที่ตั้งค่า'} — เลือกช่วงวันที่แบบ พ.ศ.`
              : `แดชบอร์ดสรุปจาก ovst.main_dep = ${department.code} — เลือกช่วงวันที่แบบ พ.ศ. แล้วพิมพ์รายงานได้ทั้งแบบรวมและแยกหัวข้อ`;

    const opdIpdPie = [
        { name: 'OPD', value: summary.opd ?? 0 },
        { name: 'IPD', value: summary.ipd ?? 0 },
    ].filter((x) => x.value > 0);

    const labStatusPie = lab_status
        .filter((x) => x.total > 0)
        .map((x) => ({
            name: x.name,
            value: x.total,
            color: x.code === 'normal' ? '#14b8a6' : x.code === 'abnormal' ? '#f43f5e' : '#94a3b8',
        }));

    const groupChart = groups.slice(0, 8).map((g) => ({ name: g.name, total: g.total }));
    const ageChart = ages.map((a) => ({ name: a.name, total: a.total }));
    const markerChart = lab_markers.map((m) => ({
        name: m.name,
        ปกติ: m.normal,
        ผิดปกติ: m.abnormal,
    }));
    const weekdayChart = weekdays.map((w) => ({ name: w.name, total: w.total }));
    const vitalAlertChart = vitals
        .filter((v) => ['high_bp', 'overweight', 'obese', 'fever'].includes(v.code))
        .map((v) => ({ name: v.name, total: v.total }));

    const waitPanel = isWaitEnabled ? (
        <DepartmentWaitTimePanel
            title={sections.wait_time || 'ระยะเวลารอคอย'}
            description={
                activeWaitMode === 'er'
                    ? `จากตาราง service_time — ลงทะเบียน (service20/3) ถึงบันทึกบริการ ER (service12) เป้า ≤ ${waitTarget} นาที · รอ LAB 13→14 · รอจ่ายยา 6/12→16`
                    : activeWaitMode === 'clinic'
                      ? `จากตาราง service_time — ลงทะเบียน (service20) ถึงปิดบริการ (service12) เป้า ≤ ${waitTarget} นาที · รอ LAB 13→14 · รอจ่ายยา 6/12→16`
                      : `จากตาราง service_time — รอพบแพทย์นับจากเริ่มคัดกรองถึงพบแพทย์ (service4 → 5) เป้า ≤ ${waitTarget} นาที · ชั่วโมงอยู่ใน รพ. นับจากลงทะเบียน (service20)`
            }
            pdfHref={sectionPdf('wait_time')}
            mode={activeWaitMode}
            targetMinutes={waitTarget}
            avgMinutes={summary.avg_los_minutes ?? 0}
            withinRate={summary.within_wait_rate ?? 0}
            withinCount={summary.within_wait_target ?? 0}
            measured={summary.wait_measured ?? 0}
            overTarget={summary.wait_over_target ?? 0}
            waitingNow={summary.waiting_now ?? 0}
            waitingOver60={summary.waiting_over_60 ?? 0}
            waitingLab={summary.waiting_lab ?? 0}
            waitingLabOver60={summary.waiting_lab_over_60 ?? 0}
            avgInHospitalMinutes={summary.avg_in_hospital_minutes ?? 0}
            avgLabMinutes={summary.avg_lab_minutes ?? 0}
            avgPharmacyMinutes={summary.avg_pharmacy_minutes ?? 0}
            waitingPharmacy={summary.waiting_pharmacy ?? 0}
            waitingPharmacyOver60={summary.waiting_pharmacy_over_60 ?? 0}
            stages={wait_stages}
            bands={wait_bands}
            queue={wait_queue}
            labQueue={wait_lab_queue}
            pharmacyQueue={wait_pharmacy_queue}
        />
    ) : null;

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Dashboard', href: '/dashboard' },
                { title: 'ข้อมูลรายแผนก', href: route('department-data.index') },
                { title: department.short, href: route('department-data.show', { code: department.code }) },
            ]}
        >
            <Head title={`แดชบอร์ด ${department.short}`} />

            <div className="relative min-h-screen overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(14,165,233,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(20,184,166,0.12),_transparent_45%)]" />
                <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl" />
                <div className="pointer-events-none absolute -right-16 top-80 h-80 w-80 rounded-full bg-teal-300/20 blur-3xl" />

                <div className="relative container mx-auto space-y-6 px-4 py-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link href={route('department-data.index', query)}>
                            <Button variant="outline" className="rounded-xl">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                กลับรายการแผนก
                            </Button>
                        </Link>
                        <a href={fullPdfHref} target="_blank" rel="noreferrer">
                            <Button className="rounded-xl bg-emerald-500 text-slate-900 hover:bg-emerald-400">
                                <FileDown className="mr-2 h-4 w-4" />
                                พิมพ์ PDF รวมทุกหัวข้อ
                            </Button>
                        </a>
                    </div>

                    <section
                        className="overflow-hidden rounded-[2rem] border border-sky-100 bg-gradient-to-br from-slate-900 via-sky-950 to-teal-900 p-6 text-white shadow-2xl shadow-sky-900/20 md:p-8"
                        style={{ boxShadow: `0 25px 50px -12px ${department.color}55` }}
                    >
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                            <div className="max-w-2xl space-y-3">
                                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-sky-100 backdrop-blur">
                                    <Icon className="h-3.5 w-3.5" />
                                    รหัสแผนก {department.code}
                                    {(isLab || isXray || isCheckup || isVisitLayout) && (
                                        <span className="rounded-full bg-white/15 px-2 py-0.5">
                                            {isLab ? 'LAB' : isXray ? 'XRAY' : isCheckup ? 'CHECKUP' : isEr ? 'ER' : isOpdScreen ? 'OPD SCREEN' : 'CLINIC'}
                                        </span>
                                    )}
                                </div>
                                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{department.name}</h1>
                                <p className="text-sm text-sky-100/80 md:text-base">{sourceHint}</p>
                            </div>
                            <div className="w-full max-w-xl rounded-3xl border border-white/15 bg-white/95 p-4 text-slate-800 shadow-xl shadow-sky-950/30 backdrop-blur sm:min-w-[360px]">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
                                    ช่วงวันที่ · พ.ศ.
                                </p>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                    <div className="min-w-0 flex-1">
                                        <ThaiDatePicker
                                            value={startDate}
                                            onChange={setStartDate}
                                            label="วันเริ่มต้น"
                                            placeholder="เลือกวันเริ่ม"
                                            className="w-full max-w-none"
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1">
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
                                        กรอง
                                    </Button>
                                </div>
                                {startDate && endDate ? (
                                    <p className="mt-3 text-xs text-slate-500">
                                        {formatThaiDateFromIso(startDate)} – {formatThaiDateFromIso(endDate)}
                                    </p>
                                ) : null}
                            </div>
                        </div>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {heroKpis.map((item) => (
                                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                                    <div className="mb-1 flex items-center gap-2 text-xs text-sky-100/70">
                                        <item.icon className="h-3.5 w-3.5" />
                                        {item.label}
                                    </div>
                                    <div className="text-2xl font-bold">{item.value}</div>
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

                    {hasZones ? (
                        <div className="grid gap-3 lg:grid-cols-2">
                            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4">
                                <a href="#zone-qi" className="mb-2 inline-flex items-center gap-2 text-sm font-bold text-amber-950 hover:underline">
                                    <Target className="h-4 w-4" />
                                    โซนตัวชี้วัดคุณภาพ {isOpdScreen ? '(QI-OPD)' : isEr ? '(ER)' : ''}
                                </a>
                                <p className="mb-3 text-xs text-amber-900/70">รอตรวจสอบความถูกต้องก่อนเชื่อมโยงระบบตัวชี้วัด</p>
                                <div className="flex flex-wrap gap-2">
                                    {qiSectionKeys
                                        .filter((key) => sections[key])
                                        .map((key) => (
                                            <a
                                                key={key}
                                                href={`#sec-${key}`}
                                                className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-sm hover:bg-amber-100"
                                            >
                                                {sections[key]}
                                            </a>
                                        ))}
                                </div>
                            </div>
                            <div className="rounded-2xl border border-sky-200/80 bg-sky-50/70 p-4">
                                <a href="#zone-ops" className="mb-2 inline-flex items-center gap-2 text-sm font-bold text-sky-950 hover:underline">
                                    <Activity className="h-4 w-4" />
                                    โซนรายงานทั่วไป / ปฏิบัติการ
                                </a>
                                <p className="mb-3 text-xs text-sky-900/70">ปริมาณงาน แนวโน้ม การไหลเวียนผู้ป่วย และสิทธิการรักษา</p>
                                <div className="flex flex-wrap gap-2">
                                    {opsSectionKeys
                                        .filter((key) => sections[key])
                                        .map((key) => (
                                            <a
                                                key={key}
                                                href={`#sec-${key}`}
                                                className="rounded-full border border-sky-100 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
                                            >
                                                {sections[key]}
                                            </a>
                                        ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(sections).map(([key, label]) => (
                                <a
                                    key={key}
                                    href={`#sec-${key}`}
                                    className="rounded-full border border-sky-100 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
                                >
                                    {label}
                                </a>
                            ))}
                        </div>
                    )}

                    {isVisitLayout ? (
                        <ZoneBlock
                            id="zone-qi"
                            tone="qi"
                            badge={isOpdScreen ? 'โซนตัวชี้วัดคุณภาพ · QI-OPD' : isEr ? 'โซนตัวชี้วัดคุณภาพ · ER' : 'โซนตัวชี้วัดคุณภาพ'}
                            title="ข้อมูลระยะเวลารอคอยและคุณภาพบริการ"
                            subtitle={
                                isOpdScreen
                                    ? 'QI-OPD-001 ระยะเวลารอคอย และ QI-OPD-006 %ได้รับการคัดกรอง / ความครบถ้วนสัญญาณชีพ — แสดงเพื่อตรวจสอบก่อนเชื่อมโมดูลตัวชี้วัดจริง'
                                    : isEr
                                      ? 'เวลารอรับบริการจาก service_time (ลงทะเบียน → บันทึกบริการ ER) ระดับความฉุกเฉิน และสัญญาณชีพจาก opdscreen'
                                      : 'เวลารอรับบริการจาก service_time (ลงทะเบียน → ปิดบริการ) และสัญญาณชีพจาก opdscreen'
                            }
                            icon={Target}
                        >
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {qiKpis.map((item) => (
                                    <div key={item.label} className="rounded-2xl border border-amber-200/70 bg-white/90 px-4 py-3 shadow-sm">
                                        <div className="mb-1 flex items-center gap-2 text-xs text-amber-800/80">
                                            <item.icon className="h-3.5 w-3.5" />
                                            {item.label}
                                        </div>
                                        <div className="text-2xl font-bold text-amber-950">{item.value}</div>
                                        <div className="mt-1 text-[11px] text-amber-800/60">{item.hint}</div>
                                    </div>
                                ))}
                            </div>

                            {sections.wait_time ? waitPanel : null}

                            {isEr && (er_types.length > 0 || er_pt_types.length > 0) && sections.er_types ? (
                                <SectionCard
                                    id="sec-er_types"
                                    title={sections.er_types}
                                    description="ระดับความฉุกเฉินจาก er_regist.er_emergency_type และประเภทผู้ป่วย er_pt_type (กรอง ovst.main_dep = 003)"
                                    pdfHref={sectionPdf('er_types')}
                                >
                                    <div className="grid gap-4 lg:grid-cols-2">
                                        <div>
                                            <div className="mb-2 text-xs font-semibold text-slate-600">ระดับความฉุกเฉิน</div>
                                            <RankTable rows={er_types} valueLabel="VN" />
                                        </div>
                                        <div>
                                            <div className="mb-2 text-xs font-semibold text-slate-600">ประเภทผู้ป่วย ER</div>
                                            <RankTable rows={er_pt_types} valueLabel="VN" />
                                        </div>
                                    </div>
                                </SectionCard>
                            ) : null}

                            {sections.vitals ? (
                                <SectionCard
                                    id="sec-vitals"
                                    title={sections.vitals}
                                    description="QI-OPD-006 ความครบถ้วนการคัดกรอง + อัตรา BP สูง / BMI / ไข้ จาก opdscreen"
                                    pdfHref={sectionPdf('vitals')}
                                >
                                    <div className="grid gap-4 lg:grid-cols-2">
                                        <div className="h-72">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={vitalAlertChart}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={50} />
                                                    <YAxis tick={{ fontSize: 11 }} />
                                                    <Tooltip formatter={(v: number) => formatNum(v)} />
                                                    <Bar dataKey="total" name="จำนวน" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {vitals.map((row) => (
                                                <div key={row.code} className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2">
                                                    <div className="text-lg font-bold text-slate-800">{formatNum(row.total)}</div>
                                                    <div className="text-xs text-slate-600">{row.name}</div>
                                                    {row.rate != null ? <div className="text-[11px] text-sky-700">{formatNum(row.rate, 1)}%</div> : null}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </SectionCard>
                            ) : null}
                        </ZoneBlock>
                    ) : null}

                    {isVisitLayout ? (
                        <ZoneBlock
                            id="zone-ops"
                            tone="ops"
                            badge="โซนรายงานทั่วไป · ปฏิบัติการ"
                            title={`ข้อมูลรายงานและการติดตามงาน${visitNoun}`}
                            subtitle="ปริมาณงาน แนวโน้ม การไหลเวียนผู้ป่วย อาการสำคัญ สิทธิการรักษา และช่วงเวลาให้บริการ — ใช้ติดตามงานประจำวัน"
                            icon={Activity}
                        >
                            <SectionCard
                                id="sec-summary"
                                title={sections.summary || 'สรุปภาพรวม'}
                                description={`ปริมาณ${visitNoun}และสัดส่วนเพศผู้มารับบริการ`}
                                pdfHref={sectionPdf('summary')}
                            >
                                <div className="grid gap-3 sm:grid-cols-3">
                                    {[
                                        { label: 'ชาย', value: summary.male, className: 'bg-sky-50 text-sky-800' },
                                        { label: 'หญิง', value: summary.female, className: 'bg-rose-50 text-rose-800' },
                                        { label: 'ไม่ระบุเพศ', value: summary.unknown_sex, className: 'bg-slate-50 text-slate-700' },
                                    ].map((item) => (
                                        <div key={item.label} className={cn('rounded-2xl px-4 py-3', item.className)}>
                                            <div className="text-2xl font-bold">{formatNum(item.value)}</div>
                                            <div className="text-xs opacity-70">{item.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </SectionCard>

                            <SectionCard
                                id="sec-trend"
                                title={sections.trend || 'แนวโน้มรายวัน'}
                                description={`จำนวนผู้มารับบริการ${visitNoun}รายวัน (ovst.vstdate, main_dep=${department.code})`}
                                pdfHref={sectionPdf('trend')}
                            >
                                {trend.length === 0 ? (
                                    <p className="text-sm text-slate-500">ไม่มีข้อมูลในช่วงที่เลือก</p>
                                ) : (
                                    <div className="h-72 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={trend}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                                                <YAxis tick={{ fontSize: 11 }} />
                                                <Tooltip />
                                                <Bar dataKey="visits" name={visitLabel} fill={department.color || '#0ea5e9'} radius={[6, 6, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </SectionCard>

                            {sections.ages ? (
                                <SectionCard
                                    id="sec-ages"
                                    title={sections.ages}
                                    description="ช่วงอายุผู้มารับบริการคัดกรอง (กลุ่มสูงอายุมักเป็นสัดส่วนหลัก)"
                                    pdfHref={sectionPdf('ages')}
                                >
                                    {ageChart.length === 0 ? (
                                        <p className="text-sm text-slate-500">ไม่มีข้อมูลในช่วงที่เลือก</p>
                                    ) : (
                                        <div className="h-72">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={ageChart}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                                    <YAxis tick={{ fontSize: 11 }} />
                                                    <Tooltip formatter={(v: number) => formatNum(v)} />
                                                    <Bar dataKey="total" name="ผู้ป่วย (HN)" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </SectionCard>
                            ) : null}

                            {sections.specialties ? (
                                <SectionCard
                                    id="sec-specialties"
                                    title={sections.specialties}
                                    description="คลินิก/สาขาที่ส่งต่อหลังคัดกรอง (ovst.spclty)"
                                    pdfHref={sectionPdf('specialties')}
                                >
                                    <RankTable rows={specialties} valueLabel="VN" />
                                </SectionCard>
                            ) : null}

                            {sections.visit_status ? (
                                <SectionCard
                                    id="sec-visit_status"
                                    title={sections.visit_status}
                                    description="สถานะการรับบริการ (ovst.ovstost)"
                                    pdfHref={sectionPdf('visit_status')}
                                >
                                    <RankTable rows={visit_status} valueLabel="VN" />
                                </SectionCard>
                            ) : null}

                            {sections.destinations ? (
                                <SectionCard
                                    id="sec-destinations"
                                    title={sections.destinations}
                                    description="ปลายทางปัจจุบันหลังคัดกรอง (ovst.cur_dep)"
                                    pdfHref={sectionPdf('destinations')}
                                >
                                    <RankTable rows={destinations} valueLabel="VN" />
                                </SectionCard>
                            ) : null}

                            {sections.complaints ? (
                                <SectionCard
                                    id="sec-complaints"
                                    title={sections.complaints}
                                    description="อาการสำคัญ / Chief complaint จาก opdscreen.cc"
                                    pdfHref={sectionPdf('complaints')}
                                >
                                    <RankTable rows={complaints} valueLabel="ครั้ง" />
                                </SectionCard>
                            ) : null}

                            <SectionCard
                                id="sec-diagnoses"
                                title={sections.diagnoses || 'วินิจฉัยโรคยอดนิยม'}
                                description="Top ICD-10 (หลัก) ของแผนกนี้"
                                pdfHref={sectionPdf('diagnoses')}
                            >
                                {diagnoses.length === 0 ? (
                                    <p className="text-sm text-slate-500">ไม่มีข้อมูลวินิจฉัยในช่วงที่เลือก</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-sky-100 text-left text-sky-800">
                                                    <th className="px-2 py-2 font-semibold">ICD-10</th>
                                                    <th className="px-2 py-2 font-semibold">ชื่อโรค</th>
                                                    <th className="px-2 py-2 text-right font-semibold">จำนวน</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {diagnoses.map((row) => (
                                                    <tr key={`${row.icd10}-${row.total}`} className="border-b border-slate-100">
                                                        <td className="px-2 py-2 font-mono text-xs text-slate-600">{row.icd10}</td>
                                                        <td className="px-2 py-2 text-slate-700">{row.name}</td>
                                                        <td className="px-2 py-2 text-right font-semibold text-slate-900">{formatNum(row.total)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </SectionCard>

                            <SectionCard
                                id="sec-rights"
                                title={sections.rights || 'สิทธิการรักษา'}
                                description="แยกตามสิทธิ (pttype) พร้อมมูลค่า"
                                pdfHref={sectionPdf('rights')}
                            >
                                {rights.length === 0 ? (
                                    <p className="text-sm text-slate-500">ไม่มีข้อมูลสิทธิในช่วงที่เลือก</p>
                                ) : (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {rights.map((row) => (
                                            <div key={row.code + row.name} className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <div className="text-sm font-semibold text-slate-800">{row.name}</div>
                                                        <div className="text-xs text-slate-500">รหัส {row.code}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-lg font-bold text-sky-800">{formatNum(row.visits)}</div>
                                                        <div className="text-[11px] text-slate-500">{visitUnit}</div>
                                                    </div>
                                                </div>
                                                <div className="mt-2 text-xs text-teal-700">มูลค่า {formatNum(row.revenue, 2)} บาท</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </SectionCard>

                            {sections.weekdays ? (
                                <SectionCard
                                    id="sec-weekdays"
                                    title={sections.weekdays}
                                    description="ภาระงานแยกตามวันในสัปดาห์"
                                    pdfHref={sectionPdf('weekdays')}
                                >
                                    {weekdayChart.length === 0 ? (
                                        <p className="text-sm text-slate-500">ไม่มีข้อมูลในช่วงที่เลือก</p>
                                    ) : (
                                        <div className="h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={weekdayChart}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                                    <YAxis tick={{ fontSize: 11 }} />
                                                    <Tooltip formatter={(v: number) => formatNum(v)} />
                                                    <Bar dataKey="total" name="VN" fill="#6366f1" radius={[6, 6, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </SectionCard>
                            ) : null}

                            <SectionCard
                                id="sec-hourly"
                                title={sections.hourly || 'ช่วงเวลามาใช้บริการ'}
                                description="กระจายตามชั่วโมงมารับบริการคัดกรอง (ovst.vsttime)"
                                pdfHref={sectionPdf('hourly')}
                            >
                                {hourlyActive.length === 0 ? (
                                    <p className="text-sm text-slate-500">ไม่มีข้อมูลช่วงเวลาในช่วงที่เลือก</p>
                                ) : (
                                    <div className="space-y-2">
                                        {hourly.map((row) => (
                                            <div key={row.hour} className="flex items-center gap-3">
                                                <div className="flex w-14 items-center gap-1 text-xs font-medium text-slate-500">
                                                    <Clock3 className="h-3 w-3" />
                                                    {row.hour}
                                                </div>
                                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                                                    <div
                                                        className="h-full rounded-full bg-sky-500"
                                                        style={{ width: `${(row.visits / maxHour) * 100}%` }}
                                                    />
                                                </div>
                                                <div className="w-12 text-right text-xs font-semibold text-slate-700">{formatNum(row.visits)}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </SectionCard>
                        </ZoneBlock>
                    ) : null}

                    {!isVisitLayout ? (
                    <>
                    {isWaitEnabled ? waitPanel : null}
                    <SectionCard
                        id="sec-summary"
                        title={sections.summary || 'สรุปภาพรวม'}
                        description={
                            isCheckup
                                ? 'จำนวนผู้รับบริการ สัดส่วนเพศ และสถานะผล Lab สำคัญ'
                                : isLab
                                  ? 'ปริมาณงานแล็บ สัดส่วน OPD/IPD สถานะรายงาน และเพศผู้ป่วย'
                                  : isXray
                                    ? 'ปริมาณงานรังสี สัดส่วน OPD/IPD สถานะยืนยันผล และเพศผู้ป่วย'
                                    : isIpd
                                      ? 'Admit / จำหน่าย / ผู้ป่วยค้าง และสัดส่วนเพศ จาก ipt'
                                      : 'จำนวนครั้งรับบริการ ผู้ป่วย มูลค่า และสัดส่วนเพศ'
                        }
                        pdfHref={sectionPdf('summary')}
                    >
                        <div className="grid gap-4 lg:grid-cols-2">
                            <div className="grid gap-3 sm:grid-cols-3">
                                {[
                                    { label: 'ชาย', value: summary.male, className: 'bg-sky-50 text-sky-800' },
                                    { label: 'หญิง', value: summary.female, className: 'bg-rose-50 text-rose-800' },
                                    { label: 'ไม่ระบุเพศ', value: summary.unknown_sex, className: 'bg-slate-50 text-slate-700' },
                                ].map((item) => (
                                    <div key={item.label} className={cn('rounded-2xl px-4 py-3', item.className)}>
                                        <div className="text-2xl font-bold">{formatNum(item.value)}</div>
                                        <div className="text-xs opacity-70">{item.label}</div>
                                    </div>
                                ))}
                            </div>
                            {isCheckup && labStatusPie.length > 0 ? (
                                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
                                    <div className="mb-2 text-xs font-semibold text-slate-600">สถานะผล Lab สำคัญ</div>
                                    <div className="h-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={labStatusPie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                                                    {labStatusPie.map((item, i) => (
                                                        <Cell key={i} fill={item.color || PIE_COLORS[i % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(v: number) => formatNum(v)} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            ) : null}
                            {(isLab || isXray) && opdIpdPie.length > 0 ? (
                                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3">
                                    <div className="mb-2 text-xs font-semibold text-slate-600">สัดส่วน OPD / IPD</div>
                                    <div className="h-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={opdIpdPie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                                                    {opdIpdPie.map((_, i) => (
                                                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(v: number) => formatNum(v)} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </SectionCard>

                    <SectionCard
                        id="sec-trend"
                        title={sections.trend || 'แนวโน้มรายวัน'}
                        description={
                            isCheckup
                                ? 'จำนวนผู้มารับบริการตรวจสุขภาพประจำวัน (ovst.vstdate, pttype=40)'
                                : isLab
                                  ? 'จำนวนใบสั่งแล็บรายวัน (lab_head.order_date)'
                                  : isXray
                                    ? 'จำนวนรายการตรวจรายวัน (xray_report.request_date)'
                                    : isIpd
                                      ? 'จำนวน Admit รายวัน (ipt.regdate)'
                                      : 'จำนวนครั้งรับบริการและผู้ป่วยรายวันในช่วงที่เลือก'
                        }
                        pdfHref={sectionPdf('trend')}
                    >
                        {trend.length === 0 ? (
                            <p className="text-sm text-slate-500">ไม่มีข้อมูลในช่วงที่เลือก</p>
                        ) : (
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={trend}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                                        <YAxis tick={{ fontSize: 11 }} />
                                        <Tooltip />
                                        <Bar dataKey="visits" name={visitLabel} fill={department.color || '#0ea5e9'} radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </SectionCard>
                    </>
                    ) : null}

                    {isLab && sections.forms ? (
                        <SectionCard
                            id="sec-forms"
                            title={sections.forms}
                            description="ฟอร์มตรวจที่ถูกสั่งบ่อย (lab_head.form_name)"
                            pdfHref={sectionPdf('forms')}
                        >
                            <RankTable rows={forms} valueLabel="ใบสั่ง" />
                        </SectionCard>
                    ) : null}

                    {(isLab || isXray) && sections.items ? (
                        <SectionCard
                            id="sec-items"
                            title={sections.items}
                            description={
                                isLab
                                    ? 'รายการตรวจที่คิดค่าบริการบ่อย (lab_order_service)'
                                    : 'รายการ X-ray / Ultrasound ตามรหัส (xray_report + xray_items)'
                            }
                            pdfHref={sectionPdf('items')}
                        >
                            <RankTable rows={items} valueLabel={isLab ? 'ครั้ง' : 'exam'} showRevenue />
                        </SectionCard>
                    ) : null}

                    {(isLab || isXray) && sections.groups ? (
                        <SectionCard
                            id="sec-groups"
                            title={sections.groups}
                            description={isLab ? 'กลุ่มการตรวจจาก lab_items_group' : 'กลุ่มชนิดการตรวจจาก xray_items_group'}
                            pdfHref={sectionPdf('groups')}
                        >
                            {groupChart.length === 0 ? (
                                <p className="text-sm text-slate-500">ไม่มีข้อมูลในช่วงที่เลือก</p>
                            ) : (
                                <div className="grid gap-4 lg:grid-cols-2">
                                    <div className="h-72">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={groupChart} layout="vertical" margin={{ left: 24, right: 12 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                <XAxis type="number" tick={{ fontSize: 11 }} />
                                                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                                                <Tooltip formatter={(v: number) => formatNum(v)} />
                                                <Bar dataKey="total" name="จำนวน" fill={department.color || '#8b5cf6'} radius={[0, 6, 6, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <RankTable rows={groups} valueLabel="รายการ" />
                                </div>
                            )}
                        </SectionCard>
                    ) : null}

                    {(isLab || isXray) && sections.departments ? (
                        <SectionCard
                            id="sec-departments"
                            title={sections.departments}
                            description={
                                isLab
                                    ? 'หน่วยงานที่สั่งตรวจ (lab_head.order_department)'
                                    : 'หน่วยงานที่ส่งตรวจ (xray_report.request_depcode)'
                            }
                            pdfHref={sectionPdf('departments')}
                        >
                            <RankTable rows={departments} valueLabel={visitUnit} />
                        </SectionCard>
                    ) : null}

                    {isCheckup && sections.regiments ? (
                        <SectionCard
                            id="sec-regiments"
                            title={sections.regiments}
                            description="แยกตาม patient_regiment.main_regiment (เรียงตามจำนวนผู้รับบริการ)"
                            pdfHref={sectionPdf('regiments')}
                        >
                            <RankTable rows={regiments} valueLabel="VN" />
                        </SectionCard>
                    ) : null}

                    {isCheckup && sections.personnel ? (
                        <SectionCard
                            id="sec-personnel"
                            title={sections.personnel}
                            description="แยกตาม patient_regiment.sub_regiment (นายทหาร / นายสิบ / พลเรือน ฯลฯ)"
                            pdfHref={sectionPdf('personnel')}
                        >
                            <div className="grid gap-4 lg:grid-cols-2">
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={personnel.slice(0, 8).map((p) => ({ name: p.name, total: p.total }))} layout="vertical" margin={{ left: 8, right: 12 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" tick={{ fontSize: 11 }} />
                                            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
                                            <Tooltip formatter={(v: number) => formatNum(v)} />
                                            <Bar dataKey="total" name="VN" fill={department.color || '#3b82f6'} radius={[0, 6, 6, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <RankTable rows={personnel} valueLabel="VN" />
                            </div>
                        </SectionCard>
                    ) : null}

                    {isCheckup && sections.ages ? (
                        <SectionCard
                            id="sec-ages"
                            title={sections.ages}
                            description="ช่วงอายุผู้มารับบริการตรวจสุขภาพประจำปี"
                            pdfHref={sectionPdf('ages')}
                        >
                            {ageChart.length === 0 ? (
                                <p className="text-sm text-slate-500">ไม่มีข้อมูลในช่วงที่เลือก</p>
                            ) : (
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={ageChart}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} />
                                            <Tooltip formatter={(v: number) => formatNum(v)} />
                                            <Bar dataKey="total" name="ผู้ป่วย (HN)" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </SectionCard>
                    ) : null}

                    {isCheckup && sections.lab_overview ? (
                        <SectionCard
                            id="sec-lab_overview"
                            title={sections.lab_overview}
                            description="เชื่อม ovst → lab_head → lab_order และเทียบค่ากับ lab_items.range_check เพื่อจัดกลุ่มปกติ/ผิดปกติ"
                            pdfHref={sectionPdf('lab_overview')}
                        >
                            {lab_status.length === 0 ? (
                                <p className="text-sm text-slate-500">ไม่มีข้อมูล Lab ในช่วงที่เลือก</p>
                            ) : (
                                <div className="grid gap-4 lg:grid-cols-2">
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={labStatusPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                                                    {labStatusPie.map((item, i) => (
                                                        <Cell key={i} fill={item.color || PIE_COLORS[i % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(v: number) => formatNum(v)} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="grid gap-3">
                                        {lab_status.map((row) => (
                                            <div
                                                key={row.code}
                                                className={cn(
                                                    'rounded-2xl px-4 py-3',
                                                    row.code === 'normal' && 'bg-teal-50 text-teal-800',
                                                    row.code === 'abnormal' && 'bg-rose-50 text-rose-800',
                                                    row.code === 'pending' && 'bg-slate-50 text-slate-700',
                                                )}
                                            >
                                                <div className="text-2xl font-bold">{formatNum(row.total)}</div>
                                                <div className="text-xs opacity-70">{row.name}</div>
                                            </div>
                                        ))}
                                        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm text-sky-800">
                                            มี Lab อย่างน้อย 1 รายการ: {formatNum(summary.with_lab ?? 0)} VN · ไม่มี Lab: {formatNum(summary.without_lab ?? 0)} VN
                                        </div>
                                    </div>
                                </div>
                            )}
                        </SectionCard>
                    ) : null}

                    {isCheckup && sections.lab_markers ? (
                        <SectionCard
                            id="sec-lab_markers"
                            title={sections.lab_markers}
                            description="FBS, Lipid, Liver, Kidney, CBC สำคัญ — แยกจำนวนผลปกติ/ผิดปกติจากค่าอ้างอิง HOSxP"
                            pdfHref={sectionPdf('lab_markers')}
                        >
                            {lab_markers.length === 0 ? (
                                <p className="text-sm text-slate-500">ไม่มีข้อมูลผลตรวจสำคัญในช่วงที่เลือก</p>
                            ) : (
                                <div className="space-y-4">
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={markerChart} margin={{ left: 8, right: 8 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                                                <YAxis tick={{ fontSize: 11 }} />
                                                <Tooltip />
                                                <Bar dataKey="ปกติ" stackId="a" fill="#14b8a6" radius={[0, 0, 0, 0]} />
                                                <Bar dataKey="ผิดปกติ" stackId="a" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-sky-100 text-left text-sky-800">
                                                    <th className="px-2 py-2 font-semibold">รายการ</th>
                                                    <th className="px-2 py-2 text-right font-semibold">ทั้งหมด</th>
                                                    <th className="px-2 py-2 text-right font-semibold">ปกติ</th>
                                                    <th className="px-2 py-2 text-right font-semibold">ผิดปกติ</th>
                                                    <th className="px-2 py-2 text-right font-semibold">ค่าเฉลี่ย</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {lab_markers.map((row) => (
                                                    <tr key={row.code} className="border-b border-slate-100">
                                                        <td className="px-2 py-2 text-slate-700">
                                                            {row.name}
                                                            {row.unit ? <span className="ml-1 text-xs text-slate-400">({row.unit})</span> : null}
                                                        </td>
                                                        <td className="px-2 py-2 text-right font-semibold">{formatNum(row.total)}</td>
                                                        <td className="px-2 py-2 text-right text-teal-700">{formatNum(row.normal)}</td>
                                                        <td className="px-2 py-2 text-right text-rose-700">{formatNum(row.abnormal)}</td>
                                                        <td className="px-2 py-2 text-right text-slate-600">{formatNum(row.avg_value ?? 0, 2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </SectionCard>
                    ) : null}

                    {!isLab && !isXray && !isCheckup && !isVisitLayout ? (
                        <SectionCard
                            id="sec-diagnoses"
                            title={sections.diagnoses || 'วินิจฉัยโรคยอดนิยม'}
                            description="Top ICD-10 (หลัก) ของแผนกนี้"
                            pdfHref={sectionPdf('diagnoses')}
                        >
                            {diagnoses.length === 0 ? (
                                <p className="text-sm text-slate-500">ไม่มีข้อมูลวินิจฉัยในช่วงที่เลือก</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-sky-100 text-left text-sky-800">
                                                <th className="px-2 py-2 font-semibold">ICD-10</th>
                                                <th className="px-2 py-2 font-semibold">ชื่อโรค</th>
                                                <th className="px-2 py-2 text-right font-semibold">จำนวน</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {diagnoses.map((row) => (
                                                <tr key={`${row.icd10}-${row.total}`} className="border-b border-slate-100">
                                                    <td className="px-2 py-2 font-mono text-xs text-slate-600">{row.icd10}</td>
                                                    <td className="px-2 py-2 text-slate-700">{row.name}</td>
                                                    <td className="px-2 py-2 text-right font-semibold text-slate-900">{formatNum(row.total)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </SectionCard>
                    ) : null}

                    {!isLab && !isXray && !isCheckup && !isVisitLayout ? (
                        <SectionCard
                            id="sec-rights"
                            title={sections.rights || 'สิทธิการรักษา'}
                            description="แยกตามสิทธิ (pttype) พร้อมมูลค่า"
                            pdfHref={sectionPdf('rights')}
                        >
                            {rights.length === 0 ? (
                                <p className="text-sm text-slate-500">ไม่มีข้อมูลสิทธิในช่วงที่เลือก</p>
                            ) : (
                                <div className="grid gap-3 md:grid-cols-2">
                                    {rights.map((row) => (
                                        <div key={row.code + row.name} className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-800">{row.name}</div>
                                                    <div className="text-xs text-slate-500">รหัส {row.code}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-bold text-sky-800">{formatNum(row.visits)}</div>
                                                    <div className="text-[11px] text-slate-500">{visitUnit}</div>
                                                </div>
                                            </div>
                                            <div className="mt-2 text-xs text-teal-700">มูลค่า {formatNum(row.revenue, 2)} บาท</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </SectionCard>
                    ) : null}

                    {isIpd && sections.wards ? (
                        <SectionCard
                            id="sec-wards"
                            title={sections.wards}
                            description="แยก Admit ตามรหัสหอผู้ป่วย (ipt.ward)"
                            pdfHref={sectionPdf('wards')}
                        >
                            {wards.length === 0 ? (
                                <p className="text-sm text-slate-500">ไม่มีข้อมูลหอผู้ป่วยในช่วงที่เลือก</p>
                            ) : (
                                <div className="grid gap-3 md:grid-cols-2">
                                    {wards.map((row) => (
                                        <div key={row.code} className="rounded-2xl border border-teal-100 bg-teal-50/50 px-4 py-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-800">{row.name}</div>
                                                    <div className="text-xs text-slate-500">รหัสหอ {row.code}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-bold text-teal-800">{formatNum(row.admissions)}</div>
                                                    <div className="text-[11px] text-slate-500">admit</div>
                                                </div>
                                            </div>
                                            <div className="mt-2 flex justify-between text-xs text-slate-600">
                                                <span>ผู้ป่วย {formatNum(row.patients)} คน</span>
                                                <span className="font-medium text-amber-700">ค้างอยู่ {formatNum(row.active)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </SectionCard>
                    ) : null}

                    {!isVisitLayout ? (
                    <SectionCard
                        id="sec-hourly"
                        title={sections.hourly || 'ช่วงเวลามาใช้บริการ'}
                        description={
                            isCheckup
                                ? 'กระจายตามชั่วโมงมารับบริการ (ovst.vsttime)'
                                : isLab
                                  ? 'กระจายตามชั่วโมงสั่งตรวจ (lab_head.order_time)'
                                  : isXray
                                    ? 'กระจายตามชั่วโมงขอตรวจ (xray_report.request_time)'
                                    : isIpd
                                      ? 'กระจายตามชั่วโมง Admit (ipt.regtime)'
                                      : 'กระจายตามชั่วโมงที่มาใช้บริการ'
                        }
                        pdfHref={sectionPdf('hourly')}
                    >
                        {hourlyActive.length === 0 ? (
                            <p className="text-sm text-slate-500">ไม่มีข้อมูลช่วงเวลาในช่วงที่เลือก</p>
                        ) : (
                            <div className="space-y-2">
                                {hourly.map((row) => (
                                    <div key={row.hour} className="flex items-center gap-3">
                                        <div className="flex w-14 items-center gap-1 text-xs font-medium text-slate-500">
                                            <Clock3 className="h-3 w-3" />
                                            {row.hour}
                                        </div>
                                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className="h-full rounded-full transition-all"
                                                style={{
                                                    width: `${(row.visits / maxHour) * 100}%`,
                                                    backgroundColor: department.color || '#0ea5e9',
                                                }}
                                            />
                                        </div>
                                        <div className="w-12 text-right text-xs font-semibold text-slate-700">{row.visits}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </SectionCard>
                    ) : null}
                </div>
            </div>
        </AppLayout>
    );
}
