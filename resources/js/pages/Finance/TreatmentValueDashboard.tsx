import React, { useState, useMemo } from 'react';
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
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import FinanceSubNav from '@/pages/Finance/FinanceSubNav';
import {
    DollarSign,
    Stethoscope,
    Bed,
    Calendar,
    Filter,
    Download,
    FileSpreadsheet,
    FileText,
    Printer,
    RefreshCw,
    Search,
    AlertTriangle,
    Activity,
    Pill,
    Layers,
    Receipt,
} from 'lucide-react';

interface FilterProps {
    start_date: string;
    end_date: string;
    visit_type: 'opd' | 'ipd';
    fiscal_year?: number | null;
    start_date_label?: string;
    end_date_label?: string;
}

interface CategoryMeta {
    key: string;
    label: string;
    short: string;
}

interface RowItem {
    index: number;
    pttype_code: string;
    pttype_name: string;
    patient_count: number;
    total_amount: number;
    remark?: string;
    inc01: number;
    inc02?: number;
    inc03: number;
    inc05: number;
    inc06: number;
    inc07: number;
    inc08: number;
    inc09: number;
    inc10: number;
    inc11: number;
    inc12: number;
    inc13: number;
    inc15: number;
    inc16: number;
    inc17: number;
    [key: string]: any;
}

interface ChartItem {
    name: string;
    short_name: string;
    value: number;
    color: string;
}

interface Props {
    filter: FilterProps;
    hosxp_error?: string | null;
    rows: RowItem[];
    totals: Record<string, number>;
    categories: Record<string, CategoryMeta>;
    chart_data: ChartItem[];
    top_pttypes: RowItem[];
    is_cached?: boolean;
    cached_at?: string | null;
}

const CATEGORY_KEYS = [
    'inc03', 'inc17', 'inc05', 'inc07', 'inc06',
    'inc08', 'inc11', 'inc09', 'inc13', 'inc12',
    'inc01', 'inc10', 'inc15', 'inc16',
];

