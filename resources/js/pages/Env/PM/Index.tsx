import { router, useForm } from '@inertiajs/react';
import { AlertTriangle, CalendarClock, CircleDollarSign, History, Timer, Wrench } from 'lucide-react';
import {
    EmptyState,
    Field,
    Panel,
    QualityPage,
    StatCard,
    StatusPill,
} from '@/components/quality/quality-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import EnvSubNav from '@/pages/Env/EnvSubNav';
import CreateWorkOrderButton, { GenerateDueButton } from '@/pages/Env/PM/CreateWorkOrderButton';
import PmSubNav, { criticalityLabel } from '@/pages/Env/PM/PmSubNav';
import { format } from 'date-fns';

interface UpcomingOrder {
    id: number;
    wo_number: string;
    status: string;
    due_date: string;
    result?: string | null;
    asset?: {
        name: string;
        location?: string | null;
        issue_location?: string | null;
        risk_level?: string | null;
        stock_number?: string | null;
    } | null;
}

interface HistoryRow {
    id: number;
    result: string;
    performed_by: string;
    performed_at: string;
    findings?: string | null;
    asset?: { name: string } | null;
}

interface Kpi {
    compliance_rate: number | null;
    compliance_on_time: number;
    compliance_total: number;
    overdue: number;
    mttr_hours: number | null;
    mttr_samples: number;
    mtbf_hours: number | null;
    mtbf_samples: number;
    labor_cost: number;
    parts_cost: number;
    cost: number;
    budget: number;
    budget_for_period: number;
    by_asset: {
        asset_id: number;
        name: string;
        stock_number?: string | null;
        cost: number;
        labor_cost: number;
        parts_cost: number;
        budget?: number | null;
    }[];
}

const breadcrumbs = [
    { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
    { title: 'ENV', href: '/env' },
    { title: 'แผนบำรุงรักษา (PM)', href: '/env/pm' },
];

function money(value: number) {
    return Number(value || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 });
}

function hours(value: number | null, samples: number) {
    if (value === null) return 'ยังคำนวณไม่ได้';
    return `${value} ชม. (${samples})`;
}

