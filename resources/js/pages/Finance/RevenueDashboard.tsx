import React, { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ThaiDatePicker, formatThaiDateFromIso } from '@/components/ui/thai-date-picker';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
} from 'recharts';
import { useTranslation } from '@/hooks/use-translation';
import {
    DollarSign,
    Stethoscope,
    Bed,
    Filter,
    Calendar,
    TrendingUp,
    PieChart as PieChartIcon,
    BarChart3,
    Receipt,
    AlertTriangle,
    Building2,
    Activity,
    Pill,
    Download,
    FileSpreadsheet,
} from 'lucide-react';

interface FilterProps {
    start_date: string;
    end_date: string;
    start_date_label?: string;
    end_date_label?: string;
}

interface Summary {
    total_amount: number;
    opd_amount: number;
    ipd_amount: number;
    opd_visits: number;
    ipd_visits: number;
    total_items: number;
    opd_share: number;
    ipd_share: number;
}

interface PttypeRow {
    pttype_code: string;
    pttype_name: string;
    opd_amount: number;
    ipd_amount: number;
    opd_visits: number;
    ipd_visits: number;
    total_amount: number;
    items: number;
    share_percent: number;
}

interface DepartmentRow {
    department_code: string;
    department_name: string;
    department_type: 'opd' | 'ipd';
    department_type_label: string;
    opd_amount: number;
    ipd_amount: number;
    opd_visits: number;
    ipd_visits: number;
    total_amount: number;
    items: number;
    share_percent: number;
}

interface RankedRow {
    rank: number;
    opd_amount: number;
    ipd_amount: number;
    total_amount: number;
    items: number;
    patients: number;
    total_qty: number;
    share_percent: number;
}

interface DiseaseRow extends RankedRow {
    icd10_code: string;
    disease_name: string;
}

interface DrugRow extends RankedRow {
    drug_code: string;
    drug_name: string;
}

interface MonthlyRow {
    label: string;
    opd: number;
    ipd: number;
    total: number;
}

interface OpdVsIpd {
    name: string;
    value: number;
    color: string;
}

interface Props {
    filter: FilterProps;
    hosxp_error?: string | null;
    summary: Summary | null;
    by_pttype: PttypeRow[];
    by_department: DepartmentRow[];
    top_diseases: DiseaseRow[];
    top_drugs: DrugRow[];
    monthly: MonthlyRow[];
    opd_vs_ipd: OpdVsIpd[];
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const formatNumber = (value: number) => new Intl.NumberFormat('th-TH').format(value);

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
            <p className="font-medium mb-1">{label}</p>
            {payload.map((entry: any, i: number) => (
                <p key={i} style={{ color: entry.color }}>
                    {entry.name}: {formatCurrency(entry.value)} บาท
                </p>
            ))}
        </div>
    );
};

