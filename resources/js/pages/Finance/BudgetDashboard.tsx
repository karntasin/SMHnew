import { useEffect, useState, type FormEvent } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {
    AlertTriangle,
    Bed,
    Download,
    FileSpreadsheet,
    Filter,
    HandCoins,
    Receipt,
    Stethoscope,
    Wallet,
} from 'lucide-react';
import FinanceSubNav from '@/pages/Finance/FinanceSubNav';

interface YearOption {
    value: number;
    label: string;
    start_date: string;
    end_date: string;
}

interface FilterProps {
    fiscal_year: number;
    start_date: string;
    end_date: string;
    start_date_label: string;
    end_date_label: string;
}

interface Summary {
    total_amount: number;
    opd_amount: number;
    ipd_amount: number;
    opd_share: number;
    ipd_share: number;
    cash_amount: number;
    debt_amount: number;
    unpaid_amount: number;
    other_amount: number;
    total_items: number;
    opd_visits: number;
    ipd_visits: number;
}

interface MonthlyRow {
    key: string;
    label: string;
    opd: number;
    ipd: number;
    total: number;
    cash: number;
    debt: number;
    unpaid: number;
    other: number;
}

interface IncomeRow {
    income_code: string;
    income_name: string;
    opd_amount: number;
    ipd_amount: number;
    total_amount: number;
    items: number;
    share_percent: number;
}

interface PttypeRow {
    pttype_code: string;
    pttype_name: string;
    opd_amount: number;
    ipd_amount: number;
    cash_amount: number;
    debt_amount: number;
    unpaid_amount: number;
    other_amount: number;
    total_amount: number;
    items: number;
    share_percent: number;
}

interface ExpenseLine {
    key: string;
    line_no: number;
    name: string;
    amount: number;
    capital: boolean;
}

interface ExpenseFileSummary {
    total: number | null;
    operating_result: number | null;
    capital_deduction: number | null;
    net_result: number | null;
    ratio: number | null;
}

interface Expenses {
    lines: ExpenseLine[];
    total_amount: number;
    operating_expenses: number;
    capital_amount: number;
    file_summary: ExpenseFileSummary;
    total_mismatch: boolean;
    has_saved: boolean;
}

interface Props {
    filter: FilterProps;
    year_options: YearOption[];
    hosxp_error?: string | null;
    summary: Summary | null;
    monthly: MonthlyRow[];
    by_income: IncomeRow[];
    by_pttype: PttypeRow[];
    expenses: Expenses;
    tab?: 'revenue' | 'expenses';
}

const PIE_COLORS = ['#0F766E', '#0284C7', '#7C3AED', '#D97706', '#E11D48', '#059669', '#4F46E5', '#CA8A04', '#DB2777', '#64748B', '#0EA5E9'];

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const formatNumber = (value: number) => new Intl.NumberFormat('th-TH').format(value);

const axisTick = (value: number) =>
    value >= 1e6 ? `${(value / 1e6).toFixed(1)}M` : value >= 1e3 ? `${(value / 1e3).toFixed(0)}K` : String(value);

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
            <p className="mb-1 font-medium">{label}</p>
            {payload.map((entry, i) => (
                <p key={i} style={{ color: entry.color }}>
                    {entry.name}: {formatCurrency(entry.value)} บาท
                </p>
            ))}
        </div>
    );
};