export default function TreatmentValueDashboard({
    filter,
    hosxp_error,
    rows = [],
    totals = {},
    categories = {},
    chart_data = [],
    top_pttypes = [],
    is_cached = false,
    cached_at = null,
}: Props) {
    const [startDate, setStartDate] = useState(filter.start_date || '');
    const [endDate, setEndDate] = useState(filter.end_date || '');
    const [visitType, setVisitType] = useState<'opd' | 'ipd'>(filter.visit_type || 'opd');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    const isIpd = visitType === 'ipd';

    const handleSearch = (newVisitType?: 'opd' | 'ipd', newStart?: string, newEnd?: string) => {
        setLoading(true);
        router.get(
            route('finance.treatment-value'),
            {
                start_date: newStart ?? startDate,
                end_date: newEnd ?? endDate,
                visit_type: newVisitType ?? visitType,
            },
            {
                preserveState: true,
                preserveScroll: true,
                onFinish: () => setLoading(false),
            }
        );
    };

    const handleFiscalYearSelect = (yearThai: number) => {
        const adYear = yearThai - 543;
        const s = `${adYear - 1}-10-01`;
        const e = `${adYear}-09-30`;
        setStartDate(s);
        setEndDate(e);
        handleSearch(visitType, s, e);
    };

    const handleRefresh = () => {
        setLoading(true);
        router.get(
            route('finance.treatment-value'),
            {
                start_date: startDate,
                end_date: endDate,
                visit_type: visitType,
                refresh: true,
            },
            {
                preserveState: true,
                preserveScroll: true,
                onFinish: () => setLoading(false),
            }
        );
    };

    const handleExportExcel = () => {
        const url = route('finance.treatment-value.export', {
            start_date: startDate,
            end_date: endDate,
            visit_type: visitType,
        });
        window.location.href = url;
    };

    const handleExportPdf = (paper: string = 'legal') => {
        const url = route('finance.treatment-value.export-pdf', {
            start_date: startDate,
            end_date: endDate,
            visit_type: visitType,
            paper: paper,
        });
        window.open(url, '_blank');
    };

    const handlePrint = () => {
        window.print();
    };

    const filteredRows = useMemo(() => {
        if (!searchTerm.trim()) return rows;
        const q = searchTerm.toLowerCase().trim();
        return rows.filter(
            (r) =>
                r.pttype_name.toLowerCase().includes(q) ||
                r.pttype_code.toLowerCase().includes(q)
        );
    }, [rows, searchTerm]);

    // Format currency helpers
    const formatCurrency = (val: number | undefined) => {
        if (!val || val === 0) return '-';
        return val.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formatNumber = (val: number | undefined) => {
        if (!val || val === 0) return '-';
        return val.toLocaleString('th-TH');
    };

    // Calculate aggregated KPIs
    const totalAmount = totals.total_amount || 0;
    const totalPatients = totals.patient_count || 0;
    const totalDrug = (totals.inc03 || 0) + (totals.inc17 || 0);
    const drugShare = totalAmount > 0 ? (totalDrug / totalAmount) * 100 : 0;
    const totalClinical =
        (totals.inc11 || 0) +
        (totals.inc07 || 0) +
        (totals.inc08 || 0) +
        (totals.inc09 || 0) +
        (totals.inc12 || 0);
    const clinicalShare = totalAmount > 0 ? (totalClinical / totalAmount) * 100 : 0;

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'รายงานการเงิน', href: route('finance.revenue') },
                { title: 'สรุปมูลค่ารักษาพยาบาล', href: route('finance.treatment-value') },
            ]}
        >
            <Head title={`สรุปมูลค่ารักษาพยาบาล (${isIpd ? 'IPD' : 'OPD'}) - โรงพยาบาลค่ายสุรสิงหนาท`} />

            <div className="space-y-6 p-4 sm:p-6 max-w-full">
                {/* Navigation Sub-tabs */}
                <div className="print:hidden">
                    <FinanceSubNav active="finance.treatment-value" />
                </div>

                {/* Page Title & Main Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 print:border-none print:pb-0">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${isIpd ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'}`}>
                                {isIpd ? <Bed className="w-6 h-6" /> : <Stethoscope className="w-6 h-6" />}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                                    สรุปมูลค่ารายการค่ารักษาพยาบาล{isIpd ? 'ผู้ป่วยใน (IPD)' : 'ผู้ป่วยนอก (OPD)'}
                                </h1>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    โรงพยาบาลค่ายสุรสิงหนาท • ช่วงวันที่ {filter.start_date_label} ถึง {filter.end_date_label}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Mode Switch & Actions */}
                    <div className="flex flex-wrap items-center gap-2 print:hidden">
                        {/* OPD / IPD Toggle */}
                        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
                            <button
                                type="button"
                                onClick={() => {
                                    setVisitType('opd');
                                    handleSearch('opd');
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                    !isIpd
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                                }`}
                            >
                                <Stethoscope className="w-3.5 h-3.5" />
                                ผู้ป่วยนอก (OPD)
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setVisitType('ipd');
                                    handleSearch('ipd');
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                    isIpd
                                        ? 'bg-purple-600 text-white shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                                }`}
                            >
                                <Bed className="w-3.5 h-3.5" />
                                ผู้ป่วยใน (IPD)
                            </button>
                        </div>

                        {/* Export Buttons */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportExcel}
                            className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:text-emerald-400"
                        >
                            <FileSpreadsheet className="w-4 h-4 mr-1.5" />
                            Excel
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportPdf('legal')}
                            className="text-rose-700 hover:text-rose-800 hover:bg-rose-50 dark:text-rose-400"
                            title="ดาวน์โหลด PDF ขนาดกระดาษยาว (Legal Landscape สำหรับ 19 คอลัมน์)"
                        >
                            <FileText className="w-4 h-4 mr-1.5" />
                            PDF (กระดาษยาว)
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePrint}
                            className="text-slate-700 hover:bg-slate-100 dark:text-slate-300"
                        >
                            <Printer className="w-4 h-4 mr-1.5" />
                            พิมพ์
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={loading}
                            title="รีเฟรชข้อมูล (ล้างแคช)"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>

                {/* Filter Toolbar */}
                <Card className="print:hidden border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <CardContent className="pt-5 pb-4 space-y-4">
                        <div className="flex flex-wrap items-end gap-3 sm:gap-4">
                            <div className="space-y-1.5 min-w-[150px]">
                                <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                    วันที่เริ่มต้น
                                </Label>
                                <ThaiDatePicker
                                    value={startDate}
                                    onChange={(v) => setStartDate(v || '')}
                                    className="w-full text-sm"
                                />
                            </div>
                            <div className="space-y-1.5 min-w-[150px]">
                                <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                    วันที่สิ้นสุด
                                </Label>
                                <ThaiDatePicker
                                    value={endDate}
                                    onChange={(v) => setEndDate(v || '')}
                                    className="w-full text-sm"
                                />
                            </div>

                            <Button
                                onClick={() => handleSearch()}
                                disabled={loading}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-4"
                            >
                                <Filter className="w-3.5 h-3.5 mr-1.5" />
                                ดึงรายงาน
                            </Button>

                            {/* Quick Fiscal Year Buttons */}
                            <div className="flex items-center gap-1.5 ml-auto border-l pl-4 border-slate-200 dark:border-slate-700">
                                <span className="text-xs text-slate-500 font-medium mr-1">ปีงบประมาณ:</span>
                                {[2569, 2568, 2567].map((fy) => (
                                    <Button
                                        key={fy}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleFiscalYearSelect(fy)}
                                        className="h-8 px-2.5 text-xs text-slate-700 dark:text-slate-300"
                                    >
                                        ปี {fy}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Search & Cache Status */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                            <div className="relative w-full sm:w-80">
                                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="ค้นหารายการสิทธิการรักษา..."
                                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-2">
                                {is_cached && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                        แคชข้อมูล {cached_at}
                                    </span>
                                )}
                                <span>พบทั้งหมด {filteredRows.length} รายการสิทธิ</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* HOSxP Error Alert */}
                {hosxp_error && (
                    <div className="p-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-900 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-200 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-sm">การเชื่อมต่อ HOSxP ขัดข้อง</h4>
                            <p className="text-xs mt-1">{hosxp_error}</p>
                        </div>
                    </div>
                )}

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
                    <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                        <CardHeader className="p-4 pb-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-500">มูลค่ารักษารวมทั้งหมด</span>
                                <DollarSign className="w-4 h-4 text-emerald-600" />
                            </div>
                            <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {formatCurrency(totalAmount)} <span className="text-xs font-normal text-slate-500">บาท</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <p className="text-xs text-slate-500">
                                ข้อมูล {isIpd ? 'ผู้ป่วยใน (IPD)' : 'ผู้ป่วยนอก (OPD)'} รวม 14 หมวด
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-blue-500 shadow-sm">
                        <CardHeader className="p-4 pb-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-500">จำนวนการรับบริการ</span>
                                <Activity className="w-4 h-4 text-blue-600" />
                            </div>
                            <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {formatNumber(totalPatients)} <span className="text-xs font-normal text-slate-500">{isIpd ? 'ราย (AN)' : 'ครั้ง (VN)'}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <p className="text-xs text-slate-500">
                                เฉลี่ย {totalPatients > 0 ? (totalAmount / totalPatients).toLocaleString('th-TH', { maximumFractionDigits: 0 }) : 0} บาทต่อการบริการ
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-amber-500 shadow-sm">
                        <CardHeader className="p-4 pb-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-500">ค่ายารวม (ใน + นอกบัญชี)</span>
                                <Pill className="w-4 h-4 text-amber-600" />
                            </div>
                            <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {formatCurrency(totalDrug)} <span className="text-xs font-normal text-slate-500">บาท</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                                คิดเป็น {drugShare.toFixed(1)}% ของมูลค่ารักษาทั้งหมด
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-purple-500 shadow-sm">
                        <CardHeader className="p-4 pb-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-500">หัตถการและวินิจฉัยรวม</span>
                                <Layers className="w-4 h-4 text-purple-600" />
                            </div>
                            <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {formatCurrency(totalClinical)} <span className="text-xs font-normal text-slate-500">บาท</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <p className="text-xs text-purple-700 dark:text-purple-400 font-medium">
                                คิดเป็น {clinicalShare.toFixed(1)}% ของมูลค่ารักษาทั้งหมด
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Visual Charts (Print Hidden) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
                    {/* Donut Chart by Category */}
                    <Card>
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-base font-semibold">สัดส่วนมูลค่าแยกตามหมวดค่ารักษาพยาบาล</CardTitle>
                            <CardDescription className="text-xs">
                                14 หมวดค่าบริการตามโครงสร้าง HOSxP
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            {chart_data.length > 0 ? (
                                <div className="h-64 flex flex-col sm:flex-row items-center gap-4">
                                    <div className="w-full sm:w-1/2 h-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={chart_data}
                                                    dataKey="value"
                                                    nameKey="short_name"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={45}
                                                    outerRadius={75}
                                                    paddingAngle={2}
                                                >
                                                    {chart_data.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(val: number) => [`${val.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, 'มูลค่า']}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="w-full sm:w-1/2 max-h-56 overflow-y-auto space-y-1.5 text-xs pr-2">
                                        {chart_data.map((item, idx) => {
                                            const pct = totalAmount > 0 ? (item.value / totalAmount) * 100 : 0;
                                            return (
                                                <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                                                    <div className="flex items-center gap-2 truncate">
                                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                                        <span className="truncate text-slate-700 dark:text-slate-300">{item.name}</span>
                                                    </div>
                                                    <div className="text-right shrink-0 ml-2">
                                                        <span className="font-semibold">{pct.toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
                                    ไม่มีข้อมูลแสดงผลกราฟ
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Top 5 Pttypes Bar Chart */}
                    <Card>
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-base font-semibold">5 อันดับสิทธิการรักษาที่มียอดรักษาสูงสุด</CardTitle>
                            <CardDescription className="text-xs">
                                จำแนกตามสิทธิการรักษา (pttype)
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            {top_pttypes.length > 0 ? (
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={top_pttypes.map((p) => ({
                                                name: p.pttype_name.length > 20 ? p.pttype_name.substring(0, 18) + '...' : p.pttype_name,
                                                fullName: p.pttype_name,
                                                amount: p.total_amount,
                                            }))}
                                            layout="vertical"
                                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                                            <XAxis type="number" tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                                            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                                            <Tooltip
                                                formatter={(val: number) => [`${val.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, 'ยอดเงิน']}
                                                labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                                            />
                                            <Bar dataKey="amount" fill={isIpd ? '#8B5CF6' : '#3B82F6'} radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
                                    ไม่มีข้อมูลแสดงผลกราฟ
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Formal Form Data Table (Matches Hospital Document 100%) */}
                <Card className="overflow-hidden border-slate-300 dark:border-slate-800 shadow-sm">
                    {/* Header printed on paper */}
                    <div className="p-4 border-b bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-2">
                        <div>
                            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                                ตารางสรุปมูลค่ารายการค่ารักษาพยาบาล{isIpd ? 'ผู้ป่วยใน' : 'ผู้ป่วยนอก'}
                            </h3>
                            <p className="text-xs text-slate-500">
                                โรงพยาบาลค่ายสุรสิงหนาท • แสดง 14 หมวดค่าบริการตามแบบฟอร์มการเงิน
                            </p>
                        </div>
                        <div className="text-xs text-slate-500 print:block">
                            ช่วงวันที่ {filter.start_date_label} ถึง {filter.end_date_label}
                        </div>
                    </div>

                    <div className="overflow-auto max-h-[72vh] relative">
                        <table className="w-full text-left border-collapse text-[11px] sm:text-xs">
                            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
                                <tr className="border-b bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 divide-x divide-slate-200 dark:divide-slate-700">
                                    <th className="py-2.5 px-1.5 text-center font-bold w-10 bg-slate-100 dark:bg-slate-800">ลำดับ</th>
                                    <th className="py-2.5 px-2 font-bold min-w-[170px] bg-slate-100 dark:bg-slate-800">รายการสิทธิ</th>
                                    <th className="py-2.5 px-2 text-right font-bold min-w-[70px] bg-slate-100 dark:bg-slate-800">จำนวน<br/>ผู้ป่วย</th>
                                    <th className="py-2.5 px-2 text-right font-bold min-w-[85px] bg-amber-100/90 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200">ค่ายา<br/>ในบัญชี</th>
                                    <th className="py-2.5 px-2 text-right font-bold min-w-[85px] bg-amber-100/90 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200">ค่ายา<br/>นอกบัญชี</th>
                                    <th className="py-2.5 px-2 text-right font-bold min-w-[80px] bg-slate-100 dark:bg-slate-800">ค่าเวชภัณฑ์</th>
                                    <th className="py-2.5 px-2 text-right font-bold min-w-[85px] bg-slate-100 dark:bg-slate-800">ค่าพยาธิ</th>
                                    <th className="py-2.5 px-2 text-right font-bold min-w-[70px] bg-slate-100 dark:bg-slate-800">ค่าเลือด</th>
                                    <th className="py-2.5 px-2 text-right font-bold min-w-[80px] bg-slate-100 dark:bg-slate-800">ค่ารังสี</th>
                                    <th className="py-2.5 px-2 text-right font-bold min-w-[85px] bg-slate-100 dark:bg-slate-800">ค่าหัตถการ</th>
                                    <th className="py-2.5 px-2 text-right font-bold min-w-[75px] bg-slate-100 dark:bg-slate-800">ค่าวินิจฉัย<br/>อื่น</th>
                                    <th className="py-2.5 px-2 text-right font-bold min-w-[80px] bg-slate-100 dark:bg-slate-800">ค่าทันตกรรม</th>
                                    <th className="py-2.5 px-2 text-right font-bold min-w-[85px] bg-slate-100 dark:bg-slate-800">ค่าบริการ<br/>ทางพยาบาล</th>
                                    <th className="py-2.5 px-2 text-right font-bold min-w-[80px] bg-slate-100 dark:bg-slate-800">
                                        {isIpd ? (
                                            <>ค่าห้อง/<br/>ค่าอาหาร</>
                                        ) : (
                                            <>ค่าเตียง<br/>สังเกตอาการ</>
                                        )}
                                    </th>
                                    <th className="py-2.5 px-2 text-right font-bold min-w-[80px] bg-slate-100 dark:bg-slate-800">ค่าเครื่องมือ<br/>แพทย์</th>
                                    <th className="py-2.5 px-2 text-right font-bold min-w-[80px] bg-slate-100 dark:bg-slate-800">ค่านวด</th>
                                    <th className="py-2.5 px-2 text-right font-bold min-w-[75px] bg-slate-100 dark:bg-slate-800">ค่าบริการ<br/>อื่นๆ</th>
                                    <th className="py-2.5 px-2 text-right font-bold min-w-[100px] bg-emerald-100/90 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200">รวม</th>
                                    <th className="py-2.5 px-2 text-center font-bold w-16 bg-slate-100 dark:bg-slate-800">หมายเหตุ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {filteredRows.length > 0 ? (
                                    filteredRows.map((r) => (
                                        <tr
                                            key={r.pttype_code}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 divide-x divide-slate-100 dark:divide-slate-800 transition-colors"
                                        >
                                            <td className="py-2 px-1.5 text-center text-slate-500">{r.index}</td>
                                            <td className="py-2 px-2 font-medium text-slate-900 dark:text-slate-100">
                                                {r.pttype_name}
                                                <span className="text-[10px] text-slate-400 block font-normal">
                                                    รหัส: {r.pttype_code}
                                                </span>
                                            </td>
                                            <td className="py-2 px-2 text-right text-slate-800 dark:text-slate-200 font-semibold">
                                                {formatNumber(r.patient_count)}
                                            </td>
                                            <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300 bg-amber-50/30 dark:bg-amber-950/10">
                                                {formatCurrency(r.inc03)}
                                            </td>
                                            <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300 bg-amber-50/30 dark:bg-amber-950/10">
                                                {formatCurrency(r.inc17)}
                                            </td>
                                            <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">
                                                {formatCurrency(r.inc05)}
                                            </td>
                                            <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">
                                                {formatCurrency(r.inc07)}
                                            </td>
                                            <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">
                                                {formatCurrency(r.inc06)}
                                            </td>
                                            <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">
                                                {formatCurrency(r.inc08)}
                                            </td>
                                            <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">
                                                {formatCurrency(r.inc11)}
                                            </td>
                                            <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">
                                                {formatCurrency(r.inc09)}
                                            </td>
                                            <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">
                                                {formatCurrency(r.inc13)}
                                            </td>
                                            <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">
                                                {formatCurrency(r.inc12)}
                                            </td>
                                            <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">
                                                {formatCurrency(r.inc01)}
                                            </td>
                                            <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">
                                                {formatCurrency(r.inc10)}
                                            </td>
                                            <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">
                                                {formatCurrency(r.inc15)}
                                            </td>
                                            <td className="py-2 px-2 text-right text-slate-700 dark:text-slate-300">
                                                {formatCurrency(r.inc16)}
                                            </td>
                                            <td className="py-2 px-2 text-right font-bold text-slate-900 dark:text-slate-100 bg-emerald-50/40 dark:bg-emerald-950/20">
                                                {formatCurrency(r.total_amount)}
                                            </td>
                                            <td className="py-2 px-2 text-center text-slate-400">{r.remark || '-'}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={19} className="py-8 text-center text-slate-400">
                                            ไม่พบข้อมูลสรุปมูลค่ารักษาพยาบาลตามเงื่อนไขที่เลือก
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot className="sticky bottom-0 z-20 shadow-[0_-2px_4px_rgba(0,0,0,0.08)]">
                                <tr className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 divide-x divide-slate-200 dark:divide-slate-700">
                                    <td colSpan={2} className="py-3 px-2 text-center text-sm font-bold bg-slate-100 dark:bg-slate-800">
                                        รวมทั้งหมด ({filteredRows.length} สิทธิ)
                                    </td>
                                    <td className="py-3 px-2 text-right text-sm text-blue-700 dark:text-blue-300 bg-slate-100 dark:bg-slate-800">
                                        {formatNumber(totals.patient_count)}
                                    </td>
                                    <td className="py-3 px-2 text-right bg-amber-100/90 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200">
                                        {formatCurrency(totals.inc03)}
                                    </td>
                                    <td className="py-3 px-2 text-right bg-amber-100/90 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200">
                                        {formatCurrency(totals.inc17)}
                                    </td>
                                    <td className="py-3 px-2 text-right bg-slate-100 dark:bg-slate-800">{formatCurrency(totals.inc05)}</td>
                                    <td className="py-3 px-2 text-right bg-slate-100 dark:bg-slate-800">{formatCurrency(totals.inc07)}</td>
                                    <td className="py-3 px-2 text-right bg-slate-100 dark:bg-slate-800">{formatCurrency(totals.inc06)}</td>
                                    <td className="py-3 px-2 text-right bg-slate-100 dark:bg-slate-800">{formatCurrency(totals.inc08)}</td>
                                    <td className="py-3 px-2 text-right bg-slate-100 dark:bg-slate-800">{formatCurrency(totals.inc11)}</td>
                                    <td className="py-3 px-2 text-right bg-slate-100 dark:bg-slate-800">{formatCurrency(totals.inc09)}</td>
                                    <td className="py-3 px-2 text-right bg-slate-100 dark:bg-slate-800">{formatCurrency(totals.inc13)}</td>
                                    <td className="py-3 px-2 text-right bg-slate-100 dark:bg-slate-800">{formatCurrency(totals.inc12)}</td>
                                    <td className="py-3 px-2 text-right bg-slate-100 dark:bg-slate-800">{formatCurrency(totals.inc01)}</td>
                                    <td className="py-3 px-2 text-right bg-slate-100 dark:bg-slate-800">{formatCurrency(totals.inc10)}</td>
                                    <td className="py-3 px-2 text-right bg-slate-100 dark:bg-slate-800">{formatCurrency(totals.inc15)}</td>
                                    <td className="py-3 px-2 text-right bg-slate-100 dark:bg-slate-800">{formatCurrency(totals.inc16)}</td>
                                    <td className="py-3 px-2 text-right text-sm text-emerald-900 dark:text-emerald-200 bg-emerald-100/90 dark:bg-emerald-950/80">
                                        {formatCurrency(totals.total_amount)}
                                    </td>
                                    <td className="py-3 px-2 text-center bg-slate-100 dark:bg-slate-800">-</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </Card>
            </div>
        </AppLayout>
    );
}
