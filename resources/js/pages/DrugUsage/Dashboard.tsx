import React, { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ThaiDatePicker } from '@/components/ui/thai-date-picker';
import {
    AlertTriangle,
    Download,
    Filter,
    Pill,
    Package,
    Coins,
    TrendingUp,
    BarChart3,
    FileText,
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    Legend,
} from 'recharts';
import { QualityPage, StatCard, Panel, EmptyState } from '@/components/quality/quality-ui';
import DrugUsageSubNav, { drugUsageBreadcrumbs } from './DrugUsageSubNav';

interface Connection {
    connected: boolean;
    message?: string;
}

interface DrugRow {
    rank: number;
    icode: string;
    name: string;
    strength: string;
    units: string;
    form?: string;
    form_label?: string;
    unitprice: number;
    total_qty: number;
    total_amount: number;
    qty_share_percent: number;
    amount_share_percent: number;
}

interface UnitRow {
    units: string;
    form?: string;
    form_label?: string;
    drug_count: number;
    total_qty: number;
    total_amount: number;
    qty_share_percent: number;
    amount_share_percent?: number;
}

interface FormRow {
    form: string;
    label: string;
    drug_count: number;
    total_qty: number;
    total_amount: number;
    qty_share_percent: number;
    amount_share_percent: number;
    subtypes?: SubFormRow[];
}

interface SubFormRow {
    sub_form: string;
    label: string;
    drug_count: number;
    total_qty: number;
    total_amount: number;
    qty_share_percent: number;
    amount_share_percent: number;
}

interface AccountRow {
    key: string;
    label: string;
    drug_count: number;
    total_qty: number;
    total_amount: number;
    qty_share_percent: number;
    amount_share_percent: number;
}

interface AccountCodeRow {
    code: string;
    label: string;
    account: string;
    drug_count: number;
    total_qty: number;
    total_amount: number;
    qty_share_percent: number;
    amount_share_percent: number;
}

interface MonthlyTrend {
    period: string;
    label: string;
    total_qty: number;
    total_amount: number;
    drug_count: number;
}

interface Props {
    connection: Connection;
    filter: {
        start_date: string;
        end_date: string;
        start_date_label?: string;
        end_date_label?: string;
    };
    summary: {
        drug_count: number;
        dispense_lines: number;
        total_qty: number;
        total_amount: number;
    };
    top_by_qty: DrugRow[];
    top_by_amount: DrugRow[];
    by_units: UnitRow[];
    by_form: FormRow[];
    by_account: AccountRow[];
    by_account_code: AccountCodeRow[];
    monthly_trend: MonthlyTrend[];
    error?: string | null;
}

const FORM_COLORS: Record<string, string> = {
    tablet: '#18181b', // สีดำ = ยาเม็ด
    liquid: '#2563eb', // สีน้ำเงิน = ยาน้ำ
    topical: '#ea580c', // สีส้ม = ยาภายนอก
    injection: '#ec4899', // สีชมพู = ยาฉีด
    epiao: '#16a34a', // สีเขียว = ยาฉีดห้องไต epiao
    eprex: '#9333ea', // สีม่วง = ยาฉีดห้องไต eprex
    had: '#dc2626', // สีแดง = ยา High Alert
    other: '#94a3b8',
};

const FORM_COLOR_NAMES: Record<string, string> = {
    tablet: 'สีดำ',
    liquid: 'สีน้ำเงิน',
    topical: 'สีส้ม',
    injection: 'สีชมพู',
    epiao: 'สีเขียว',
    eprex: 'สีม่วง',
    had: 'สีแดง',
    other: 'สีเทา',
};

const ACCOUNT_COLORS: Record<string, string> = {
    in: '#10b981',
    out: '#f59e0b',
};

const fmtNum = (n: number) => n.toLocaleString('th-TH');
const fmtMoney = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const truncate = (name: string, max = 22) => (name.length > max ? name.slice(0, max) + '…' : name);

