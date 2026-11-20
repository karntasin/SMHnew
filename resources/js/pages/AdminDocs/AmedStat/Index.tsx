import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    FileSpreadsheet,
    Download,
    RefreshCw,
    Eye,
    Calendar,
    Building2,
    Database,
    CheckCircle2,
    Clock,
    AlertCircle,
    Archive,
    Sparkles,
    Filter,
} from 'lucide-react';
import axios from 'axios';
import { ThaiDatePicker, formatThaiDateFromIso, formatThaiDateRangeFromIso } from '@/components/ui/thai-date-picker';
import { ThaiDateRangePicker } from '@/components/date-range-picker';
import UnitManagementModal from './Components/UnitManagementModal';

interface ReportItem {
    form_id: string;
    num: number;
    code: string;
    title: string;
    category: 'core' | 'dental';
    status: 'unprocessed' | 'calculated' | 'saved';
    updated_at: string | null;
    has_data: boolean;
}

interface Props {
    reports: ReportItem[];
    yearBe: number;
    month: number;
    startDate?: string;
    endDate?: string;
    periodLabel?: string;
    isCustomRange?: boolean;
}

const MONTH_NAMES = [
    { id: 1, name: 'มกราคม' },
    { id: 2, name: 'กุมภาพันธ์' },
    { id: 3, name: 'มีนาคม' },
    { id: 4, name: 'เมษายน' },
    { id: 5, name: 'พฤษภาคม' },
    { id: 6, name: 'มิถุนายน' },
    { id: 7, name: 'กรกฎาคม' },
    { id: 8, name: 'สิงหาคม' },
    { id: 9, name: 'กันยายน' },
    { id: 10, name: 'ตุลาคม' },
    { id: 11, name: 'พฤศจิกายน' },
    { id: 12, name: 'ธันวาคม' },
];