export default function RevenueDashboard({
    filter,
    hosxp_error,
    summary,
    by_pttype,
    by_department,
    top_diseases = [],
    top_drugs = [],
    monthly,
    opd_vs_ipd,
}: Props) {
    const { t } = useTranslation();
    const [startDate, setStartDate] = useState(filter?.start_date || '');
    const [endDate, setEndDate] = useState(filter?.end_date || '');
    const [dateError, setDateError] = useState('');

    useEffect(() => {
        setStartDate(filter?.start_date || '');
        setEndDate(filter?.end_date || '');
    }, [filter]);

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!startDate || !endDate) {
            setDateError('กรุณาเลือกวันที่เริ่มต้นและสิ้นสุด');
            return;
        }
        if (startDate > endDate) {
            setDateError('วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด');
            return;
        }
        setDateError('');
        router.get(
            route('finance.revenue'),
            { start_date: startDate, end_date: endDate },
            { preserveScroll: true },
        );
    };

    const handleExportExcel = () => {
        if (!startDate || !endDate) {
            setDateError('กรุณาเลือกวันที่เริ่มต้นและสิ้นสุดก่อนดาวน์โหลด');
            return;
        }
        if (startDate > endDate) {
            setDateError('วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด');
            return;
        }
        window.open(
            route('finance.revenue.export', { start_date: startDate, end_date: endDate }),
            '_blank',
        );
    };

    const handleExportPdf = () => {
        if (!startDate || !endDate) {
            setDateError('กรุณาเลือกวันที่เริ่มต้นและสิ้นสุดก่อนดาวน์โหลด');
            return;
        }
        if (startDate > endDate) {
            setDateError('วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด');
            return;
        }
        window.open(
            route('finance.revenue.export-pdf', { start_date: startDate, end_date: endDate }),
            '_blank',
        );
    };

    const handleExportPttypePdf = () => {
        if (!startDate || !endDate) {
            setDateError('กรุณาเลือกวันที่เริ่มต้นและสิ้นสุดก่อนดาวน์โหลด');
            return;
        }
        if (startDate > endDate) {
            setDateError('วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด');
            return;
        }
        window.open(
            route('finance.revenue.export-pttype-pdf', { start_date: startDate, end_date: endDate }),
            '_blank',
        );
    };

    const handleExportPttypeExcel = () => {
        if (!startDate || !endDate) {
            setDateError('กรุณาเลือกวันที่เริ่มต้นและสิ้นสุดก่อนดาวน์โหลด');
            return;
        }
        if (startDate > endDate) {
            setDateError('วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด');
            return;
        }
        window.open(
            route('finance.revenue.export-pttype-excel', { start_date: startDate, end_date: endDate }),
            '_blank',
        );
    };

    const filterLabel =
        filter?.start_date_label && filter?.end_date_label
            ? `${filter.start_date_label} — ${filter.end_date_label}`
            : startDate && endDate
              ? `${formatThaiDateFromIso(startDate)} — ${formatThaiDateFromIso(endDate)}`
              : '';

    const topPttypeChart = by_pttype.slice(0, 10).map((row) => ({
        name: row.pttype_name.length > 18 ? row.pttype_name.slice(0, 18) + '…' : row.pttype_name,
        fullName: row.pttype_name,
        OPD: row.opd_amount,
        IPD: row.ipd_amount,
    }));

    const topDepartmentChart = by_department.slice(0, 10).map((row) => ({
        name: row.department_name.length > 18 ? row.department_name.slice(0, 18) + '…' : row.department_name,
        fullName: row.department_name,
        OPD: row.opd_amount,
        IPD: row.ipd_amount,
    }));

    const topDiseaseChart = top_diseases.map((row) => ({
        name: row.icd10_code,
        label: row.disease_name.length > 22 ? row.disease_name.slice(0, 22) + '…' : row.disease_name,
        amount: row.total_amount,
        OPD: row.opd_amount,
        IPD: row.ipd_amount,
    }));

    const topDrugChart = top_drugs.map((row) => ({
        name: row.drug_code,
        label: row.drug_name.length > 22 ? row.drug_name.slice(0, 22) + '…' : row.drug_name,
        amount: row.total_amount,
        OPD: row.opd_amount,
        IPD: row.ipd_amount,
    }));

    const truncateLabel = (text: string, max = 22) =>
        text.length > max ? text.slice(0, max) + '…' : text;

    const pieData = opd_vs_ipd.filter((d) => d.value > 0);

    return (
        <AppLayout
            breadcrumbs={[
                { title: t('Finance Reports'), href: route('finance.dashboard') },
                { title: t('HOSxP Revenue by Coverage'), href: route('finance.revenue') },
            ]}
        >
            <Head title="รายได้ตามสิทธิ์การรักษา" />

            <div className="p-6 space-y-6">
                {/* Hero */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white shadow-xl">
                    <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
                    <div className="absolute -bottom-12 -left-8 h-48 w-48 rounded-full bg-white/5" />
                    <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <DollarSign className="h-8 w-8" />
                                <h1 className="text-2xl md:text-3xl font-bold">รายได้ตามสิทธิ์การรักษา</h1>
                            </div>
                            <p className="text-emerald-100 text-sm md:text-base">
                                ข้อมูลจากตาราง opitemrece แยกตามสิทธิ์ (pttype) และประเภทผู้ป่วยนอก/ใน
                            </p>
                        </div>
                        {summary && (
                            <div className="text-right">
                                <p className="text-emerald-200 text-sm">รายได้รวมช่วงที่เลือก</p>
                                <p className="text-3xl md:text-4xl font-bold">{formatCurrency(summary.total_amount)}</p>
                                <p className="text-emerald-200 text-sm">บาท</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Date Filter */}
                <Card className="shadow-lg border-l-4 border-l-emerald-500">
                    <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50">
                        <div className="flex items-center gap-2">
                            <Filter className="h-5 w-5 text-emerald-600" />
                            <CardTitle>ตัวกรองช่วงวันที่</CardTitle>
                        </div>
                        <CardDescription>เลือกช่วง vstdate จากตาราง opitemrece</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form onSubmit={handleFilterSubmit} className="flex flex-wrap gap-4 items-end">
                            <div className="flex-1 min-w-[200px]">
                                <Label className="flex items-center gap-2 mb-2">
                                    <Calendar className="h-4 w-4 text-emerald-600" />
                                    วันที่เริ่มต้น
                                </Label>
                                <ThaiDatePicker
                                    value={startDate}
                                    onChange={setStartDate}
                                    placeholder="เลือกวันที่เริ่มต้น"
                                    className="w-full max-w-none"
                                />
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <Label className="flex items-center gap-2 mb-2">
                                    <Calendar className="h-4 w-4 text-teal-600" />
                                    วันที่สิ้นสุด
                                </Label>
                                <ThaiDatePicker
                                    value={endDate}
                                    onChange={setEndDate}
                                    placeholder="เลือกวันที่สิ้นสุด"
                                    className="w-full max-w-none"
                                />
                            </div>
                            <Button
                                type="submit"
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                            >
                                <TrendingUp className="mr-2 h-4 w-4" />
                                แสดงข้อมูล
                            </Button>
                            <div className="flex flex-col gap-1.5">
                                <span className="text-xs font-medium text-muted-foreground">ดาวน์โหลดรายงานรวม</span>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleExportExcel}
                                    >
                                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                                        Excel รายงานรวม
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleExportPdf}
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        PDF รายงานรวม
                                    </Button>
                                </div>
                            </div>
                        </form>
                        {filterLabel && (
                            <p className="mt-3 text-sm text-muted-foreground">
                                ช่วงข้อมูล: <span className="font-medium text-foreground">{filterLabel}</span>
                            </p>
                        )}
                        {dateError && <p className="mt-2 text-sm text-red-600">{dateError}</p>}
                        {hosxp_error && (
                            <div className="mt-3 flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                                {hosxp_error}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {summary && (
                    <>
                        {/* Summary Cards */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card className="shadow-lg border-t-4 border-t-emerald-500">
                                <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-br from-emerald-50 to-emerald-100">
                                    <CardTitle className="text-sm font-medium text-emerald-900">รายได้รวม</CardTitle>
                                    <div className="p-2 bg-emerald-500 rounded-lg">
                                        <DollarSign className="h-5 w-5 text-white" />
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <div className="text-2xl font-bold text-emerald-700">{formatCurrency(summary.total_amount)}</div>
                                    <p className="text-xs text-muted-foreground mt-1">บาท · {formatNumber(summary.total_items)} รายการ</p>
                                </CardContent>
                            </Card>

                            <Card className="shadow-lg border-t-4 border-t-blue-500">
                                <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-br from-blue-50 to-blue-100">
                                    <CardTitle className="text-sm font-medium text-blue-900">ผู้ป่วยนอก (OPD)</CardTitle>
                                    <div className="p-2 bg-blue-500 rounded-lg">
                                        <Stethoscope className="h-5 w-5 text-white" />
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.opd_amount)}</div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {summary.opd_share}% · {formatNumber(summary.opd_visits)} ครั้งมา
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="shadow-lg border-t-4 border-t-violet-500">
                                <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-br from-violet-50 to-violet-100">
                                    <CardTitle className="text-sm font-medium text-violet-900">ผู้ป่วยใน (IPD)</CardTitle>
                                    <div className="p-2 bg-violet-500 rounded-lg">
                                        <Bed className="h-5 w-5 text-white" />
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <div className="text-2xl font-bold text-violet-600">{formatCurrency(summary.ipd_amount)}</div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {summary.ipd_share}% · {formatNumber(summary.ipd_visits)} ครั้งมา
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="shadow-lg border-t-4 border-t-amber-500">
                                <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-br from-amber-50 to-amber-100">
                                    <CardTitle className="text-sm font-medium text-amber-900">สิทธิ์การรักษา</CardTitle>
                                    <div className="p-2 bg-amber-500 rounded-lg">
                                        <Receipt className="h-5 w-5 text-white" />
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <div className="text-2xl font-bold text-amber-700">{formatNumber(by_pttype.length)}</div>
                                    <p className="text-xs text-muted-foreground mt-1">ประเภทสิทธิในช่วงที่เลือก</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Charts Row */}
                        <div className="grid gap-6 lg:grid-cols-2">
                            <Card className="shadow-lg">
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <PieChartIcon className="h-5 w-5 text-emerald-600" />
                                        <CardTitle>สัดส่วนรายได้ OPD / IPD</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {pieData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={70}
                                                    outerRadius={110}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                    label={({ name, percent }) =>
                                                        `${name} ${(percent * 100).toFixed(1)}%`
                                                    }
                                                >
                                                    {pieData.map((entry, index) => (
                                                        <Cell key={index} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(v: number) => formatCurrency(v) + ' บาท'} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <p className="text-center text-muted-foreground py-12">ไม่มีข้อมูลในช่วงที่เลือก</p>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="shadow-lg">
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-teal-600" />
                                        <CardTitle>แนวโน้มรายได้รายเดือน</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {monthly.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <AreaChart data={monthly}>
                                                <defs>
                                                    <linearGradient id="opdGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="ipdGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                                                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                                <YAxis tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v)} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend />
                                                <Area type="monotone" dataKey="opd" name="OPD" stroke="#3B82F6" fill="url(#opdGrad)" />
                                                <Area type="monotone" dataKey="ipd" name="IPD" stroke="#8B5CF6" fill="url(#ipdGrad)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <p className="text-center text-muted-foreground py-12">ไม่มีข้อมูลในช่วงที่เลือก</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Bar Chart by pttype */}
                        <Card className="shadow-lg">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5 text-emerald-600" />
                                    <CardTitle>รายได้ตามสิทธิ์การรักษา (Top 10)</CardTitle>
                                </div>
                                <CardDescription>แยกผู้ป่วยนอกและผู้ป่วยใน</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {topPttypeChart.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={380}>
                                        <BarChart data={topPttypeChart} layout="vertical" margin={{ left: 20, right: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                            <XAxis type="number" tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v)} />
                                            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend />
                                            <Bar dataKey="OPD" name="ผู้ป่วยนอก" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                                            <Bar dataKey="IPD" name="ผู้ป่วยใน" stackId="a" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className="text-center text-muted-foreground py-12">ไม่มีข้อมูลในช่วงที่เลือก</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Bar Chart by department */}
                        <Card className="shadow-lg">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-teal-600" />
                                    <CardTitle>รายได้ตามแผนก / หอผู้ป่วย (Top 10)</CardTitle>
                                </div>
                                <CardDescription>
                                    ผู้ป่วยนอกแยกตามแผนก (main_dep) · ผู้ป่วยในแยกตามหอผู้ป่วย (ward)
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {topDepartmentChart.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={380}>
                                        <BarChart data={topDepartmentChart} layout="vertical" margin={{ left: 20, right: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                            <XAxis type="number" tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v)} />
                                            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend />
                                            <Bar dataKey="OPD" name="ผู้ป่วยนอก" stackId="a" fill="#3B82F6" />
                                            <Bar dataKey="IPD" name="ผู้ป่วยใน" stackId="a" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className="text-center text-muted-foreground py-12">ไม่มีข้อมูลในช่วงที่เลือก</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Detail Table by department */}
                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle>รายละเอียดตามแผนก / หอผู้ป่วย</CardTitle>
                                <CardDescription>เรียงตามรายได้รวมมากไปน้อย</CardDescription>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="text-left p-3 font-medium">#</th>
                                            <th className="text-left p-3 font-medium">ประเภท</th>
                                            <th className="text-left p-3 font-medium">แผนก / หอผู้ป่วย</th>
                                            <th className="text-right p-3 font-medium">OPD (บาท)</th>
                                            <th className="text-right p-3 font-medium">IPD (บาท)</th>
                                            <th className="text-right p-3 font-medium">รวม (บาท)</th>
                                            <th className="text-right p-3 font-medium">สัดส่วน</th>
                                            <th className="text-right p-3 font-medium">รายการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {by_department.map((row, i) => (
                                            <tr key={row.department_code} className="border-b hover:bg-muted/30 transition-colors">
                                                <td className="p-3 text-muted-foreground">{i + 1}</td>
                                                <td className="p-3">
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                                            row.department_type === 'ipd'
                                                                ? 'bg-violet-100 text-violet-800'
                                                                : 'bg-blue-100 text-blue-800'
                                                        }`}
                                                    >
                                                        {row.department_type_label}
                                                    </span>
                                                </td>
                                                <td className="p-3 font-medium">{row.department_name}</td>
                                                <td className="p-3 text-right text-blue-600">{formatCurrency(row.opd_amount)}</td>
                                                <td className="p-3 text-right text-violet-600">{formatCurrency(row.ipd_amount)}</td>
                                                <td className="p-3 text-right font-semibold">{formatCurrency(row.total_amount)}</td>
                                                <td className="p-3 text-right">
                                                    <span className="inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800">
                                                        {row.share_percent}%
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right text-muted-foreground">{formatNumber(row.items)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>

                        {/* Top 10 Diseases & Drugs */}
                        <div className="grid gap-6 xl:grid-cols-2">
                            <Card className="shadow-lg">
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <Activity className="h-5 w-5 text-rose-600" />
                                        <CardTitle>10 อันดับโรครายได้สูงสุด</CardTitle>
                                    </div>
                                    <CardDescription>
                                        วินิจฉัยหลัก (ICD-10) จาก ovstdiag / iptdiag รวมรายได้ opitemrece
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {topDiseaseChart.length > 0 ? (
                                        <>
                                            <ResponsiveContainer width="100%" height={320}>
                                                <BarChart data={topDiseaseChart} layout="vertical" margin={{ left: 8, right: 16 }}>
                                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                                    <XAxis type="number" tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v)} />
                                                    <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 10 }} />
                                                    <Tooltip
                                                        formatter={(v: number) => formatCurrency(v) + ' บาท'}
                                                        labelFormatter={(_, payload) => {
                                                            const item = payload?.[0]?.payload;
                                                            return item ? `${item.name} — ${item.label}` : '';
                                                        }}
                                                    />
                                                    <Bar dataKey="amount" name="รายได้" fill="#F43F5E" radius={[0, 4, 4, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                            <div className="mt-4 overflow-x-auto">
                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr className="border-b bg-muted/50">
                                                            <th className="p-2 text-left">#</th>
                                                            <th className="p-2 text-left">ICD-10</th>
                                                            <th className="p-2 text-left">ชื่อโรค</th>
                                                            <th className="p-2 text-right">รายได้</th>
                                                            <th className="p-2 text-right">ผู้ป่วย</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {top_diseases.map((row) => (
                                                            <tr key={row.icd10_code} className="border-b">
                                                                <td className="p-2">{row.rank}</td>
                                                                <td className="p-2 font-mono">{row.icd10_code}</td>
                                                                <td className="p-2">{truncateLabel(row.disease_name, 28)}</td>
                                                                <td className="p-2 text-right font-medium">{formatCurrency(row.total_amount)}</td>
                                                                <td className="p-2 text-right">{formatNumber(row.patients)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-center text-muted-foreground py-12">ไม่มีข้อมูลวินิจฉัยในช่วงที่เลือก</p>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="shadow-lg">
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <Pill className="h-5 w-5 text-indigo-600" />
                                        <CardTitle>10 อันดับยารายได้สูงสุด</CardTitle>
                                    </div>
                                    <CardDescription>จาก drugitems รวมยอด sum_price ในช่วงที่เลือก</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {topDrugChart.length > 0 ? (
                                        <>
                                            <ResponsiveContainer width="100%" height={320}>
                                                <BarChart data={topDrugChart} layout="vertical" margin={{ left: 8, right: 16 }}>
                                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                                    <XAxis type="number" tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v)} />
                                                    <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 10 }} />
                                                    <Tooltip
                                                        formatter={(v: number) => formatCurrency(v) + ' บาท'}
                                                        labelFormatter={(_, payload) => {
                                                            const item = payload?.[0]?.payload;
                                                            return item ? `${item.name} — ${item.label}` : '';
                                                        }}
                                                    />
                                                    <Bar dataKey="amount" name="รายได้" fill="#6366F1" radius={[0, 4, 4, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                            <div className="mt-4 overflow-x-auto">
                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr className="border-b bg-muted/50">
                                                            <th className="p-2 text-left">#</th>
                                                            <th className="p-2 text-left">รหัสยา</th>
                                                            <th className="p-2 text-left">ชื่อยา</th>
                                                            <th className="p-2 text-right">รายได้</th>
                                                            <th className="p-2 text-right">จำนวน</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {top_drugs.map((row) => (
                                                            <tr key={row.drug_code} className="border-b">
                                                                <td className="p-2">{row.rank}</td>
                                                                <td className="p-2 font-mono">{row.drug_code}</td>
                                                                <td className="p-2">{truncateLabel(row.drug_name, 28)}</td>
                                                                <td className="p-2 text-right font-medium">{formatCurrency(row.total_amount)}</td>
                                                                <td className="p-2 text-right">{formatNumber(row.total_qty)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-center text-muted-foreground py-12">ไม่มีข้อมูลยาในช่วงที่เลือก</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Detail Table */}
                        <Card className="shadow-lg">
                            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                                <div>
                                    <CardTitle>รายละเอียดตามสิทธิ์การรักษา</CardTitle>
                                    <CardDescription>เรียงตามรายได้รวมมากไปน้อย</CardDescription>
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-1.5">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        ดาวน์โหลดรายงานตารางนี้
                                    </span>
                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50"
                                            onClick={handleExportPttypeExcel}
                                            disabled={by_pttype.length === 0}
                                        >
                                            <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-700" />
                                            Excel รายละเอียดสิทธิ์
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="border-teal-200 bg-teal-50/50 hover:bg-teal-50"
                                            onClick={handleExportPttypePdf}
                                            disabled={by_pttype.length === 0}
                                        >
                                            <Download className="mr-2 h-4 w-4 text-teal-700" />
                                            PDF รายละเอียดสิทธิ์
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="text-left p-3 font-medium">#</th>
                                            <th className="text-left p-3 font-medium">รหัสสิทธิ</th>
                                            <th className="text-left p-3 font-medium">ชื่อสิทธิการรักษา</th>
                                            <th className="text-right p-3 font-medium">OPD (บาท)</th>
                                            <th className="text-right p-3 font-medium">IPD (บาท)</th>
                                            <th className="text-right p-3 font-medium">รวม (บาท)</th>
                                            <th className="text-right p-3 font-medium">สัดส่วน</th>
                                            <th className="text-right p-3 font-medium">รายการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {by_pttype.map((row, i) => (
                                            <tr key={row.pttype_code} className="border-b hover:bg-muted/30 transition-colors">
                                                <td className="p-3 text-muted-foreground">{i + 1}</td>
                                                <td className="p-3 font-mono text-xs">{row.pttype_code}</td>
                                                <td className="p-3 font-medium">{row.pttype_name}</td>
                                                <td className="p-3 text-right text-blue-600">{formatCurrency(row.opd_amount)}</td>
                                                <td className="p-3 text-right text-violet-600">{formatCurrency(row.ipd_amount)}</td>
                                                <td className="p-3 text-right font-semibold">{formatCurrency(row.total_amount)}</td>
                                                <td className="p-3 text-right">
                                                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                                                        {row.share_percent}%
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right text-muted-foreground">{formatNumber(row.items)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    {by_pttype.length > 0 && (
                                        <tfoot>
                                            <tr className="bg-emerald-50 font-semibold">
                                                <td colSpan={3} className="p-3 text-right">รวมทั้งหมด</td>
                                                <td className="p-3 text-right text-blue-700">{formatCurrency(summary.opd_amount)}</td>
                                                <td className="p-3 text-right text-violet-700">{formatCurrency(summary.ipd_amount)}</td>
                                                <td className="p-3 text-right text-emerald-700">{formatCurrency(summary.total_amount)}</td>
                                                <td className="p-3 text-right">100%</td>
                                                <td className="p-3 text-right">{formatNumber(summary.total_items)}</td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
