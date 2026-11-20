import { FormEvent, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import PharmacySubNav, { pharmacyBreadcrumbs } from '@/pages/Pharmacy/PharmacySubNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThaiDatePicker } from '@/components/ui/thai-date-picker';
import {
    ArrowDownRight,
    ArrowUpRight,
    Download,
    FileSpreadsheet,
    Filter,
    Package,
    RotateCcw,
    Search,
    TrendingDown,
    Truck,
    Warehouse,
} from 'lucide-react';
import { warehouseActive, warehouseHome, warehouseSupply, wh } from '@/pages/Pharmacy/inventoryCatalog';

type ReportRow = {
    id: number;
    icode: string;
    name: string;
    strength?: string | null;
    unit: string;
    item_type?: string;
    wh_qty: number;
    transferred_to_opd: number;
    opd_qty: number;
    hosxp_dispensed: number;
    unit_issued: number;
};

type ReportData = {
    items: ReportRow[];
    totals: {
        items_count: number;
        total_wh_qty: number;
        total_transferred: number;
        total_opd_qty: number;
        total_hosxp_dispensed: number;
        total_unit_issued: number;
    };
    locations: {
        warehouse?: { id: number; name: string; code: string } | null;
        pharmacy?: { id: number; name: string; code: string } | null;
    };
};

export default function StockSummaryReport({
    report,
    filters,
}: {
    report: ReportData;
    filters: { start_date: string; end_date: string; search: string };
}) {
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');
    const [search, setSearch] = useState(filters.search || '');

    const applyQuickDate = (type: 'all' | '90d' | '30d' | 'month') => {
        const today = new Date();
        const formatDate = (d: Date) => d.toISOString().split('T')[0];
        const end = formatDate(today);
        let start = '';

        if (type === 'all') {
            start = 'all';
        } else if (type === '90d') {
            const d = new Date(today);
            d.setDate(d.getDate() - 90);
            start = formatDate(d);
        } else if (type === '30d') {
            const d = new Date(today);
            d.setDate(d.getDate() - 30);
            start = formatDate(d);
        } else if (type === 'month') {
            const d = new Date(today.getFullYear(), today.getMonth(), 1);
            start = formatDate(d);
        }

        setStartDate(start);
        setEndDate(end);

        router.get(
            wh('reports.stock-summary'),
            {
                start_date: start,
                end_date: end,
                search: search || undefined,
            },
            { preserveState: true },
        );
    };

    const handleSearch = (e: FormEvent) => {
        e.preventDefault();
        router.get(
            wh('reports.stock-summary'),
            {
                start_date: startDate || undefined,
                end_date: endDate || undefined,
                search: search || undefined,
            },
            { preserveState: true },
        );
    };

    const handleReset = () => {
        setSearch('');
        router.get(wh('reports.stock-summary'));
    };

    const handleExport = () => {
        const params = new URLSearchParams();
        if (startDate) params.set('start_date', startDate);
        if (endDate) params.set('end_date', endDate);
        if (search) params.set('search', search);

        const url = route(wh('reports.stock-summary.export')) + (params.toString() ? '?' + params.toString() : '');
        window.open(url, '_blank');
    };

    const whName = report.locations.warehouse?.name || 'คลังหลัก';
    const pharmName = report.locations.pharmacy?.name || 'ห้องยา OPD';

    return (
        <AppLayout
            breadcrumbs={pharmacyBreadcrumbs([
                { title: warehouseHome(), href: wh('index') },
                { title: 'รายงานสรุปความเคลื่อนไหวสต็อก' },
            ])}
        >
            <Head
                title={
                    warehouseSupply()
                        ? 'รายงานสรุปความเคลื่อนไหวสต็อกเวชภัณฑ์'
                        : 'รายงานสรุปความเคลื่อนไหวสต็อกยา'
                }
            />

            <div className="container mx-auto space-y-6 px-4 py-6">
                <PharmacySubNav active={warehouseActive()} />

                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <FileSpreadsheet className="h-6 w-6 text-teal-600" />
                            <span>รายงานสรุปความเคลื่อนไหวสต็อกยา / เวชภัณฑ์</span>
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            สรุปยอดคงเหลือคลังหลัก, ยอดเบิกมาห้องยา, ยอดคงเหลือห้องยา, ยอดตัดจ่าย HOSxP, และยอดตัดออกหน่วย
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleExport}
                            className="rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300"
                        >
                            <Download className="mr-1.5 h-4 w-4" />
                            ส่งออก Excel (CSV)
                        </Button>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                        <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                            <Package className="h-3.5 w-3.5 text-blue-500" />
                            รายการยาในรายงาน
                        </div>
                        <div className="mt-2 text-2xl font-bold text-foreground">
                            {report.totals.items_count.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-muted-foreground">รายการ</div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                        <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                            <Warehouse className="h-3.5 w-3.5 text-indigo-500" />
                            ยอดคงเหลือคลังหลัก
                        </div>
                        <div className="mt-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                            {report.totals.total_wh_qty.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{whName}</div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                        <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                            <ArrowDownRight className="h-3.5 w-3.5 text-amber-500" />
                            ยอดเบิก/รับเข้าห้องยา
                        </div>
                        <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {report.totals.total_transferred.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-muted-foreground">โอนย้าย/รับเข้าในงวด</div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                        <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                            <Package className="h-3.5 w-3.5 text-teal-500" />
                            ยอดคงเหลือห้องยา
                        </div>
                        <div className="mt-2 text-2xl font-bold text-teal-600 dark:text-teal-400">
                            {report.totals.total_opd_qty.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{pharmName}</div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                        <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                            <TrendingDown className="h-3.5 w-3.5 text-purple-500" />
                            ยอด HOSxP ตัดจ่าย
                        </div>
                        <div className="mt-2 text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {report.totals.total_hosxp_dispensed.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-muted-foreground">ยอดตัดสุทธิ (หักคืนแล้ว)</div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                        <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                            <Truck className="h-3.5 w-3.5 text-rose-500" />
                            ยอดตัดออกหน่วย
                        </div>
                        <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
                            {report.totals.total_unit_issued.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-muted-foreground">จ่ายหน่วย/แผนกในงวด</div>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs">
                    {/* Quick Date Range Buttons */}
                    <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
                        <span className="text-xs font-semibold text-muted-foreground mr-1">เลือกช่วงเวลาด่วน:</span>
                        <Button
                            type="button"
                            size="sm"
                            variant={startDate === 'all' ? 'default' : 'outline'}
                            onClick={() => applyQuickDate('all')}
                            className="h-8 rounded-lg text-xs"
                        >
                            ทั้งหมด (All Time)
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={startDate !== 'all' && filters.start_date?.includes(new Date(Date.now() - 90 * 864e5).toISOString().split('T')[0]?.substring(0, 7)) ? 'secondary' : 'outline'}
                            onClick={() => applyQuickDate('90d')}
                            className="h-8 rounded-lg text-xs"
                        >
                            90 วันย้อนหลัง
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => applyQuickDate('30d')}
                            className="h-8 rounded-lg text-xs"
                        >
                            30 วันย้อนหลัง
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => applyQuickDate('month')}
                            className="h-8 rounded-lg text-xs"
                        >
                            เดือนนี้
                        </Button>
                        {startDate === 'all' && (
                            <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md font-medium">
                                กำลังแสดงข้อมูลประวัติทั้งหมด (ไม่จำกัดวันเริ่มต้น)
                            </span>
                        )}
                    </div>

                    <form onSubmit={handleSearch} className="flex flex-1 flex-wrap items-end gap-3 pt-1">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                ตั้งแต่วันที่
                            </label>
                            <ThaiDatePicker
                                label="ตั้งแต่วันที่"
                                value={startDate === 'all' ? '' : startDate}
                                onChange={(d) => setStartDate(d)}
                                placeholder={startDate === 'all' ? 'ทั้งหมด (All Time)' : undefined}
                                className="w-56"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                ถึงวันที่
                            </label>
                            <ThaiDatePicker
                                label="ถึงวันที่"
                                value={endDate}
                                onChange={setEndDate}
                                className="w-56"
                            />
                        </div>

                        <div className="flex-1 min-w-[220px]">
                            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                ค้นหาชื่อยา หรือรหัส icode
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="พิมพ์ค้นหา..."
                                    className="pl-9 rounded-xl h-10"
                                />
                            </div>
                        </div>

                        <Button type="submit" variant="secondary" className="rounded-xl h-10">
                            <Filter className="mr-1.5 h-4 w-4" />
                            กรองข้อมูล
                        </Button>

                        {(search || startDate !== filters.start_date || endDate !== filters.end_date) && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleReset}
                                className="rounded-xl h-10 text-muted-foreground"
                            >
                                <RotateCcw className="mr-1.5 h-4 w-4" />
                                ล้างตัวกรอง
                            </Button>
                        )}
                    </form>
                </div>

                {/* Report Table */}
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
                    <div className="overflow-x-auto max-h-[700px]">
                        <table className="min-w-full divide-y divide-border text-sm">
                            <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur text-left text-xs uppercase tracking-wider text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">รหัส icode</th>
                                    <th className="px-4 py-3 font-semibold">ชื่อยา / เวชภัณฑ์</th>
                                    <th className="px-4 py-3 font-semibold">หน่วย</th>
                                    <th className="px-4 py-3 font-semibold text-right text-indigo-700 dark:text-indigo-300">
                                        ยอดเหลือคลังหลัก ({whName})
                                    </th>
                                    <th className="px-4 py-3 font-semibold text-right text-amber-700 dark:text-amber-300">
                                        ยอดเบิก/รับเข้าห้องยา OPD
                                    </th>
                                    <th className="px-4 py-3 font-semibold text-right text-teal-700 dark:text-teal-300">
                                        ยอดคงเหลือห้องยา ({pharmName})
                                    </th>
                                    <th className="px-4 py-3 font-semibold text-right text-purple-700 dark:text-purple-300">
                                        <div>ยอด HOSxP ตัดจ่าย</div>
                                        <div className="text-[10px] font-normal opacity-80">(ยอดตัดสุทธิ)</div>
                                    </th>
                                    <th className="px-4 py-3 font-semibold text-right text-rose-700 dark:text-rose-300">
                                        ยอดตัดออกหน่วย
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-card">
                                {report.items.map((row) => (
                                    <tr key={row.id} className="transition-colors hover:bg-muted/30">
                                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                                            {row.icode}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-foreground">
                                                {row.name}
                                            </div>
                                            {row.strength && (
                                                <div className="text-xs text-muted-foreground">
                                                    ความแรง: {row.strength}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                            {row.unit}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                                            {row.wh_qty.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                                            {row.transferred_to_opd.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-bold text-teal-600 dark:text-teal-400 whitespace-nowrap">
                                            {row.opd_qty.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-semibold text-purple-600 dark:text-purple-400 whitespace-nowrap">
                                            {row.hosxp_dispensed.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                                            {row.unit_issued.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                                {report.items.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                                            ไม่พบข้อมูลยาตามเงื่อนไขที่ค้นหา
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {report.items.length > 0 && (
                                <tfoot className="sticky bottom-0 z-10 bg-muted/95 backdrop-blur font-bold text-foreground">
                                    <tr className="border-t-2 border-border">
                                        <td colSpan={3} className="px-4 py-3 text-right">
                                            รวมทั้งสิ้น ({report.totals.items_count.toLocaleString()} รายการ):
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-indigo-700 dark:text-indigo-300">
                                            {report.totals.total_wh_qty.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-amber-700 dark:text-amber-300">
                                            {report.totals.total_transferred.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-teal-700 dark:text-teal-300">
                                            {report.totals.total_opd_qty.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-purple-700 dark:text-purple-300">
                                            {report.totals.total_hosxp_dispensed.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-rose-700 dark:text-rose-300">
                                            {report.totals.total_unit_issued.toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