export default function AmedStatIndex({
    reports,
    yearBe,
    month,
    startDate = '',
    endDate = '',
    periodLabel = '',
    isCustomRange = false,
}: Props) {
    const [dateMode, setDateMode] = useState<'monthly' | 'custom'>(isCustomRange ? 'custom' : 'monthly');
    const [selectedYear, setSelectedYear] = useState(yearBe);
    const [selectedMonth, setSelectedMonth] = useState(month);
    const [customStart, setCustomStart] = useState(startDate);
    const [customEnd, setCustomEnd] = useState(endDate);

    const [calculatingForm, setCalculatingForm] = useState<string | null>(null);
    const [isCalculatingAll, setIsCalculatingAll] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'core' | 'dental'>('all');
    const [unitModalOpen, setUnitModalOpen] = useState(false);

    const getQueryParams = () => {
        if (dateMode === 'custom' && customStart && customEnd) {
            return { start_date: customStart, end_date: customEnd };
        }
        return { year_be: selectedYear, month: selectedMonth };
    };

    const handleApplyFilter = () => {
        router.get(route('admin-docs.amedstat.index'), getQueryParams(), { preserveState: true });
    };

    const handleCalculate = async (formId: string) => {
        setCalculatingForm(formId);
        try {
            await axios.post(route('admin-docs.amedstat.calculate', { formId }), getQueryParams());
            router.reload({ only: ['reports'] });
        } catch (e) {
            alert('เกิดข้อผิดพลาดในการดึงข้อมูลจาก HOSxP');
        } finally {
            setCalculatingForm(null);
        }
    };

    const handleCalculateAll = async () => {
        const periodText = periodLabel || `เดือน ${MONTH_NAMES.find(m => m.id === selectedMonth)?.name} พ.ศ. ${selectedYear}`;
        if (!confirm(`คุณต้องการดึงและคำนวณข้อมูลสถิติทุกรายงาน (${periodText}) จาก HOSxP ใช่หรือไม่?`)) {
            return;
        }
        setIsCalculatingAll(true);
        try {
            const coreReports = reports.filter(r => r.category === 'core');
            for (const r of coreReports) {
                await axios.post(route('admin-docs.amedstat.calculate', { formId: r.form_id }), getQueryParams());
            }
            router.reload({ only: ['reports'] });
            alert('คำนวณข้อมูลครบทุกรายงานเรียบร้อยแล้ว');
        } catch (e) {
            alert('เกิดข้อผิดพลาดระหว่างการดึงข้อมูล');
        } finally {
            setIsCalculatingAll(false);
        }
    };

    const filteredReports = reports.filter(r => {
        if (activeTab === 'all') return true;
        return r.category === activeTab;
    });

    const statusBadge = (status: string, hasData: boolean) => {
        if (status === 'saved') {
            return (
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-[11px] font-normal shadow-sm">
                    <CheckCircle2 className="w-3 h-3" /> บันทึกเรียบร้อย
                </Badge>
            );
        }
        if (status === 'calculated' || hasData) {
            return (
                <Badge className="bg-blue-600 hover:bg-blue-700 text-white gap-1 text-[11px] font-normal shadow-sm">
                    <Sparkles className="w-3 h-3" /> คำนวณแล้ว (ยังไม่บันทึก)
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="text-gray-500 border-dashed border-gray-300 gap-1 text-[11px] font-normal">
                <Clock className="w-3 h-3" /> ยังไม่ประมวลผล
            </Badge>
        );
    };

    return (
        <AppLayout>
            <Head title="รายงาน AmedStat - ระบบบริหารจัดการโรงพยาบาล" />

            <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
                {/* Header Banner */}
                <div className="relative overflow-hidden bg-gradient-to-r from-emerald-800 via-teal-800 to-cyan-900 rounded-2xl p-6 md:p-8 text-white shadow-xl">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 text-emerald-200 text-xs font-medium">
                                <Database className="w-3.5 h-3.5" />
                                ระบบรายงานสถิติทางการแพทย์ กรมแพทย์ทหารบก (AMEDstat)
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                                รายงาน AmedStat
                            </h1>
                            <p className="text-emerald-100 text-sm max-w-2xl leading-relaxed">
                                ประมวลผลและส่งออกรายงานสถิติ รง.ผสต. 1–10 และ รง.ทพ. ตามแบบฟอร์มมาตรฐานของ พบ.ทบ. เชื่อมโยงฐานข้อมูล HOSxP พร้อมระบบจัดหมวดหมู่ประเภทบุคคล ก1–ค8
                            </p>
                            {periodLabel && (
                                <div className="pt-1 text-xs text-emerald-200 font-medium flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-emerald-300" />
                                    ช่วงเวลาที่เลือก: <span className="text-white font-bold underline underline-offset-2">{periodLabel}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <Button
                                onClick={() => setUnitModalOpen(true)}
                                variant="outline"
                                className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md gap-2"
                            >
                                <Building2 className="w-4 h-4" />
                                จัดการหน่วยรับการสนับสนุน
                            </Button>

                            <a
                                href={route('admin-docs.amedstat.export_all', getQueryParams())}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm shadow-lg shadow-emerald-950/20 transition-all"
                            >
                                <Archive className="w-4 h-4" />
                                ดาวน์โหลดชุดรวมทุกรายงาน (ZIP)
                            </a>
                        </div>
                    </div>
                </div>

                {/* Filter and Period Selector Card */}
                <Card className="border border-gray-200 shadow-sm bg-white rounded-xl">
                    <CardContent className="p-4 md:p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                            <div className="flex items-center gap-2">
                                <Filter className="w-5 h-5 text-emerald-700" />
                                <span className="font-bold text-gray-800 text-sm">เลือกรูปแบบระยะเวลารายงาน:</span>
                                <div className="inline-flex p-1 bg-gray-100 rounded-lg text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setDateMode('monthly')}
                                        className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                                            dateMode === 'monthly'
                                                ? 'bg-white text-emerald-800 shadow-sm'
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        รายเดือน/ปี พ.ศ.
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDateMode('custom')}
                                        className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                                            dateMode === 'custom'
                                                ? 'bg-white text-emerald-800 shadow-sm'
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        กำหนดช่วงวันที่เอง (Date Range)
                                    </button>
                                </div>
                            </div>

                            <Button
                                onClick={handleCalculateAll}
                                disabled={isCalculatingAll}
                                className="bg-emerald-700 hover:bg-emerald-800 text-white gap-2 text-xs shadow-sm"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isCalculatingAll ? 'animate-spin' : ''}`} />
                                {isCalculatingAll ? 'กำลังประมวลผลทั้งหมด...' : 'ประมวลผลดึง HOSxP ทุกรายงาน'}
                            </Button>
                        </div>

                        {/* Mode 1: Monthly */}
                        {dateMode === 'monthly' ? (
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-gray-500" />
                                    <span className="text-sm font-medium text-gray-700">ปี พ.ศ.:</span>
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                                    >
                                        {[2565, 2566, 2567, 2568, 2569, 2570, 2571, 2572].map((y) => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700">เดือน:</span>
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                                    >
                                        {MONTH_NAMES.map((m) => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <Button
                                    onClick={handleApplyFilter}
                                    variant="outline"
                                    className="border-emerald-700 text-emerald-800 hover:bg-emerald-50 text-xs"
                                >
                                    ค้นหาข้อมูล
                                </Button>
                            </div>
                        ) : (
                            /* Mode 2: Custom Date Range with Thai Calendar */
                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-700">ตั้งแต่วันที่:</span>
                                        <ThaiDatePicker
                                            value={customStart}
                                            onChange={(v) => setCustomStart(v)}
                                            placeholder="เลือกวันเริ่มต้น (พ.ศ.)"
                                            className="w-48 text-sm"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-700">ถึงวันที่:</span>
                                        <ThaiDatePicker
                                            value={customEnd}
                                            onChange={(v) => setCustomEnd(v)}
                                            placeholder="เลือกวันสิ้นสุด (พ.ศ.)"
                                            className="w-48 text-sm"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <ThaiDateRangePicker
                                            startDate={customStart}
                                            endDate={customEnd}
                                            onChange={(start, end) => {
                                                setCustomStart(start);
                                                setCustomEnd(end);
                                            }}
                                            placeholder="หรือเลือกช่วงสำเร็จรูป..."
                                            className="min-w-[200px]"
                                            showPresets={true}
                                            compact={true}
                                        />
                                    </div>

                                    <Button
                                        onClick={handleApplyFilter}
                                        className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-9 shadow-sm gap-1.5"
                                    >
                                        <Calendar className="w-3.5 h-3.5" />
                                        แสดงข้อมูลตามช่วงวันที่
                                    </Button>
                                </div>

                                {customStart && customEnd && (
                                    <div className="text-xs text-emerald-800 bg-emerald-50/80 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 border border-emerald-200">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        ช่วงวันที่ที่เลือก: <span className="font-bold">{formatThaiDateRangeFromIso(customStart, customEnd)}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Tabs for Category Filter */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-4 py-2 font-medium text-sm border-b-2 transition-all ${
                            activeTab === 'all'
                                ? 'border-emerald-600 text-emerald-700'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        รายงานทั้งหมด ({reports.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('core')}
                        className={`px-4 py-2 font-medium text-sm border-b-2 transition-all ${
                            activeTab === 'core'
                                ? 'border-emerald-600 text-emerald-700'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        สถิติผู้ป่วยและกำลังพล (รง.ผสต. 1–10) ({reports.filter(r => r.category === 'core').length})
                    </button>
                    <button
                        onClick={() => setActiveTab('dental')}
                        className={`px-4 py-2 font-medium text-sm border-b-2 transition-all ${
                            activeTab === 'dental'
                                ? 'border-emerald-600 text-emerald-700'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        งานทันตกรรม (รง.ทพ. 1–2) ({reports.filter(r => r.category === 'dental').length})
                    </button>
                </div>

                {/* Report Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredReports.map((r) => {
                        const isCalculatingThis = calculatingForm === r.form_id;

                        return (
                            <Card
                                key={r.form_id}
                                className="border border-gray-200 shadow-sm hover:shadow-md transition-all rounded-xl overflow-hidden flex flex-col justify-between bg-white group"
                            >
                                <CardContent className="p-5 space-y-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                                                    {r.num}
                                                </span>
                                                <span className="font-mono text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                                    {r.code}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-gray-900 text-base leading-snug group-hover:text-emerald-800 transition-colors">
                                                {r.title}
                                            </h3>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                                        <div>
                                            {statusBadge(r.status, r.has_data)}
                                        </div>
                                        {r.updated_at && (
                                            <span className="text-[11px] text-gray-400">
                                                อัปเดต: {r.updated_at}
                                            </span>
                                        )}
                                    </div>
                                </CardContent>

                                <div className="px-5 py-3 bg-gray-50/70 border-t flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <Link
                                            href={route('admin-docs.amedstat.show', {
                                                formId: r.form_id,
                                                ...getQueryParams(),
                                            })}
                                        >
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-xs gap-1.5 border-gray-300 hover:border-emerald-600 hover:text-emerald-700 bg-white"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                ดูข้อมูล / แก้ไข
                                            </Button>
                                        </Link>

                                        {r.category === 'core' && (
                                            <Button
                                                onClick={() => handleCalculate(r.form_id)}
                                                disabled={isCalculatingThis}
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-xs gap-1 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                title="ดึงข้อมูลคำนวณใหม่จาก HOSxP"
                                            >
                                                <RefreshCw className={`w-3.5 h-3.5 ${isCalculatingThis ? 'animate-spin' : ''}`} />
                                            </Button>
                                        )}
                                    </div>

                                    <a
                                        href={route('admin-docs.amedstat.export', {
                                            formId: r.form_id,
                                            ...getQueryParams(),
                                        })}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-sm transition-all"
                                        title="ส่งออกไฟล์ Excel ตามแบบฟอร์มต้นแบบ"
                                    >
                                        <FileSpreadsheet className="w-3.5 h-3.5" />
                                        Excel
                                    </a>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {/* Info Card */}
                <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl flex items-start gap-3 text-xs text-amber-900 leading-relaxed">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <span className="font-bold">หมายเหตุสำคัญ:</span> ข้อมูลผู้ป่วยและกำลังพลได้รับการจำแนกตามประเภทบุคคล ก1–ค8 โดยอ้างอิงจากรหัสประเภทสังกัดในตาราง <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-950 font-mono">patient_regiment</code> ร่วมกับข้อมูลสิทธิการรักษาของระบบ HOSxP และข้อมูลทั้งหมดได้รับการปกป้องตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)
                    </div>
                </div>
            </div>

            {/* Modal for unit management */}
            <UnitManagementModal
                open={unitModalOpen}
                onClose={() => setUnitModalOpen(false)}
            />
        </AppLayout>
    );
}