export default function DrugUsageDashboard({
    connection,
    filter,
    summary,
    top_by_qty,
    top_by_amount,
    by_units,
    by_form,
    by_account = [],
    by_account_code = [],
    monthly_trend,
    error,
}: Props) {
    const [startDate, setStartDate] = useState(filter.start_date);
    const [endDate, setEndDate] = useState(filter.end_date);

    const applyFilter = () => {
        router.get(route('drug-usage.index'), { start_date: startDate, end_date: endDate }, { preserveState: true });
    };

    const exportParams = { start_date: startDate, end_date: endDate };
    const exportUrl = route('drug-usage.export', exportParams);
    const exportPdfUrl = route('drug-usage.export-pdf', exportParams);

    const qtyChart = top_by_qty.slice(0, 10).map((d) => ({
        name: truncate(d.name),
        qty: d.total_qty,
    }));

    const amountChart = top_by_amount.slice(0, 10).map((d) => ({
        name: truncate(d.name),
        amount: d.total_amount,
    }));

    const formChart = by_form.map((f) => ({
        name: f.label,
        colorName: FORM_COLOR_NAMES[f.form] || '',
        fullName: `${f.label} (${FORM_COLOR_NAMES[f.form] || ''})`,
        form: f.form,
        qty: f.total_qty,
        amount: f.total_amount,
        share: f.qty_share_percent,
    }));

    const accountPie = by_account
        .filter((a) => a.total_qty > 0 || a.drug_count > 0)
        .map((a) => ({
            key: a.key,
            name: a.label,
            value: a.total_qty,
            amount: a.total_amount,
            share: a.qty_share_percent,
            amount_share: a.amount_share_percent,
            drug_count: a.drug_count,
        }));

    const topUnits = by_units.slice(0, 12);

    return (
        <QualityPage
            tone="cyan"
            icon={Pill}
            badge="ศูนย์พัฒนาคุณภาพ · รายงานยา"
            title="ภาพรวมข้อมูลยาและการใช้ยา"
            subtitle="สรุปการจ่ายยาจาก HOSxP ตามช่วงวันที่ — จำนวน มูลค่า และแนวโน้มรายเดือน"
            breadcrumbs={drugUsageBreadcrumbs()}
            headTitle="ภาพรวมการใช้ยา"
            subNav={<DrugUsageSubNav active="drug-usage.index" />}
            actions={
                <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" className="rounded-xl">
                        <Link href={route('drug-usage.report', exportParams)}>
                            <BarChart3 className="mr-2 h-4 w-4" />
                            ดูรายงานเต็ม
                        </Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-xl">
                        <a href={exportUrl}>
                            <Download className="mr-2 h-4 w-4" />
                            Excel
                        </a>
                    </Button>
                    <Button asChild variant="outline" className="rounded-xl">
                        <a href={exportPdfUrl}>
                            <FileText className="mr-2 h-4 w-4" />
                            PDF
                        </a>
                    </Button>
                </div>
            }
        >
            <Panel title="กรองช่วงวันที่" description={`${filter.start_date_label} – ${filter.end_date_label}`}>
                <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-500">วันเริ่ม</Label>
                        <ThaiDatePicker value={startDate} onChange={setStartDate} />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-500">วันสิ้นสุด</Label>
                        <ThaiDatePicker value={endDate} onChange={setEndDate} />
                    </div>
                    <Button onClick={applyFilter} className="rounded-xl bg-cyan-600 hover:bg-cyan-700">
                        <Filter className="mr-2 h-4 w-4" />
                        กรองข้อมูล
                    </Button>
                </div>
            </Panel>

            {(!connection.connected || error) && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <AlertTriangle className="mr-2 inline h-4 w-4" />
                    {error || connection.message || 'เชื่อมต่อ HOSxP ไม่ได้'}
                </div>
            )}

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard label="รายการยา" value={fmtNum(summary.drug_count)} sub={`${fmtNum(summary.dispense_lines)} บรรทัดจ่ายยา`} icon={Pill} tone="cyan" />
                <StatCard label="จำนวนรวม" value={fmtNum(summary.total_qty)} sub="หน่วยยาทั้งหมด" icon={Package} tone="indigo" />
                <StatCard label="มูลค่ารวม" value={fmtMoney(summary.total_amount)} sub="บาท" icon={Coins} tone="emerald" />
                <StatCard
                    label="เฉลี่ยต่อรายการยา"
                    value={summary.drug_count > 0 ? fmtNum(Math.round(summary.total_qty / summary.drug_count)) : '0'}
                    sub="หน่วย/รายการยา"
                    icon={TrendingUp}
                    tone="amber"
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Panel title="แยกตามประเภทยา" description="แยกตาม 7 หมวดสีในระบบ HOSxP (ดำ, น้ำเงิน, ส้ม, ชมพู, เขียว, ม่วง, แดง)">
                    {formChart.every((f) => f.qty === 0) ? (
                        <EmptyState text="ไม่พบข้อมูล" />
                    ) : (
                        <div className="space-y-4">
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={formChart} layout="vertical" margin={{ left: 8, right: 24 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" tickFormatter={(v) => fmtNum(v)} />
                                        <YAxis type="category" dataKey="name" width={115} tick={{ fontSize: 11 }} />
                                        <Tooltip
                                            formatter={(v: number, name: string, item: any) =>
                                                name === 'qty'
                                                    ? [`${fmtNum(v)} หน่วย (${item?.payload?.colorName || ''})`, 'จำนวน']
                                                    : [fmtMoney(v), 'มูลค่า']
                                            }
                                        />
                                        <Bar dataKey="qty" name="qty" radius={[0, 6, 6, 0]}>
                                            {formChart.map((entry) => (
                                                <Cell key={entry.form} fill={FORM_COLORS[entry.form] || '#94a3b8'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                                            <th className="py-2 pr-3">ประเภท / สี</th>
                                            <th className="py-2 pr-3 text-right">รายการ</th>
                                            <th className="py-2 pr-3 text-right">จำนวน</th>
                                            <th className="py-2 pr-3 text-right">มูลค่า</th>
                                            <th className="py-2 text-right">สัดส่วน</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {by_form.map((row) => (
                                            <React.Fragment key={row.form}>
                                                <tr className="border-b border-slate-50">
                                                    <td className="py-2 pr-3">
                                                        <span className="inline-flex items-center gap-2 font-medium text-slate-800">
                                                            <span
                                                                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                                                                style={{ background: FORM_COLORS[row.form] || '#94a3b8' }}
                                                            />
                                                            <span>{row.label}</span>
                                                            <span className="text-xs text-slate-400">({FORM_COLOR_NAMES[row.form] || ''})</span>
                                                        </span>
                                                    </td>
                                                    <td className="py-2 pr-3 text-right tabular-nums">{fmtNum(row.drug_count)}</td>
                                                    <td className="py-2 pr-3 text-right tabular-nums">{fmtNum(row.total_qty)}</td>
                                                    <td className="py-2 pr-3 text-right tabular-nums">{fmtMoney(row.total_amount)}</td>
                                                    <td className="py-2 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                                                                <div
                                                                    className="h-full rounded-full"
                                                                    style={{
                                                                        width: `${Math.min(row.qty_share_percent, 100)}%`,
                                                                        background: FORM_COLORS[row.form] || '#94a3b8',
                                                                    }}
                                                                />
                                                            </div>
                                                            <span className="w-10 text-right tabular-nums text-cyan-700">
                                                                {row.qty_share_percent}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {(row.subtypes ?? []).map((sub) => (
                                                    <tr key={`${row.form}-${sub.sub_form}`} className="border-b border-slate-50/80 bg-slate-50/40 text-xs">
                                                        <td className="py-1.5 pr-3 pl-6 text-slate-600">{sub.label}</td>
                                                        <td className="py-1.5 pr-3 text-right tabular-nums text-slate-500">{fmtNum(sub.drug_count)}</td>
                                                        <td className="py-1.5 pr-3 text-right tabular-nums text-slate-500">{fmtNum(sub.total_qty)}</td>
                                                        <td className="py-1.5 pr-3 text-right tabular-nums text-slate-500">{fmtMoney(sub.total_amount)}</td>
                                                        <td className="py-1.5 text-right tabular-nums text-slate-400">{sub.qty_share_percent}%</td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </Panel>

                <Panel title="แนวโน้มรายเดือน" description="จำนวนและมูลค่าการจ่ายยา">
                    {monthly_trend.length === 0 ? (
                        <EmptyState text="ไม่พบข้อมูล" />
                    ) : (
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={monthly_trend}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                    <YAxis yAxisId="qty" tickFormatter={(v) => fmtNum(v)} />
                                    <YAxis yAxisId="amount" orientation="right" tickFormatter={(v) => fmtMoney(v)} />
                                    <Tooltip />
                                    <Legend />
                                    <Line yAxisId="qty" type="monotone" dataKey="total_qty" name="จำนวน" stroke="#06b6d4" strokeWidth={2} dot={false} />
                                    <Line yAxisId="amount" type="monotone" dataKey="total_amount" name="มูลค่า (บาท)" stroke="#6366f1" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </Panel>
            </div>

            <Panel title="สัดส่วนยาในบัญชี / ยานอกบัญชี" description="อ้างอิงฟิลด์ drugaccount จาก drugitems — มีรหัส (ก ข ค ง จ) = ในบัญชี · ว่าง = นอกบัญชี">
                {accountPie.length === 0 ? (
                    <EmptyState text="ไม่พบข้อมูล drugaccount" />
                ) : (
                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="space-y-4">
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={accountPie}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={95}
                                            paddingAngle={3}
                                            label={false}
                                        >
                                            {accountPie.map((entry) => (
                                                <Cell key={entry.key} fill={ACCOUNT_COLORS[entry.key] || '#94a3b8'} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(v: number, _n, item: any) => [
                                                `${fmtNum(v)} (${item?.payload?.share ?? 0}%)`,
                                                'จำนวน',
                                            ]}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            formatter={(value, entry: any) =>
                                                `${value} ${entry?.payload?.share ?? 0}%`
                                            }
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {by_account.map((row) => (
                                    <div
                                        key={row.key}
                                        className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
                                    >
                                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                                            <span
                                                className="h-2.5 w-2.5 rounded-full"
                                                style={{ background: ACCOUNT_COLORS[row.key] || '#94a3b8' }}
                                            />
                                            {row.label}
                                        </div>
                                        <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                                            {row.qty_share_percent}%
                                        </div>
                                        <div className="mt-1 text-xs text-slate-500">
                                            {fmtNum(row.drug_count)} รายการ · จำนวน {fmtNum(row.total_qty)}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            มูลค่า {fmtMoney(row.total_amount)} บาท ({row.amount_share_percent}%)
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <div className="mb-2 text-sm font-medium text-slate-700">แยกรหัสบัญชี (drugaccount)</div>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                                        <th className="py-2 pr-3">รหัส</th>
                                        <th className="py-2 pr-3">กลุ่ม</th>
                                        <th className="py-2 pr-3 text-right">รายการ</th>
                                        <th className="py-2 pr-3 text-right">จำนวน</th>
                                        <th className="py-2 pr-3 text-right">มูลค่า</th>
                                        <th className="py-2 text-right">สัดส่วน</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {by_account_code.map((row) => (
                                        <tr key={row.code} className="border-b border-slate-50">
                                            <td className="py-2 pr-3 font-mono font-medium text-slate-800">{row.code}</td>
                                            <td className="py-2 pr-3">
                                                <span
                                                    className={
                                                        row.account === 'in'
                                                            ? 'rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700'
                                                            : 'rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700'
                                                    }
                                                >
                                                    {row.account === 'in' ? 'ในบัญชี' : 'นอกบัญชี'}
                                                </span>
                                            </td>
                                            <td className="py-2 pr-3 text-right tabular-nums">{fmtNum(row.drug_count)}</td>
                                            <td className="py-2 pr-3 text-right tabular-nums">{fmtNum(row.total_qty)}</td>
                                            <td className="py-2 pr-3 text-right tabular-nums">{fmtMoney(row.total_amount)}</td>
                                            <td className="py-2 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
                                                        <div
                                                            className="h-full rounded-full"
                                                            style={{
                                                                width: `${Math.min(row.qty_share_percent, 100)}%`,
                                                                background: ACCOUNT_COLORS[row.account] || '#94a3b8',
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="w-10 text-right tabular-nums text-slate-600">
                                                        {row.qty_share_percent}%
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </Panel>

            <Panel title="หน่วยยา (units) อันดับต้น" description="12 หน่วยที่มีจำนวนจ่ายสูงสุด — ไม่ซ้อนทับกัน">
                {topUnits.length === 0 ? (
                    <EmptyState text="ไม่พบข้อมูล" />
                ) : (
                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topUnits.map((u) => ({ name: u.units, qty: u.total_qty, form: u.form }))} layout="vertical" margin={{ left: 4, right: 16 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" tickFormatter={(v) => fmtNum(v)} />
                                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={(v: number) => [fmtNum(v), 'จำนวน']} />
                                    <Bar dataKey="qty" radius={[0, 4, 4, 0]}>
                                        {topUnits.map((u, i) => (
                                            <Cell key={i} fill={FORM_COLORS[u.form || 'other'] || '#94a3b8'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                                        <th className="py-2 pr-3">หน่วย</th>
                                        <th className="py-2 pr-3">ประเภท</th>
                                        <th className="py-2 pr-3 text-right">รายการ</th>
                                        <th className="py-2 pr-3 text-right">จำนวน</th>
                                        <th className="py-2 text-right">สัดส่วน</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topUnits.map((row) => (
                                        <tr key={row.units} className="border-b border-slate-50">
                                            <td className="py-2 pr-3 font-medium text-slate-800">{row.units}</td>
                                            <td className="py-2 pr-3">
                                                <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                                                    <span
                                                        className="h-2 w-2 rounded-full flex-shrink-0"
                                                        style={{ background: FORM_COLORS[row.form || 'other'] || '#94a3b8' }}
                                                    />
                                                    {row.form_label || '-'}
                                                </span>
                                            </td>
                                            <td className="py-2 pr-3 text-right tabular-nums">{fmtNum(row.drug_count)}</td>
                                            <td className="py-2 pr-3 text-right tabular-nums">{fmtNum(row.total_qty)}</td>
                                            <td className="py-2 text-right tabular-nums text-cyan-700">{row.qty_share_percent}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </Panel>

            <div className="grid gap-4 lg:grid-cols-2">
                <Panel title="ยาอันดับต้น (จำนวน)" description="10 อันดับแรกตามจำนวนที่จ่าย">
                    {qtyChart.length === 0 ? (
                        <EmptyState text="ไม่พบข้อมูลในช่วงที่เลือก" />
                    ) : (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={qtyChart} layout="vertical" margin={{ left: 8, right: 16 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" tickFormatter={(v) => fmtNum(v)} />
                                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={(v: number) => [fmtNum(v), 'จำนวน']} />
                                    <Bar dataKey="qty" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </Panel>

                <Panel title="ยาอันดับต้น (มูลค่า)" description="10 อันดับแรกตามมูลค่ารวม">
                    {amountChart.length === 0 ? (
                        <EmptyState text="ไม่พบข้อมูลในช่วงที่เลือก" />
                    ) : (
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={amountChart} layout="vertical" margin={{ left: 8, right: 16 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" tickFormatter={(v) => fmtMoney(v)} />
                                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={(v: number) => [fmtMoney(v), 'มูลค่า (บาท)']} />
                                    <Bar dataKey="amount" fill="#6366f1" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </Panel>
            </div>

            <Panel title="รายการยาอันดับต้น (จำนวน)" description="15 อันดับแรก">
                {top_by_qty.length === 0 ? (
                    <EmptyState text="ไม่พบข้อมูล" />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                                    <th className="py-2 pr-3 w-10">#</th>
                                    <th className="py-2 pr-3">ชื่อยา</th>
                                    <th className="py-2 pr-3">ความแรง</th>
                                    <th className="py-2 pr-3">หน่วย</th>
                                    <th className="py-2 pr-3">ประเภท</th>
                                    <th className="py-2 pr-3 text-right">จำนวน</th>
                                    <th className="py-2 pr-3 text-right">มูลค่า</th>
                                    <th className="py-2 text-right">สัดส่วน</th>
                                </tr>
                            </thead>
                            <tbody>
                                {top_by_qty.map((row) => (
                                    <tr key={row.icode} className="border-b border-slate-50">
                                        <td className="py-2 pr-3 text-slate-400">{row.rank}</td>
                                        <td className="py-2 pr-3 font-medium text-slate-800">{row.name}</td>
                                        <td className="py-2 pr-3 text-slate-500">{row.strength || '-'}</td>
                                        <td className="py-2 pr-3 text-slate-500">{row.units}</td>
                                        <td className="py-2 pr-3 text-slate-500">{row.form_label || '-'}</td>
                                        <td className="py-2 pr-3 text-right tabular-nums">{fmtNum(row.total_qty)}</td>
                                        <td className="py-2 pr-3 text-right tabular-nums">{fmtMoney(row.total_amount)}</td>
                                        <td className="py-2 text-right text-cyan-600">{row.qty_share_percent}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>
        </QualityPage>
    );
}