export default function BudgetDashboard({
    filter,
    year_options,
    hosxp_error,
    summary,
    monthly,
    by_income,
    by_pttype,
    expenses,
    tab: initialTab = 'revenue',
}: Props) {
    const { flash } = usePage().props as { flash?: { success?: string | null; error?: string | null } };
    const [fiscalYear, setFiscalYear] = useState(String(filter.fiscal_year));
    const [tab, setTab] = useState<'revenue' | 'expenses'>(initialTab);
    const [amounts, setAmounts] = useState<Record<string, string>>({});
    const [importFile, setImportFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setFiscalYear(String(filter.fiscal_year));
        setTab(initialTab);
        setAmounts(Object.fromEntries(expenses.lines.map((line) => [line.key, String(line.amount)])));
    }, [filter.fiscal_year, initialTab, expenses]);

    const openReport = (name: 'finance.budget' | 'finance.budget.export' | 'finance.budget.export-pdf') => {
        const params = { fiscal_year: fiscalYear, tab };
        if (name === 'finance.budget') {
            router.get(route(name), params, { preserveScroll: true });
            return;
        }
        window.open(route(name, params), '_blank');
    };

    const saveExpenses = (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);
        router.post(
            route('finance.budget.expenses.update'),
            { fiscal_year: fiscalYear, amounts },
            { onFinish: () => setSaving(false) },
        );
    };

    const importExpenses = (event: FormEvent) => {
        event.preventDefault();
        if (!importFile) return;
        setSaving(true);
        router.post(
            route('finance.budget.expenses.import'),
            { fiscal_year: fiscalYear, file: importFile },
            { forceFormData: true, onFinish: () => setSaving(false) },
        );
    };

    const revenueTotal = summary?.total_amount ?? 0;
    const operatingGap = revenueTotal - expenses.operating_expenses;
    const netGap = operatingGap - expenses.capital_amount;
    const expenseChart = expenses.lines.map((line) => ({
        name: line.name.length > 18 ? line.name.slice(0, 18) + '…' : line.name,
        fullName: line.name,
        amount: line.amount,
    }));
    const expensePie = expenseChart.filter((row) => row.amount > 0).map((row) => ({ name: row.name, value: row.amount }));
    const compareChart = [
        { name: 'รายรับ HOSxP', amount: revenueTotal },
        { name: 'ค่าใช้จ่าย', amount: expenses.total_amount },
    ];
    const fileSummary = expenses.file_summary;

    const showOther = (summary?.other_amount ?? 0) > 0 || monthly.some((row) => row.other > 0);

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'รายงานการเงิน', href: route('finance.dashboard') },
                { title: 'งานงบประมาณ', href: route('finance.budget') },
            ]}
        >
            <Head title="งานงบประมาณ" />

            <div className="space-y-6 p-6">
                <FinanceSubNav active="finance.budget" />

                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white shadow-xl">
                    <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <div className="mb-2 flex items-center gap-3">
                                <Wallet className="h-8 w-8" />
                                <h1 className="text-2xl font-bold md:text-3xl">งานงบประมาณ</h1>
                            </div>
                            <p className="text-sm text-emerald-100 md:text-base">
                                ค่ารักษาพยาบาลจาก opitemrece ตามปีงบประมาณ แยก OPD/IPD และเงินสดกับลูกหนี้สิทธิ
                            </p>
                        </div>
                        {summary && (
                            <div className="text-right">
                                <p className="text-sm text-emerald-200">รวมปีงบประมาณ {filter.fiscal_year}</p>
                                <p className="text-3xl font-bold md:text-4xl">{formatCurrency(summary.total_amount)}</p>
                                <p className="text-sm text-emerald-200">บาท</p>
                            </div>
                        )}
                    </div>
                </div>

                <Card className="border-l-4 border-l-emerald-500 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50">
                        <div className="flex items-center gap-2">
                            <Filter className="h-5 w-5 text-emerald-600" />
                            <CardTitle>ปีงบประมาณ</CardTitle>
                        </div>
                        <CardDescription>
                            นับจากวันที่ลงรายการ (vstdate) 1 ต.ค. – 30 ก.ย. ทั้งผู้ป่วยนอกและผู้ป่วยใน
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                openReport('finance.budget');
                            }}
                            className="flex flex-wrap items-end gap-4"
                        >
                            <div className="min-w-[220px]">
                                <Label className="mb-2 block">เลือกปี</Label>
                                <select
                                    value={fiscalYear}
                                    onChange={(event) => setFiscalYear(event.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    {year_options.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                                แสดงข้อมูล
                            </Button>
                            <Button type="button" variant="outline" onClick={() => openReport('finance.budget.export')}>
                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                                Excel
                            </Button>
                            <Button type="button" variant="outline" onClick={() => openReport('finance.budget.export-pdf')}>
                                <Download className="mr-2 h-4 w-4" />
                                PDF
                            </Button>
                        </form>
                        <p className="mt-3 text-sm text-muted-foreground">
                            ช่วงข้อมูล: <span className="font-medium text-foreground">{filter.start_date_label} — {filter.end_date_label}</span>
                        </p>
                        {hosxp_error && (
                            <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                {hosxp_error}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="flex flex-wrap gap-2">
                    <Button type="button" variant={tab === 'revenue' ? 'default' : 'outline'} onClick={() => setTab('revenue')}>
                        รายรับค่ารักษาพยาบาล
                    </Button>
                    <Button type="button" variant={tab === 'expenses' ? 'default' : 'outline'} onClick={() => setTab('expenses')}>
                        ค่าใช้จ่าย
                    </Button>
                </div>

                {(flash?.success || flash?.error) && (
                    <div className={`rounded-md border px-3 py-2 text-sm ${flash.error ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                        {flash.error || flash.success}
                    </div>
                )}

                {tab === 'revenue' && summary && (
                    <>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <SummaryCard title="รวมทั้งปี" value={summary.total_amount} hint={`${formatNumber(summary.total_items)} รายการ`} tone="emerald" icon={Wallet} />
                            <SummaryCard title="ผู้ป่วยนอก (OPD)" value={summary.opd_amount} hint={`${summary.opd_share}% · ${formatNumber(summary.opd_visits)} ครั้ง`} tone="blue" icon={Stethoscope} />
                            <SummaryCard title="ผู้ป่วยใน (IPD)" value={summary.ipd_amount} hint={`${summary.ipd_share}% · ${formatNumber(summary.ipd_visits)} ครั้ง`} tone="violet" icon={Bed} />
                            <SummaryCard title="เงินสด" value={summary.cash_amount} hint="paidst 01 และ 03" tone="teal" icon={HandCoins} />
                            <SummaryCard title="ลูกหนี้สิทธิ" value={summary.debt_amount} hint="paidst 02" tone="amber" icon={Receipt} />
                            <SummaryCard title="ค้างชำระ" value={summary.unpaid_amount} hint={showOther ? `อื่นๆ ${formatCurrency(summary.other_amount)} บาท` : 'paidst 00'} tone="rose" icon={AlertTriangle} />
                        </div>

                        <div className="grid gap-6 lg:grid-cols-2">
                            <Card className="shadow-lg">
                                <CardHeader>
                                    <CardTitle>ค่ารักษารายเดือน แยก OPD / IPD</CardTitle>
                                    <CardDescription>เรียงตามเดือนในปีงบประมาณ ต.ค. ถึง ก.ย.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={320}>
                                        <BarChart data={monthly}>
                                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                            <YAxis tickFormatter={axisTick} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend />
                                            <Bar dataKey="opd" name="OPD" stackId="visit" fill="#3B82F6" />
                                            <Bar dataKey="ipd" name="IPD" stackId="visit" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card className="shadow-lg">
                                <CardHeader>
                                    <CardTitle>รายเดือน แยกเงินสดและลูกหนี้</CardTitle>
                                    <CardDescription>เงินสด ลูกหนี้สิทธิ และค้างชำระ</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={320}>
                                        <BarChart data={monthly}>
                                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                            <YAxis tickFormatter={axisTick} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend />
                                            <Bar dataKey="cash" name="เงินสด" stackId="pay" fill="#0D9488" />
                                            <Bar dataKey="debt" name="ลูกหนี้สิทธิ" stackId="pay" fill="#D97706" />
                                            <Bar dataKey="unpaid" name="ค้างชำระ" stackId="pay" fill="#E11D48" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle>ตารางรายเดือน</CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="p-3 text-left font-medium">เดือน</th>
                                            <th className="p-3 text-right font-medium">OPD</th>
                                            <th className="p-3 text-right font-medium">IPD</th>
                                            <th className="p-3 text-right font-medium">รวม</th>
                                            <th className="p-3 text-right font-medium">เงินสด</th>
                                            <th className="p-3 text-right font-medium">ลูกหนี้สิทธิ</th>
                                            <th className="p-3 text-right font-medium">ค้างชำระ</th>
                                            {showOther && <th className="p-3 text-right font-medium">อื่นๆ</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {monthly.map((row) => (
                                            <tr key={row.key} className="border-b hover:bg-muted/30">
                                                <td className="p-3 font-medium">{row.label}</td>
                                                <td className="p-3 text-right text-blue-600">{formatCurrency(row.opd)}</td>
                                                <td className="p-3 text-right text-violet-600">{formatCurrency(row.ipd)}</td>
                                                <td className="p-3 text-right font-semibold">{formatCurrency(row.total)}</td>
                                                <td className="p-3 text-right">{formatCurrency(row.cash)}</td>
                                                <td className="p-3 text-right">{formatCurrency(row.debt)}</td>
                                                <td className="p-3 text-right">{formatCurrency(row.unpaid)}</td>
                                                {showOther && <td className="p-3 text-right">{formatCurrency(row.other)}</td>}
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t bg-amber-50 font-semibold">
                                            <td className="p-3">รวม</td>
                                            <td className="p-3 text-right">{formatCurrency(summary.opd_amount)}</td>
                                            <td className="p-3 text-right">{formatCurrency(summary.ipd_amount)}</td>
                                            <td className="p-3 text-right">{formatCurrency(summary.total_amount)}</td>
                                            <td className="p-3 text-right">{formatCurrency(summary.cash_amount)}</td>
                                            <td className="p-3 text-right">{formatCurrency(summary.debt_amount)}</td>
                                            <td className="p-3 text-right">{formatCurrency(summary.unpaid_amount)}</td>
                                            {showOther && <td className="p-3 text-right">{formatCurrency(summary.other_amount)}</td>}
                                        </tr>
                                    </tfoot>
                                </table>
                            </CardContent>
                        </Card>

                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle>หมวดรายได้</CardTitle>
                                <CardDescription>จาก opitemrece.income</CardDescription>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="p-3 text-left font-medium">#</th>
                                            <th className="p-3 text-left font-medium">หมวด</th>
                                            <th className="p-3 text-right font-medium">OPD</th>
                                            <th className="p-3 text-right font-medium">IPD</th>
                                            <th className="p-3 text-right font-medium">รวม</th>
                                            <th className="p-3 text-right font-medium">สัดส่วน</th>
                                            <th className="p-3 text-right font-medium">รายการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {by_income.length === 0 && (
                                            <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">ไม่มีข้อมูลหมวดรายได้</td></tr>
                                        )}
                                        {by_income.map((row, index) => (
                                            <tr key={row.income_code} className="border-b hover:bg-muted/30">
                                                <td className="p-3 text-muted-foreground">{index + 1}</td>
                                                <td className="p-3 font-medium">{row.income_name}</td>
                                                <td className="p-3 text-right text-blue-600">{formatCurrency(row.opd_amount)}</td>
                                                <td className="p-3 text-right text-violet-600">{formatCurrency(row.ipd_amount)}</td>
                                                <td className="p-3 text-right font-semibold">{formatCurrency(row.total_amount)}</td>
                                                <td className="p-3 text-right">{row.share_percent}%</td>
                                                <td className="p-3 text-right text-muted-foreground">{formatNumber(row.items)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>

                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle>สิทธิการรักษา</CardTitle>
                                <CardDescription>ผู้ป่วยในใช้สิทธิจาก ipt ผู้ป่วยนอกใช้สิทธิจาก ovst</CardDescription>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="p-3 text-left font-medium">#</th>
                                            <th className="p-3 text-left font-medium">สิทธิ</th>
                                            <th className="p-3 text-right font-medium">OPD</th>
                                            <th className="p-3 text-right font-medium">IPD</th>
                                            <th className="p-3 text-right font-medium">เงินสด</th>
                                            <th className="p-3 text-right font-medium">ลูกหนี้สิทธิ</th>
                                            <th className="p-3 text-right font-medium">รวม</th>
                                            <th className="p-3 text-right font-medium">สัดส่วน</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {by_pttype.length === 0 && (
                                            <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">ไม่มีข้อมูลสิทธิการรักษา</td></tr>
                                        )}
                                        {by_pttype.map((row, index) => (
                                            <tr key={row.pttype_code} className="border-b hover:bg-muted/30">
                                                <td className="p-3 text-muted-foreground">{index + 1}</td>
                                                <td className="p-3 font-medium">{row.pttype_name}</td>
                                                <td className="p-3 text-right text-blue-600">{formatCurrency(row.opd_amount)}</td>
                                                <td className="p-3 text-right text-violet-600">{formatCurrency(row.ipd_amount)}</td>
                                                <td className="p-3 text-right">{formatCurrency(row.cash_amount)}</td>
                                                <td className="p-3 text-right">{formatCurrency(row.debt_amount)}</td>
                                                <td className="p-3 text-right font-semibold">{formatCurrency(row.total_amount)}</td>
                                                <td className="p-3 text-right">{row.share_percent}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </>
                )}

                {tab === 'expenses' && (
                    <>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <SummaryCard title="รวมค่าใช้จ่าย" value={expenses.total_amount} hint="ผลบวก 11 หมวด" tone="rose" icon={Receipt} />
                            <SummaryCard title="รายรับค่ารักษา HOSxP" value={revenueTotal} hint={summary ? 'จาก opitemrece' : 'ยังไม่มีข้อมูล HOSxP'} tone="emerald" icon={Wallet} />
                            <SummaryCard title="ผลต่างดำเนินงาน" value={operatingGap} hint="รายรับลบค่าใช้จ่ายที่ไม่ใช่งบลงทุน" tone="teal" icon={HandCoins} />
                            <SummaryCard title="ผลต่างสุทธิ" value={netGap} hint="ผลต่างดำเนินงานลบงบลงทุน" tone="violet" icon={Bed} />
                        </div>

                        <div className="grid gap-6 lg:grid-cols-2">
                            <Card className="shadow-lg">
                                <CardHeader>
                                    <CardTitle>ค่าใช้จ่ายตามหมวด</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={360}>
                                        <BarChart data={expenseChart} layout="vertical" margin={{ left: 16, right: 16 }}>
                                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                            <XAxis type="number" tickFormatter={axisTick} />
                                            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar dataKey="amount" name="ค่าใช้จ่าย" fill="#0F766E" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                            <Card className="shadow-lg">
                                <CardHeader>
                                    <CardTitle>สัดส่วนหมวดค่าใช้จ่าย</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {expensePie.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={360}>
                                            <PieChart>
                                                <Pie data={expensePie} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100}>
                                                    {expensePie.map((entry, index) => (
                                                        <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value: number) => formatCurrency(value) + ' บาท'} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <p className="py-12 text-center text-muted-foreground">ยังไม่มียอดค่าใช้จ่าย</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle>รายรับค่ารักษาเทียบค่าใช้จ่าย</CardTitle>
                                <CardDescription>รายรับมาจาก HOSxP ค่าใช้จ่ายมาจากข้อมูลที่บันทึกหรือนำเข้า</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={compareChart}>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis dataKey="name" />
                                        <YAxis tickFormatter={axisTick} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="amount" name="จำนวนเงิน" fill="#0284C7" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle>นำเข้า Excel</CardTitle>
                                <CardDescription>ใช้ลำดับ 1–11 และชื่อหมวดตามไฟล์ต้นแบบ ยอดอยู่คอลัมน์ถัดไปได้</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={importExpenses} className="flex flex-wrap items-end gap-3">
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                                        className="block text-sm"
                                    />
                                    <Button type="submit" disabled={!importFile || saving}>นำเข้า</Button>
                                    <Button type="button" variant="outline" onClick={() => window.open(route('finance.budget.expenses.template'), '_blank')}>
                                        <Download className="mr-2 h-4 w-4" />
                                        ไฟล์ต้นแบบ
                                    </Button>
                                </form>
                                {expenses.total_mismatch && (
                                    <p className="mt-3 text-sm text-amber-700">ยอดรวมในไฟล์ไม่ตรงกับผลบวก 11 หมวด หน้านี้ใช้ผลบวกจากหมวด</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle>กรอกค่าใช้จ่าย</CardTitle>
                                <CardDescription>บันทึกทับชุดของปีงบประมาณที่เลือก</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={saveExpenses} className="space-y-3">
                                    {expenses.lines.map((line) => (
                                        <label key={line.key} className="grid gap-2 sm:grid-cols-[3rem_1fr_12rem] sm:items-center">
                                            <span className="text-sm text-muted-foreground">{line.line_no}</span>
                                            <span className="text-sm font-medium">{line.name}</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={amounts[line.key] ?? ''}
                                                onChange={(event) => setAmounts((current) => ({ ...current, [line.key]: event.target.value }))}
                                                className="h-10 rounded-md border border-input bg-background px-3 text-right text-sm"
                                            />
                                        </label>
                                    ))}
                                    <div className="flex items-center justify-between border-t pt-3">
                                        <span className="font-medium">รวมที่กำลังกรอก</span>
                                        <span className="text-lg font-semibold">
                                            {formatCurrency(expenses.lines.reduce((sum, line) => sum + (Number(amounts[line.key]) || 0), 0))}
                                        </span>
                                    </div>
                                    <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                                        บันทึกค่าใช้จ่าย
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {(fileSummary.total !== null || fileSummary.operating_result !== null || fileSummary.net_result !== null || fileSummary.ratio !== null) && (
                            <Card className="shadow-lg">
                                <CardHeader>
                                    <CardTitle>สรุปตามไฟล์บัญชี</CardTitle>
                                    <CardDescription>ตัวเลขนี้ไม่ได้แทนที่รายรับจาก HOSxP</CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
                                    <FileLine label="รวมค่าใช้จ่ายตามไฟล์" value={fileSummary.total} />
                                    <FileLine label="ผลต่างดำเนินงานตามไฟล์" value={fileSummary.operating_result} />
                                    <FileLine label="หักค่าใช้จ่ายลงทุนตามไฟล์" value={fileSummary.capital_deduction} />
                                    <FileLine label="ผลต่างสุทธิตามไฟล์" value={fileSummary.net_result} />
                                    <FileLine label="อัตราส่วนตามไฟล์" value={fileSummary.ratio} suffix="" />
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </AppLayout>
    );
}

function FileLine({ label, value, suffix = ' บาท' }: { label: string; value: number | null; suffix?: string }) {
    return (
        <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
            <span>{label}</span>
            <span className="font-medium">{value === null ? '-' : `${formatCurrency(value)}${suffix}`}</span>
        </div>
    );
}

function SummaryCard({
    title,
    value,
    hint,
    tone,
    icon: Icon,
}: {
    title: string;
    value: number;
    hint: string;
    tone: 'emerald' | 'blue' | 'violet' | 'teal' | 'amber' | 'rose';
    icon: typeof Wallet;
}) {
    const tones = {
        emerald: 'border-t-emerald-500 from-emerald-50 to-emerald-100 text-emerald-900 bg-emerald-500 text-emerald-700',
        blue: 'border-t-blue-500 from-blue-50 to-blue-100 text-blue-900 bg-blue-500 text-blue-700',
        violet: 'border-t-violet-500 from-violet-50 to-violet-100 text-violet-900 bg-violet-500 text-violet-700',
        teal: 'border-t-teal-500 from-teal-50 to-teal-100 text-teal-900 bg-teal-500 text-teal-700',
        amber: 'border-t-amber-500 from-amber-50 to-amber-100 text-amber-900 bg-amber-500 text-amber-700',
        rose: 'border-t-rose-500 from-rose-50 to-rose-100 text-rose-900 bg-rose-500 text-rose-700',
    }[tone].split(' ');

    return (
        <Card className={`border-t-4 shadow-lg ${tones[0]}`}>
            <CardHeader className={`flex flex-row items-center justify-between bg-gradient-to-br pb-2 ${tones[1]} ${tones[2]}`}>
                <CardTitle className={`text-sm font-medium ${tones[3]}`}>{title}</CardTitle>
                <div className={`rounded-lg p-2 ${tones[4]}`}>
                    <Icon className="h-5 w-5 text-white" />
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                <div className={`text-2xl font-bold ${tones[5]}`}>{formatCurrency(value)}</div>
                <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
            </CardContent>
        </Card>
    );
}