export default function Index({
    kpi,
    filters,
    years,
    upcoming,
    history,
    laborRate,
}: {
    kpi: Kpi;
    filters: { year: number; month: number | null };
    years: number[];
    upcoming: UpcomingOrder[];
    history: HistoryRow[];
    laborRate: string;
}) {
    const rateForm = useForm({ labor_rate_per_hour: laborRate || '0' });

    const applyFilter = (year: number, month: string) => {
        router.get(
            route('env.pm.index'),
            { year, month: month || undefined },
            { preserveState: true, replace: true },
        );
    };

    return (
        <QualityPage
            tone="teal"
            icon={Wrench}
            badge="ศูนย์พัฒนาคุณภาพ · ENV"
            title="การติดตามการบำรุงรักษา (PM Tracking)"
            subtitle="ความครบถ้วนของแผน งานค้าง ค่าซ่อมเฉลี่ย และต้นทุนเทียบงบ"
            breadcrumbs={breadcrumbs}
            headTitle="PM Tracking"
            subNav={
                <>
                    <EnvSubNav active="env.pm.index" />
                    <PmSubNav active="dashboard" />
                </>
            }
            actions={
                <div className="flex flex-wrap gap-2">
                    <CreateWorkOrderButton />
                    <GenerateDueButton />
                </div>
            }
        >
            <div className="flex flex-wrap items-end gap-3">
                <Field label="ปี">
                    <select
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                        value={filters.year}
                        onChange={(e) => applyFilter(Number(e.target.value), filters.month ? String(filters.month) : '')}
                    >
                        {years.map((year) => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="เดือน">
                    <select
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                        value={filters.month || ''}
                        onChange={(e) => applyFilter(filters.year, e.target.value)}
                    >
                        <option value="">ทั้งปี</option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                            <option key={month} value={month}>
                                {month}
                            </option>
                        ))}
                    </select>
                </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <StatCard
                    label="PM Compliance"
                    value={kpi.compliance_rate === null ? '-' : `${kpi.compliance_rate}%`}
                    sub={`${kpi.compliance_on_time}/${kpi.compliance_total} ทำทันกำหนด`}
                    icon={CalendarClock}
                    tone="teal"
                />
                <StatCard
                    label="PM Overdue"
                    value={kpi.overdue}
                    sub="ใบงานที่ยังไม่ปิด"
                    icon={AlertTriangle}
                    tone={kpi.overdue ? 'rose' : 'emerald'}
                />
                <StatCard
                    label="MTTR"
                    value={kpi.mttr_hours === null ? '-' : kpi.mttr_hours}
                    sub={hours(kpi.mttr_hours, kpi.mttr_samples)}
                    icon={Timer}
                    tone="amber"
                />
                <StatCard
                    label="MTBF"
                    value={kpi.mtbf_hours === null ? '-' : kpi.mtbf_hours}
                    sub={hours(kpi.mtbf_hours, kpi.mtbf_samples)}
                    icon={History}
                    tone="violet"
                />
                <StatCard
                    label="ต้นทุน PM"
                    value={money(kpi.cost)}
                    sub={`งบช่วงนี้ ${money(kpi.budget_for_period)}`}
                    icon={CircleDollarSign}
                    tone="sky"
                />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Panel title="งานใกล้ถึงและเลยกำหนด" description="ภายใน 30 วัน และรายการค้าง" className="lg:col-span-2">
                    {upcoming.length === 0 ? (
                        <EmptyState text="ยังไม่มีใบงานในช่วงนี้ กดสร้างใบงานแล้วเลือกเครื่อง" />
                    ) : (
                        <div className="space-y-3">
                            {upcoming.map((order) => {
                                const overdue = new Date(order.due_date) < new Date(new Date().toDateString());
                                return (
                                    <button
                                        key={order.id}
                                        type="button"
                                        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 p-4 text-left hover:border-teal-200"
                                        onClick={() => router.get(route('env.pm.work-orders.show', order.id))}
                                    >
                                        <div>
                                            <div className="font-semibold text-slate-800">
                                                {order.asset?.name}{' '}
                                                <span className="font-mono text-xs text-slate-400">{order.wo_number}</span>
                                            </div>
                                            <div className="text-sm text-slate-500">
                                                กำหนด{' '}
                                                <span className={overdue ? 'font-semibold text-rose-600' : ''}>
                                                    {format(new Date(order.due_date), 'dd MMM yyyy')}
                                                </span>
                                                {' · '}
                                                {order.asset?.issue_location || order.asset?.location || '-'}
                                                {' · '}
                                                {order.asset?.risk_level} {criticalityLabel(order.asset?.risk_level)}
                                            </div>
                                        </div>
                                        <StatusPill
                                            label={order.status}
                                            className="border-slate-200 bg-slate-50 text-slate-700"
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </Panel>

                <div className="space-y-6">
                    <Panel title="ต้นทุนเทียบงบ" description="ค่าแรงและอะไหล่ของงานที่ปิดในช่วงที่เลือก">
                        <div className="mb-3 text-sm text-slate-600">
                            ค่าแรง {money(kpi.labor_cost)} · อะไหล่ {money(kpi.parts_cost)} · งบทั้งปี {money(kpi.budget)}
                        </div>
                        {kpi.by_asset.length === 0 ? (
                            <EmptyState text="ยังไม่มีต้นทุนในช่วงนี้" />
                        ) : (
                            <div className="space-y-2">
                                {kpi.by_asset.map((row) => (
                                    <div key={row.asset_id} className="flex items-center justify-between text-sm">
                                        <span className="truncate text-slate-700">{row.name}</span>
                                        <span className="font-medium tabular-nums">{money(row.cost)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <form
                            className="mt-4 space-y-2 border-t border-slate-100 pt-4"
                            onSubmit={(e) => {
                                e.preventDefault();
                                rateForm.post(route('env.pm.settings'));
                            }}
                        >
                            <Field label="อัตราค่าแรงต่อชั่วโมง (บาท)">
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={rateForm.data.labor_rate_per_hour}
                                    onChange={(e) => rateForm.setData('labor_rate_per_hour', e.target.value)}
                                />
                            </Field>
                            <Button type="submit" size="sm" className="rounded-xl" disabled={rateForm.processing}>
                                บันทึกอัตราค่าแรง
                            </Button>
                        </form>
                    </Panel>
                </div>
            </div>

            <Panel title="ประวัติการทำ PM ล่าสุด">
                {history.length === 0 ? (
                    <EmptyState text="ยังไม่มีประวัติการทำ PM" />
                ) : (
                    <div className="space-y-3">
                        {history.map((record) => (
                            <div key={record.id} className="flex items-start justify-between border-b border-slate-100 pb-3 last:border-0">
                                <div>
                                    <div className="font-medium text-slate-800">{record.asset?.name}</div>
                                    <div className="text-xs text-slate-400">
                                        {format(new Date(record.performed_at), 'dd MMM yyyy HH:mm')} · {record.performed_by}
                                    </div>
                                    {record.findings && <div className="mt-1 text-xs text-slate-600">{record.findings}</div>}
                                </div>
                                <StatusPill
                                    label={record.result}
                                    className={
                                        record.result === 'Pass'
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                            : 'border-rose-200 bg-rose-50 text-rose-700'
                                    }
                                />
                            </div>
                        ))}
                    </div>
                )}
            </Panel>
        </QualityPage>
    );
}
