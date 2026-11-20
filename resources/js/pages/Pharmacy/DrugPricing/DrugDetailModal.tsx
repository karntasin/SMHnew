import React from 'react';
import { cn } from '@/lib/utils';
import {
    X,
    Pill,
    Calculator,
    TrendingUp,
    TrendingDown,
    CheckCircle2,
    AlertTriangle,
    DollarSign,
    Calendar,
    Activity,
    Layers,
    Info,
    ArrowRight,
    Loader2,
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

export interface DrugDetailData {
    drug: {
        icode: string;
        name: string;
        generic_name: string;
        strength: string;
        units: string;
        dosageform: string;
        drugaccount: string;
        is_ned: boolean;
        is_ed: boolean;
        unitcost: number;
        unitprice: number;
        margin_baht: number;
        margin_percent: number;
        markup_percent: number;
        income: string;
        istatus: string;
    };
    pricing: {
        tier_name: string;
        tier_order: number;
        min_cost: number;
        max_cost: number | null;
        calc_type: string;
        base_price: number;
        base_cost: number;
        multiplier_percent: number;
        formula_explanation: string;
        pre_round_price: number;
        tier_price: number;
        rounding_applied: boolean;
        diff_vs_tier: number;
        diff_percent: number;
        status: 'over' | 'match' | 'under' | 'no_cost';
        status_label: string;
    };
    simulation: {
        discount_percent: number;
        discount_scope: string;
        eligible_for_discount: boolean;
        discounted_price: number;
        discount_baht_per_unit: number;
    };
    fiscal_year: {
        year: number;
        label: string;
        start: string;
        end: string;
    };
    monthly_usage: {
        ym: string;
        month_name: string;
        qty: number;
        revenue: number;
        opd_qty: number;
        ipd_qty: number;
        opd_revenue: number;
        ipd_revenue: number;
        visits: number;
    }[];
    totals: {
        total_qty: number;
        total_revenue_actual: number;
        opd_qty: number;
        ipd_qty: number;
        opd_revenue: number;
        ipd_revenue: number;
        total_visits: number;
        cost_total: number;
        revenue_current: number;
        revenue_tier: number;
        revenue_discounted: number;
        margin_current: number;
        margin_discounted: number;
        impact_baht: number;
        impact_percent: number;
    };
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    isLoading: boolean;
    data: DrugDetailData | null;
}

export default function DrugDetailModal({ isOpen, onClose, isLoading, data }: Props) {
    if (!isOpen) return null;

    const formatNumber = (num: number, decimals = 2) => {
        return new Intl.NumberFormat('th-TH', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(num);
    };

    const formatBaht = (num: number) => `฿${formatNumber(num, 2)}`;

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-slate-200">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
                    <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                            <Pill className="h-6 w-6" />
                        </span>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-bold text-slate-900">
                                    {isLoading ? 'กำลังโหลดข้อมูล...' : data?.drug?.name}
                                </h3>
                                {data?.drug && (
                                    <>
                                        <span
                                            className={cn(
                                                'rounded-full px-2.5 py-0.5 text-[10px] font-bold border',
                                                data.drug.is_ed
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                            )}
                                        >
                                            {data.drug.drugaccount}
                                        </span>
                                        {data.pricing.status === 'over' && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                                                <TrendingUp className="h-3 w-3" /> สูงกว่าเกณฑ์ ว.111 (+{formatBaht(data.pricing.diff_vs_tier)})
                                            </span>
                                        )}
                                        {data.pricing.status === 'match' && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                                <CheckCircle2 className="h-3 w-3" /> ตรงตามเกณฑ์ ว.111
                                            </span>
                                        )}
                                        {data.pricing.status === 'under' && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                                                <TrendingDown className="h-3 w-3" /> ต่ำกว่าเกณฑ์ ว.111 ({formatBaht(data.pricing.diff_vs_tier)})
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-500">
                                {data?.drug?.icode} · {data?.drug?.strength || '-'} · {data?.drug?.units || '-'} · {data?.drug?.dosageform || '-'}
                                {data?.drug?.generic_name ? ` (${data.drug.generic_name})` : ''}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-3">
                            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                            <div className="text-sm font-medium text-slate-500">กำลังดึงข้อมูลสถิติจ่ายยาและสูตรคำนวณ ว.111 จาก HOSxP...</div>
                        </div>
                    ) : !data ? (
                        <div className="text-center py-12 text-sm text-slate-400">
                            ไม่พบข้อมูลยา
                        </div>
                    ) : (
                        <>
                            {/* 4 Pricing KPI Cards */}
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                    <div className="text-xs font-semibold text-slate-500">ราคาทุนจริง (Unit Cost)</div>
                                    <div className="mt-1 text-xl font-bold font-mono text-slate-800">
                                        {formatBaht(data.drug.unitcost)}
                                    </div>
                                    <div className="mt-1 text-[11px] text-slate-400">
                                        จากตาราง HOSxP drugitems
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4">
                                    <div className="text-xs font-semibold text-sky-800">ราคาขายปัจจุบัน (Selling Price)</div>
                                    <div className="mt-1 text-xl font-bold font-mono text-sky-950">
                                        {formatBaht(data.drug.unitprice)}
                                    </div>
                                    <div className="mt-1 text-[11px] text-sky-700 font-medium">
                                        กำไร {formatBaht(data.drug.margin_baht)} (+{formatNumber(data.drug.markup_percent, 1)}%)
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4">
                                    <div className="text-xs font-semibold text-teal-800">ราคาเกณฑ์ ว.111 / ว.177</div>
                                    <div className="mt-1 text-xl font-bold font-mono text-teal-950">
                                        {formatBaht(data.pricing.tier_price)}
                                    </div>
                                    <div className="mt-1 text-[11px] font-medium">
                                        <span
                                            className={cn(
                                                data.pricing.diff_vs_tier > 0
                                                    ? 'text-rose-600'
                                                    : data.pricing.diff_vs_tier < 0
                                                    ? 'text-amber-600'
                                                    : 'text-emerald-700'
                                            )}
                                        >
                                            {data.pricing.diff_vs_tier > 0 ? '+' : ''}
                                            {formatBaht(data.pricing.diff_vs_tier)} vs ราคาปัจจุบัน
                                        </span>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
                                    <div className="text-xs font-semibold text-amber-800">
                                        ราคาจำลอง (-{data.simulation.discount_percent}%)
                                    </div>
                                    <div className="mt-1 text-xl font-bold font-mono text-amber-950">
                                        {formatBaht(data.simulation.discounted_price)}
                                    </div>
                                    <div className="mt-1 text-[11px] text-amber-700 font-medium">
                                        {data.simulation.eligible_for_discount
                                            ? `ลดลง ${formatBaht(data.simulation.discount_baht_per_unit)} / หน่วย`
                                            : 'ไม่อยู่ในกลุ่มที่เลือกลดราคา'}
                                    </div>
                                </div>
                            </div>

                            {/* Section: Formula Breakdown */}
                            <div className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/70 to-cyan-50/40 p-4 text-xs space-y-2.5">
                                <div className="flex items-center gap-2 font-bold text-teal-900">
                                    <Calculator className="h-4 w-4 text-teal-700" />
                                    <span>แจกแจงสูตรคำนวณราคาขายตามเกณฑ์ ว.111 / ว.177</span>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2 bg-white/80 p-3 rounded-xl border border-teal-100/60">
                                    <div>
                                        <span className="text-slate-500">ช่วงเกณฑ์ที่เข้าข่าย:</span>
                                        <div className="font-semibold text-slate-800 mt-0.5">{data.pricing.tier_name}</div>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">สูตรคำนวณที่ใช้:</span>
                                        <div className="font-semibold text-slate-800 mt-0.5">{data.pricing.formula_explanation}</div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center justify-between text-[11px] text-teal-800 pt-1">
                                    <span>
                                        ราคาคำนวณก่อนปัดเศษ: <strong className="font-mono font-semibold">{formatNumber(data.pricing.pre_round_price, 4)} ฿</strong>
                                    </span>
                                    <span>
                                        ราคาหลังปัดเศษมาตรฐาน รพ.: <strong className="font-mono font-semibold text-teal-900">{formatBaht(data.pricing.tier_price)}</strong>
                                        {data.pricing.rounding_applied && ' (มีผลการปัดเศษ)'}
                                    </span>
                                </div>
                            </div>

                            {/* Section: 12-Month Usage Trend Chart */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                                            <Calendar className="h-4 w-4" />
                                        </span>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm">
                                                แนวโน้มการจ่ายยารายเดือน ({data.fiscal_year.label})
                                            </h4>
                                            <p className="text-[11px] text-slate-400">
                                                ข้อมูลจาก HOSxP opitemrece รวม 12 เดือน (ต.ค. - ก.ย.)
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-xs font-semibold text-slate-700">
                                            จ่ายรวม {formatNumber(data.totals.total_qty, 0)} {data.drug.units}
                                        </div>
                                        <div className="text-[11px] text-teal-600 font-semibold">
                                            ยอดขายจริง {formatBaht(data.totals.total_revenue_actual)}
                                        </div>
                                    </div>
                                </div>

                                <div className="h-56 w-full pt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.monthly_usage} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="month_name" tick={{ fontSize: 11, fill: '#64748b' }} />
                                            <YAxis
                                                yAxisId="left"
                                                tick={{ fontSize: 10, fill: '#64748b' }}
                                                tickFormatter={(v) => `${formatNumber(v, 0)}`}
                                            />
                                            <YAxis
                                                yAxisId="right"
                                                orientation="right"
                                                tick={{ fontSize: 10, fill: '#0d9488' }}
                                                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                                            />
                                            <Tooltip
                                                formatter={(val: any, name: any) => [
                                                    name === 'ยอดเงิน (บาท)' ? formatBaht(Number(val)) : `${formatNumber(Number(val), 0)} ${data.drug.units}`,
                                                    name,
                                                ]}
                                                contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '12px' }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                                            <Bar yAxisId="left" dataKey="qty" name="จำนวนจ่าย (หน่วย)" fill="#0284c7" radius={[4, 4, 0, 0]} />
                                            <Bar yAxisId="right" dataKey="revenue" name="ยอดเงิน (บาท)" fill="#0d9488" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Section: OPD vs IPD & Financial Impact Breakdown */}
                            <div className="grid gap-3 sm:grid-cols-2">
                                {/* OPD vs IPD Breakdown */}
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                                            <Activity className="h-3.5 w-3.5" />
                                        </span>
                                        <h5 className="font-bold text-xs text-slate-800">สัดส่วนการจ่าย OPD vs IPD</h5>
                                    </div>

                                    <div className="space-y-2 text-xs">
                                        <div>
                                            <div className="flex justify-between text-slate-600 mb-1">
                                                <span>ผู้ป่วยนอก (OPD):</span>
                                                <span className="font-semibold text-slate-800">
                                                    {formatNumber(data.totals.opd_qty, 0)} {data.drug.units} ({formatBaht(data.totals.opd_revenue)})
                                                </span>
                                            </div>
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                                                <div
                                                    className="h-full rounded-full bg-sky-500"
                                                    style={{
                                                        width: `${data.totals.total_qty > 0 ? (data.totals.opd_qty / data.totals.total_qty) * 100 : 0}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-slate-600 mb-1">
                                                <span>ผู้ป่วยใน (IPD):</span>
                                                <span className="font-semibold text-slate-800">
                                                    {formatNumber(data.totals.ipd_qty, 0)} {data.drug.units} ({formatBaht(data.totals.ipd_revenue)})
                                                </span>
                                            </div>
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                                                <div
                                                    className="h-full rounded-full bg-indigo-500"
                                                    style={{
                                                        width: `${data.totals.total_qty > 0 ? (data.totals.ipd_qty / data.totals.total_qty) * 100 : 0}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-1 text-[11px] text-slate-400 text-right">
                                            สั่งจ่ายทั้งหมด {formatNumber(data.totals.total_visits, 0)} ครั้ง (Visits)
                                        </div>
                                    </div>
                                </div>

                                {/* Single Drug Impact Simulation */}
                                <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                                            <DollarSign className="h-3.5 w-3.5" />
                                        </span>
                                        <h5 className="font-bold text-xs text-slate-800">
                                            ผลกระทบต่อรายรับเฉพาะยานี้ (ปีงบ {data.fiscal_year.year})
                                        </h5>
                                    </div>

                                    <div className="space-y-1.5 text-xs text-slate-600">
                                        <div className="flex justify-between">
                                            <span>รายรับตามราคาปัจจุบัน:</span>
                                            <span className="font-mono font-semibold text-slate-900">
                                                {formatBaht(data.totals.revenue_current)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>รายรับตามเกณฑ์ ว.111:</span>
                                            <span className="font-mono font-semibold text-teal-800">
                                                {formatBaht(data.totals.revenue_tier)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>รายรับหลังจำลองลด {data.simulation.discount_percent}%:</span>
                                            <span className="font-mono font-bold text-amber-900">
                                                {formatBaht(data.totals.revenue_discounted)}
                                            </span>
                                        </div>
                                        <div className="border-t border-amber-200/60 pt-1.5 flex justify-between font-bold">
                                            <span>ผลต่างรายรับจากการลดราคา:</span>
                                            <span className={cn(data.totals.impact_baht < 0 ? 'text-rose-600' : 'text-emerald-600')}>
                                                {data.totals.impact_baht > 0 ? '+' : ''}
                                                {formatBaht(data.totals.impact_baht)} ({data.totals.impact_percent.toFixed(1)}%)
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 flex items-center justify-end rounded-b-3xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition"
                    >
                        ปิดหน้าต่าง
                    </button>
                </div>
            </div>
        </div>
    );
}
