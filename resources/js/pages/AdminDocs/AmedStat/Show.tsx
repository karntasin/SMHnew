import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    ArrowLeft,
    Download,
    RefreshCw,
    Save,
    FileSpreadsheet,
    Calendar,
    Building2,
    CheckCircle2,
    Sparkles,
    Search,
    Filter,
    Eye,
    EyeOff,
} from 'lucide-react';
import axios from 'axios';
import { formatThaiDateRangeFromIso } from '@/components/ui/thai-date-picker';
import UnitManagementModal from './Components/UnitManagementModal';

interface ReportDefinition {
    num: number;
    code: string;
    title: string;
    category: 'core' | 'dental';
}

interface Props {
    formId: string;
    reportDefinition: ReportDefinition;
    reportData: any;
    yearBe: number;
    month: number;
    startDate?: string;
    endDate?: string;
    periodLabel?: string;
    isCustomRange?: boolean;
    status: string;
    lastUpdated: string | null;
}

const MONTH_NAMES: { [key: number]: string } = {
    1: 'มกราคม', 2: 'กุมภาพันธ์', 3: 'มีนาคม', 4: 'เมษายน',
    5: 'พฤษภาคม', 6: 'มิถุนายน', 7: 'กรกฎาคม', 8: 'สิงหาคม',
    9: 'กันยายน', 10: 'ตุลาคม', 11: 'พฤศจิกายน', 12: 'ธันวาคม',
};

export default function AmedStatShow({
    formId,
    reportDefinition,
    reportData: initialData,
    yearBe,
    month,
    startDate = '',
    endDate = '',
    periodLabel = '',
    isCustomRange = false,
    status: initialStatus,
    lastUpdated: initialLastUpdated,
}: Props) {
    const [data, setData] = useState<any>(initialData || {});
    const [isSaving, setIsSaving] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);
    const [currentStatus, setCurrentStatus] = useState(initialStatus);
    const [currentLastUpdated, setCurrentLastUpdated] = useState(initialLastUpdated);
    const [a0105Search, setA0105Search] = useState('');
    const [a0105HideZero, setA0105HideZero] = useState(false);
    const [unitModalOpen, setUnitModalOpen] = useState(false);

    const getQueryParams = () => {
        if (isCustomRange && startDate && endDate) {
            return { start_date: startDate, end_date: endDate };
        }
        return { year_be: yearBe, month: month };
    };

    const monthName = MONTH_NAMES[month] || String(month);

    // Save manual modifications to backend
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await axios.post(route('admin-docs.amedstat.save', { formId }), {
                ...getQueryParams(),
                data: data,
            });
            setCurrentStatus('saved');
            if (res.data.updated_at) {
                setCurrentLastUpdated(res.data.updated_at);
            }
            alert('บันทึกข้อมูลเรียบร้อยแล้ว');
        } catch (e) {
            alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        } finally {
            setIsSaving(false);
        }
    };

    // Live re-calculate from HOSxP
    const handleCalculate = async () => {
        if (!confirm('คุณต้องการดึงข้อมูลล่าสุดจาก HOSxP และคำนวณใหม่ใช่หรือไม่? (การแก้ไขที่ยังไม่ได้บันทึกจะถูกแทนที่)')) {
            return;
        }
        setIsCalculating(true);
        try {
            const res = await axios.post(route('admin-docs.amedstat.calculate', { formId }), getQueryParams());
            setData(res.data.data);
            setCurrentStatus('calculated');
            if (res.data.updated_at) {
                setCurrentLastUpdated(res.data.updated_at);
            }
            alert('ดึงข้อมูลจาก HOSxP สำเร็จ');
        } catch (e) {
            alert('เกิดข้อผิดพลาดในการคำนวณจาก HOSxP');
        } finally {
            setIsCalculating(false);
        }
    };

    // Update row value in A0101
    const updateA0101Row = (key: string, field: string, val: number) => {
        const rows = { ...(data.rows || {}) };
        if (rows[key]) {
            rows[key] = {
                ...rows[key],
                [field]: val,
            };
            if (field === 'ipd_brought' || field === 'ipd_new') {
                rows[key].ipd_total = (rows[key].ipd_brought || 0) + (rows[key].ipd_new || 0);
            }
        }
        setData({ ...data, rows });
    };

    // Update row value in A0109
    const updateA0109Row = (key: string, field: string, val: number) => {
        const rows = { ...(data.rows || {}) };
        if (rows[key]) {
            rows[key] = {
                ...rows[key],
                [field]: val,
            };
        }
        setData({ ...data, rows });
    };

    // Update row value in A0110
    const updateA0110Count = (index: number, val: number) => {
        const items = [...(data.items || [])];
        if (items[index]) {
            items[index] = { ...items[index], count: val };
        }
        setData({ ...data, items });
    };

    // Update cell value in A0105 (18 columns ก1..ค8)
    const updateA0105Cell = (index: number, colKey: string, val: number) => {
        const next = { ...data };
        const items = [...(next.items || [])];
        if (items[index]) {
            items[index] = { ...items[index], [colKey]: val };
            const regKeys = ['g1', 'g2', 'g3', 'g4', 'g5', 'k1', 'k2', 'k3', 'k4', 'k5', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'];
            let rowTotal = 0;
            regKeys.forEach((k) => {
                rowTotal += (parseInt(items[index][k]) || 0);
            });
            items[index].total = rowTotal;
            next.items = items;
            setData(next);
        }
    };

    // Update cell value in A0106 (13 columns ก1..ค4)
    const updateA0106Cell = (index: number, colKey: string, val: number) => {
        const next = { ...data };
        const items = [...(next.items || [])];
        if (items[index]) {
            items[index] = { ...items[index], [colKey]: val };
            const colKeys = ['g1', 'g2', 'g3', 'g4', 'g5', 'k1', 'k2', 'k3', 'k4', 'k5', 'c1', 'c3', 'c4'];
            let rowTot = 0;
            colKeys.forEach((k) => {
                rowTot += (parseInt(items[index][k]) || 0);
            });
            items[index].total = rowTot;
            next.items = items;
            setData(next);
        }
    };

    // Update cell value in E0101 (Manual dental entry)
    const updateE0101Cell = (index: number, field: 'service_count' | 'qty', val: number) => {
        const next = { ...data };
        const items = [...(next.items || [])];
        if (items[index]) {
            items[index] = { ...items[index], [field]: val };
            next.items = items;
            // update totals
            let totServices = 0;
            let totQty = 0;
            items.forEach((it: any) => {
                totServices += (parseInt(it.service_count) || 0);
                totQty += (parseInt(it.qty) || 0);
            });
            next.total_services = totServices;
            next.total_qty = totQty;
            setData(next);
        }
    };

    return (
        <AppLayout>
            <Head title={`${reportDefinition.code} ${reportDefinition.title} - AMEDstat`} />

            <div className="max-w-7xl mx-auto space-y-5">
                {/* Top Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs">
                    <div className="flex items-center gap-3">
                        <Link href={route('admin-docs.amedstat.index', getQueryParams())}>
                            <Button variant="outline" size="sm" className="h-8 gap-1 text-gray-700">
                                <ArrowLeft className="w-3.5 h-3.5" /> กลับ
                            </Button>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-emerald-800 text-sm font-mono">{reportDefinition.code}</span>
                                <span className="text-gray-400">|</span>
                                <h1 className="text-sm font-bold text-gray-900">{reportDefinition.title}</h1>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{periodLabel || (startDate && endDate ? formatThaiDateRangeFromIso(startDate, endDate) : `ประจำเดือน ${monthName} พ.ศ. ${yearBe}`)}</span>
                                {currentLastUpdated && (
                                    <>
                                        <span className="text-gray-300">•</span>
                                        <span>อัปเดต: {currentLastUpdated}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isCalculating}
                            onClick={handleCalculate}
                            className="h-8 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isCalculating ? 'animate-spin' : ''}`} />
                            {isCalculating ? 'กำลังดึง...' : 'ดึง HOSxP ใหม่'}
                        </Button>

                        <Button
                            size="sm"
                            disabled={isSaving}
                            onClick={handleSave}
                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            <Save className="w-3.5 h-3.5 mr-1" />
                            {isSaving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                        </Button>

                        <a
                            href={route('admin-docs.amedstat.export', { formId, ...getQueryParams() })}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <Button size="sm" className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold shadow-xs">
                                <Download className="w-3.5 h-3.5 mr-1" /> ส่งออก Excel
                            </Button>
                        </a>
                    </div>
                </div>

                {/* Form Content Rendering */}
                <Card className="border border-gray-200/80 shadow-sm overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-emerald-50/50 to-teal-50/30 border-b border-gray-200/80 py-3 px-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                {reportDefinition.title} ({reportDefinition.code})
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">หน่วยงาน :</span>
                                <Badge variant="outline" className="bg-white text-gray-800 font-semibold text-xs border-gray-300">
                                    โรงพยาบาลค่ายสุรสิงหนาท (รหัส 108)
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        {/* 1. Form A0101 (รง.ผสต.1) */}
                        {formId === 'A0101' && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead className="bg-gray-100 text-gray-700 font-bold border-b text-center">
                                        <tr>
                                            <th rowSpan={2} colSpan={2} className="p-2 border-r text-left">ประเภทบุคคล</th>
                                            <th colSpan={2} className="p-2 border-r bg-emerald-50/50">ผู้ป่วยนอก (OPD)</th>
                                            <th colSpan={5} className="p-2 bg-blue-50/50">ผู้ป่วยใน (IPD)</th>
                                        </tr>
                                        <tr className="border-t">
                                            <th className="p-2 border-r w-24 bg-emerald-50/30">รายใหม่(คน)</th>
                                            <th className="p-2 border-r w-24 bg-emerald-50/30">จำนวน(ครั้ง)</th>
                                            <th className="p-2 border-r w-20 bg-blue-50/30">ยอดยกมา</th>
                                            <th className="p-2 border-r w-20 bg-blue-50/30">รับใหม่</th>
                                            <th className="p-2 border-r w-20 font-bold bg-blue-50/50">รวม</th>
                                            <th className="p-2 border-r w-20 bg-blue-50/30">จำหน่าย</th>
                                            <th className="p-2 w-20 bg-blue-50/30">วันรักษา</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y text-gray-800">
                                        {renderA0101Rows(data.rows || {}, updateA0101Row)}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* 2. Form A0102 (รง.ผสต.2) */}
                        {formId === 'A0102' && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead className="bg-gray-100 text-gray-700 font-bold border-b text-center">
                                        <tr>
                                            <th rowSpan={2} className="p-2 border-r w-12">ลำดับ</th>
                                            <th rowSpan={2} className="p-2 border-r w-24">ประเภทบุคคล</th>
                                            <th rowSpan={2} className="p-2 border-r w-28">รหัสโรคที่ 1</th>
                                            <th rowSpan={2} className="p-2 border-r w-28">รหัสโรคที่ 2</th>
                                            <th colSpan={3} className="p-2 border-r bg-blue-50/50">รับผู้ป่วยใน</th>
                                            <th colSpan={4} className="p-2 bg-amber-50/50">จำหน่าย</th>
                                        </tr>
                                        <tr className="border-t">
                                            <th className="p-2 border-r w-20">ยกมา</th>
                                            <th className="p-2 border-r w-20">รับใหม่</th>
                                            <th className="p-2 border-r w-20 font-bold bg-blue-50/30">รวม</th>
                                            <th className="p-2 border-r w-20">ปลดพิการ</th>
                                            <th className="p-2 border-r w-20">ตาย</th>
                                            <th className="p-2 border-r w-20">อื่นๆ</th>
                                            <th className="p-2 w-20 font-bold bg-amber-50/30">รวมจำหน่าย</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y text-gray-800">
                                        {(data.items || []).length === 0 ? (
                                            <tr>
                                                <td colSpan={11} className="p-8 text-center text-gray-500">ไม่มีข้อมูลผู้ป่วยในในงวดเดือนนี้</td>
                                            </tr>
                                        ) : (
                                            data.items.map((it: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="p-2 border-r text-center">{idx + 1}</td>
                                                    <td className="p-2 border-r font-mono">{it.category}</td>
                                                    <td className="p-2 border-r font-mono font-semibold">{it.icd10_1}</td>
                                                    <td className="p-2 border-r font-mono text-gray-500">{it.icd10_2 || '-'}</td>
                                                    <td className="p-2 border-r text-right">{it.brought_forward}</td>
                                                    <td className="p-2 border-r text-right">{it.new_admit}</td>
                                                    <td className="p-2 border-r text-right font-bold bg-blue-50/20">{it.total}</td>
                                                    <td className="p-2 border-r text-right">{it.dis_disability}</td>
                                                    <td className="p-2 border-r text-right text-red-600">{it.dis_death}</td>
                                                    <td className="p-2 border-r text-right">{it.dis_other}</td>
                                                    <td className="p-2 text-right font-bold bg-amber-50/20">{it.dis_total}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* 3. Form A0103 (รง.ผสต.3) */}
                        {formId === 'A0103' && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead className="bg-gray-100 text-gray-700 font-bold border-b">
                                        <tr>
                                            <th className="p-2.5 border-r text-center w-12">ลำดับ</th>
                                            <th className="p-2.5 border-r w-40">ชื่อ - สกุล ผู้ป่วย</th>
                                            <th className="p-2.5 border-r w-24">ประเภทบุคคล</th>
                                            <th className="p-2.5 border-r w-28">หน่วยสังกัด</th>
                                            <th className="p-2.5 border-r">โรคที่ปลดพิการ</th>
                                            <th className="p-2.5 border-r w-20 font-mono">ICD-10</th>
                                            <th className="p-2.5 border-r w-24">กฎกระทรวง</th>
                                            <th className="p-2.5 border-r w-24">วันปลดพิการ</th>
                                            <th className="p-2.5">แพทย์ผู้ลงความเห็น</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y text-gray-800">
                                        {(data.items || []).length === 0 ? (
                                            <tr>
                                                <td colSpan={9} className="p-8 text-center text-gray-500">
                                                    ในงวดเดือนนี้ไม่มีผู้ป่วยจำหน่ายปลดพิการ
                                                </td>
                                            </tr>
                                        ) : (
                                            data.items.map((it: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="p-2 border-r text-center">{idx + 1}</td>
                                                    <td className="p-2 border-r font-medium">{it.name}</td>
                                                    <td className="p-2 border-r font-mono">{it.category}</td>
                                                    <td className="p-2 border-r">{it.unit}</td>
                                                    <td className="p-2 border-r">{it.disease_name}</td>
                                                    <td className="p-2 border-r font-mono">{it.icd10}</td>
                                                    <td className="p-2 border-r">{it.law_rule}</td>
                                                    <td className="p-2 border-r text-center">{it.discharge_date}</td>
                                                    <td className="p-2 text-gray-600">{it.doctor1}, {it.doctor2}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* 4. Form A0104 (รง.ผสต.4) */}
                        {formId === 'A0104' && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead className="bg-gray-100 text-gray-700 font-bold border-b">
                                        <tr>
                                            <th className="p-2.5 border-r text-center w-12">ลำดับ</th>
                                            <th className="p-2.5 border-r w-16">คำนำหน้า</th>
                                            <th className="p-2.5 border-r w-24 font-mono">HN</th>
                                            <th className="p-2.5 border-r w-24 font-mono">AN</th>
                                            <th className="p-2.5 border-r w-24">ประเภทบุคคล</th>
                                            <th className="p-2.5 border-r text-center w-16">อายุ(ปี)</th>
                                            <th className="p-2.5 border-r">สาเหตุการตาย</th>
                                            <th className="p-2.5 border-r w-24 font-mono">ICD-10 (หลัก)</th>
                                            <th className="p-2.5 border-r w-24 font-mono">ICD-10 (รอง)</th>
                                            <th className="p-2.5 w-28 text-center">วันที่เสียชีวิต</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y text-gray-800">
                                        {(data.items || []).length === 0 ? (
                                            <tr>
                                                <td colSpan={10} className="p-8 text-center text-gray-500">
                                                    ในงวดเดือนนี้ไม่มีผู้ป่วยในเสียชีวิต
                                                </td>
                                            </tr>
                                        ) : (
                                            data.items.map((it: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="p-2 border-r text-center">{idx + 1}</td>
                                                    <td className="p-2 border-r">{it.pname}</td>
                                                    <td className="p-2 border-r font-mono">{it.hn}</td>
                                                    <td className="p-2 border-r font-mono">{it.an}</td>
                                                    <td className="p-2 border-r font-mono">{it.category}</td>
                                                    <td className="p-2 border-r text-center">{it.age_year}</td>
                                                    <td className="p-2 border-r text-red-700 font-medium">{it.disease_name}</td>
                                                    <td className="p-2 border-r font-mono font-semibold">{it.icd10_1}</td>
                                                    <td className="p-2 border-r font-mono text-gray-500">{it.icd10_2 || '-'}</td>
                                                    <td className="p-2 text-center text-gray-600">{it.death_date}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* 5. Form A0105 (รง.ผสต.5) */}
                        {formId === 'A0105' && (
                            <div className="space-y-4">
                                {/* Search and Filter Toolbar */}
                                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                                    <div className="flex items-center gap-3 flex-1 min-w-[260px]">
                                        <div className="relative flex-1 max-w-md">
                                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                                            <Input
                                                placeholder="ค้นหารหัสโรค (เช่น 001, A00) หรือชื่อโรค..."
                                                value={a0105Search}
                                                onChange={(e) => setA0105Search(e.target.value)}
                                                className="pl-9 h-9 text-xs bg-white"
                                            />
                                        </div>
                                        <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={a0105HideZero}
                                                onChange={(e) => setA0105HideZero(e.target.checked)}
                                                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                            />
                                            <span>ซ่อนกลุ่มโรคที่ยอดเป็น 0</span>
                                        </label>
                                    </div>
                                    <div className="text-xs text-gray-500 font-medium">
                                        รวมทั้งสิ้น 308 กลุ่มโรค
                                    </div>
                                </div>

                                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-xs">
                                    <table className="w-full text-[11px] text-left border-collapse min-w-[1200px]">
                                        <thead className="bg-gray-100 text-gray-800 font-bold border-b text-center sticky top-0 z-10">
                                            <tr>
                                                <th rowSpan={2} className="p-2 border-r w-14 bg-gray-200/80">รหัส</th>
                                                <th rowSpan={2} className="p-2 border-r text-left min-w-[260px] bg-gray-200/80">สาเหตุการป่วย (โรค/กลุ่มโรค)</th>
                                                <th colSpan={5} className="p-1.5 border-r bg-emerald-100/70 text-emerald-950 font-bold border-b">
                                                    ก. กำลังพลประจำการ ทบ.
                                                </th>
                                                <th colSpan={5} className="p-1.5 border-r bg-blue-100/70 text-blue-950 font-bold border-b">
                                                    ข. กองประจำการ / นร.ทหาร
                                                </th>
                                                <th colSpan={8} className="p-1.5 border-r bg-amber-100/70 text-amber-950 font-bold border-b">
                                                    ค. ครอบครัว / ประชาชน / สิทธิอื่น
                                                </th>
                                                <th rowSpan={2} className="p-2 w-20 bg-gray-300/80 font-bold">รวม</th>
                                            </tr>
                                            <tr className="text-[10px] bg-gray-50">
                                                {/* ก1-ก5 */}
                                                <th className="p-1 border-r w-11 bg-emerald-50/70" title="ก1 นายทหารประจำการ">ก1</th>
                                                <th className="p-1 border-r w-11 bg-emerald-50/70" title="ก2 นายสิบ/พลทหารประจำการ">ก2</th>
                                                <th className="p-1 border-r w-11 bg-emerald-50/70" title="ก3 ขรก.กลาโหม">ก3</th>
                                                <th className="p-1 border-r w-11 bg-emerald-50/70" title="ก4 ลูกจ้างประจำ">ก4</th>
                                                <th className="p-1 border-r w-11 bg-emerald-50/70" title="ก5 ลูกจ้างชั่วคราว">ก5</th>
                                                {/* ข1-ข5 */}
                                                <th className="p-1 border-r w-11 bg-blue-50/70" title="ข1 พลทหารกองประจำการ">ข1</th>
                                                <th className="p-1 border-r w-11 bg-blue-50/70" title="ข2 นักเรียนทหาร">ข2</th>
                                                <th className="p-1 border-r w-11 bg-blue-50/70" title="ข3 อส.ทหารพราน">ข3</th>
                                                <th className="p-1 border-r w-11 bg-blue-50/70" title="ข4 นักโทษทหาร">ข4</th>
                                                <th className="p-1 border-r w-11 bg-blue-50/70" title="ข5 พนักงานราชการ">ข5</th>
                                                {/* ค1-ค8 */}
                                                <th className="p-1 border-r w-11 bg-amber-50/70" title="ค1 ครอบครัวทหาร">ค1</th>
                                                <th className="p-1 border-r w-11 bg-amber-50/70" title="ค2 ทหารนอกประจำการ">ค2</th>
                                                <th className="p-1 border-r w-11 bg-amber-50/70" title="ค3 นศท.(รด.)">ค3</th>
                                                <th className="p-1 border-r w-11 bg-amber-50/70" title="ค4 วิวัฒน์พลเมือง">ค4</th>
                                                <th className="p-1 border-r w-11 bg-amber-50/70" title="ค5 ประกันสังคม">ค5</th>
                                                <th className="p-1 border-r w-11 bg-amber-50/70" title="ค6 ประกันสุขภาพ 30 บาท">ค6</th>
                                                <th className="p-1 border-r w-11 bg-amber-50/70" title="ค7 ขรก.พลเรือน">ค7</th>
                                                <th className="p-1 border-r w-11 bg-amber-50/70" title="ค8 อื่นๆ / สิทธิ์ว่าง">ค8</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {(data.items || [])
                                                .filter((it: any) => {
                                                    if (a0105HideZero && (it.total || 0) === 0) return false;
                                                    if (!a0105Search) return true;
                                                    const s = a0105Search.toLowerCase();
                                                    return (
                                                        (it.code && it.code.toLowerCase().includes(s)) ||
                                                        (it.name_en && it.name_en.toLowerCase().includes(s)) ||
                                                        (it.name_th && it.name_th.toLowerCase().includes(s))
                                                    );
                                                })
                                                .map((it: any, idx: number) => (
                                                    <tr key={it.code || idx} className="hover:bg-gray-50/80 transition-colors">
                                                        <td className="p-1.5 border-r text-center font-bold font-mono text-gray-700 bg-gray-50/50">
                                                            {it.code}
                                                        </td>
                                                        <td className="p-1.5 border-r">
                                                            <div className="font-medium text-gray-900 leading-tight">{it.name_en}</div>
                                                            {it.name_th && <div className="text-[10px] text-gray-500 mt-0.5">{it.name_th}</div>}
                                                        </td>
                                                        {/* ก1-ก5 */}
                                                        {['g1', 'g2', 'g3', 'g4', 'g5'].map((k) => (
                                                            <td key={k} className="p-0.5 border-r text-center bg-emerald-50/20">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    value={it[k] || 0}
                                                                    onChange={(e) => updateA0105Cell(idx, k, parseInt(e.target.value) || 0)}
                                                                    className="w-full text-center text-[11px] h-6 border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded"
                                                                />
                                                            </td>
                                                        ))}
                                                        {/* ข1-ข5 */}
                                                        {['k1', 'k2', 'k3', 'k4', 'k5'].map((k) => (
                                                            <td key={k} className="p-0.5 border-r text-center bg-blue-50/20">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    value={it[k] || 0}
                                                                    onChange={(e) => updateA0105Cell(idx, k, parseInt(e.target.value) || 0)}
                                                                    className="w-full text-center text-[11px] h-6 border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-blue-500 rounded"
                                                                />
                                                            </td>
                                                        ))}
                                                        {/* ค1-ค8 */}
                                                        {['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'].map((k) => (
                                                            <td key={k} className="p-0.5 border-r text-center bg-amber-50/20">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    value={it[k] || 0}
                                                                    onChange={(e) => updateA0105Cell(idx, k, parseInt(e.target.value) || 0)}
                                                                    className="w-full text-center text-[11px] h-6 border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-amber-500 rounded"
                                                                />
                                                            </td>
                                                        ))}
                                                        <td className="p-1.5 text-right font-bold font-mono text-gray-900 bg-gray-100/60">
                                                            {(it.total || 0).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                        <tfoot className="bg-gray-100 font-bold text-gray-900 border-t sticky bottom-0 z-10 text-center">
                                            <tr>
                                                <td colSpan={2} className="p-2 border-r text-right font-bold">รวมทั้งสิ้น:</td>
                                                {['g1', 'g2', 'g3', 'g4', 'g5'].map((k) => {
                                                    const colSum = (data.items || []).reduce((acc: number, it: any) => acc + (parseInt(it[k]) || 0), 0);
                                                    return <td key={k} className="p-1.5 border-r bg-emerald-100/50">{colSum.toLocaleString()}</td>;
                                                })}
                                                {['k1', 'k2', 'k3', 'k4', 'k5'].map((k) => {
                                                    const colSum = (data.items || []).reduce((acc: number, it: any) => acc + (parseInt(it[k]) || 0), 0);
                                                    return <td key={k} className="p-1.5 border-r bg-blue-100/50">{colSum.toLocaleString()}</td>;
                                                })}
                                                {['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'].map((k) => {
                                                    const colSum = (data.items || []).reduce((acc: number, it: any) => acc + (parseInt(it[k]) || 0), 0);
                                                    return <td key={k} className="p-1.5 border-r bg-amber-100/50">{colSum.toLocaleString()}</td>;
                                                })}
                                                <td className="p-1.5 bg-gray-300 font-bold text-emerald-950 font-mono">
                                                    {(data.items || []).reduce((acc: number, it: any) => acc + (parseInt(it.total) || 0), 0).toLocaleString()}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* 6. Form A0106 (รง.ผสต.6) - บัญชียอดกำลังพลซึ่งต้องสนับสนุนบริการแพทย์ (13 ประเภทบุคคลย่อย) */}
                        {formId === 'A0106' && (
                            <div className="space-y-4">
                                <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-emerald-950 text-sm">บัญชียอดกำลังพลซึ่งต้องสนับสนุนบริการแพทย์ (รง.ผสต.6)</span>
                                            <Badge variant="outline" className="bg-emerald-100/60 text-emerald-800 border-emerald-300 text-[10px]">
                                                13 ประเภทบุคคลย่อย
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-emerald-800 leading-relaxed">
                                            รวบรวมยอดกำลังพลของหน่วยทหารในพื้นที่รับผิดชอบ จ.สระแก้ว ตามคู่มือข้อ ๖.๕ (นับปีละ 2 ครั้ง: ต.ค. และ เม.ย. ของปีงบประมาณ ไม่นับรวมทหารนอกประจำการ) สามารถคีย์แก้ไขยอดได้โดยตรง
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setUnitModalOpen(true)}
                                            className="h-8 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-100 bg-white gap-1"
                                        >
                                            <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                                            จัดการรายชื่อหน่วย
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            disabled={isSaving}
                                            onClick={handleSave}
                                            className="h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white gap-1 shadow-sm"
                                        >
                                            <Save className="w-3.5 h-3.5" />
                                            {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลกำลังพล'}
                                        </Button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-xs bg-white">
                                    <table className="w-full text-[11px] text-left border-collapse min-w-[1100px]">
                                        <thead className="bg-gray-100 text-gray-800 font-bold border-b text-center sticky top-0 z-10">
                                            <tr>
                                                <th rowSpan={2} className="p-2 border-r w-12 bg-gray-200/80">ลำดับ</th>
                                                <th rowSpan={2} className="p-2 border-r text-left min-w-[180px] bg-gray-200/80">หน่วยรับการสนับสนุน</th>
                                                <th colSpan={5} className="p-1.5 border-r bg-emerald-100/70 text-emerald-950 font-bold border-b">
                                                    กลุ่ม ก. กำลังพลประจำการ ทบ.
                                                </th>
                                                <th colSpan={5} className="p-1.5 border-r bg-blue-100/70 text-blue-950 font-bold border-b">
                                                    กลุ่ม ข. กองประจำการ / นร.ทหาร
                                                </th>
                                                <th colSpan={3} className="p-1.5 border-r bg-amber-100/70 text-amber-950 font-bold border-b">
                                                    กลุ่ม ค. ครอบครัว / รด. / วิวัฒน์
                                                </th>
                                                <th rowSpan={2} className="p-2 w-20 bg-gray-300/80 font-bold">รวม</th>
                                            </tr>
                                            <tr className="text-[10px] bg-gray-50">
                                                {/* ก1-ก5 */}
                                                <th className="p-1 border-r w-14 bg-emerald-50/70" title="ก1 นายทหารประจำการ">ก1</th>
                                                <th className="p-1 border-r w-14 bg-emerald-50/70" title="ก2 นายสิบ/พลทหารประจำการ">ก2</th>
                                                <th className="p-1 border-r w-14 bg-emerald-50/70" title="ก3 ข้าราชการกลาโหมพลเรือน">ก3</th>
                                                <th className="p-1 border-r w-14 bg-emerald-50/70" title="ก4 ลูกจ้างประจำ">ก4</th>
                                                <th className="p-1 border-r w-14 bg-emerald-50/70" title="ก5 ลูกจ้างชั่วคราว">ก5</th>
                                                {/* ข1-ข5 */}
                                                <th className="p-1 border-r w-14 bg-blue-50/70" title="ข1 นายสิบ/พลทหารกองประจำการ">ข1</th>
                                                <th className="p-1 border-r w-14 bg-blue-50/70" title="ข2 นักเรียนทหาร">ข2</th>
                                                <th className="p-1 border-r w-14 bg-blue-50/70" title="ข3 อาสาสมัครทหารพราน">ข3</th>
                                                <th className="p-1 border-r w-14 bg-blue-50/70" title="ข4 นักโทษทหาร">ข4</th>
                                                <th className="p-1 border-r w-14 bg-blue-50/70" title="ข5 พนักงานราชการ">ข5</th>
                                                {/* ค1, ค3, ค4 */}
                                                <th className="p-1 border-r w-14 bg-amber-50/70" title="ค1 ครอบครัวทหาร">ค1</th>
                                                <th className="p-1 border-r w-14 bg-amber-50/70" title="ค3 นักศึกษาวิชาทหาร (รด.)">ค3</th>
                                                <th className="p-1 border-r w-14 bg-amber-50/70" title="ค4 ผู้เข้าร่วมโครงการวิวัฒน์พลเมือง">ค4</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {(data.items || []).map((it: any, idx: number) => (
                                                <tr key={it.id || idx} className="hover:bg-gray-50/80 transition-colors">
                                                    <td className="p-2 border-r text-center font-bold text-gray-500 bg-gray-50/40">
                                                        {idx + 1}
                                                    </td>
                                                    <td className="p-2 border-r">
                                                        <div className="font-bold text-gray-900">{it.unit_name}</div>
                                                        {it.location && <div className="text-[10px] text-gray-400">{it.location}</div>}
                                                    </td>
                                                    {/* ก1-ก5 Inputs */}
                                                    {['g1', 'g2', 'g3', 'g4', 'g5'].map((k) => (
                                                        <td key={k} className="p-1 border-r text-center bg-emerald-50/15">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={it[k] || 0}
                                                                onChange={(e) => updateA0106Cell(idx, k, parseInt(e.target.value) || 0)}
                                                                className="w-full text-center text-[11px] h-7 border border-gray-200 bg-white focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded font-mono"
                                                            />
                                                        </td>
                                                    ))}
                                                    {/* ข1-ข5 Inputs */}
                                                    {['k1', 'k2', 'k3', 'k4', 'k5'].map((k) => (
                                                        <td key={k} className="p-1 border-r text-center bg-blue-50/15">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={it[k] || 0}
                                                                onChange={(e) => updateA0106Cell(idx, k, parseInt(e.target.value) || 0)}
                                                                className="w-full text-center text-[11px] h-7 border border-gray-200 bg-white focus:bg-white focus:ring-1 focus:ring-blue-500 rounded font-mono"
                                                            />
                                                        </td>
                                                    ))}
                                                    {/* ค1, ค3, ค4 Inputs */}
                                                    {['c1', 'c3', 'c4'].map((k) => (
                                                        <td key={k} className="p-1 border-r text-center bg-amber-50/15">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={it[k] || 0}
                                                                onChange={(e) => updateA0106Cell(idx, k, parseInt(e.target.value) || 0)}
                                                                className="w-full text-center text-[11px] h-7 border border-gray-200 bg-white focus:bg-white focus:ring-1 focus:ring-amber-500 rounded font-mono"
                                                            />
                                                        </td>
                                                    ))}
                                                    <td className="p-2 text-right font-bold font-mono text-emerald-950 bg-emerald-100/50">
                                                        {(it.total || 0).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-100 font-bold text-gray-900 border-t sticky bottom-0 z-10 text-center">
                                            <tr>
                                                <td colSpan={2} className="p-2 border-r text-right font-bold text-xs">รวมทั้งสิ้น:</td>
                                                {['g1', 'g2', 'g3', 'g4', 'g5'].map((k) => {
                                                    const colSum = (data.items || []).reduce((acc: number, it: any) => acc + (parseInt(it[k]) || 0), 0);
                                                    return <td key={k} className="p-1.5 border-r bg-emerald-100/60 font-mono">{colSum.toLocaleString()}</td>;
                                                })}
                                                {['k1', 'k2', 'k3', 'k4', 'k5'].map((k) => {
                                                    const colSum = (data.items || []).reduce((acc: number, it: any) => acc + (parseInt(it[k]) || 0), 0);
                                                    return <td key={k} className="p-1.5 border-r bg-blue-100/60 font-mono">{colSum.toLocaleString()}</td>;
                                                })}
                                                {['c1', 'c3', 'c4'].map((k) => {
                                                    const colSum = (data.items || []).reduce((acc: number, it: any) => acc + (parseInt(it[k]) || 0), 0);
                                                    return <td key={k} className="p-1.5 border-r bg-amber-100/60 font-mono">{colSum.toLocaleString()}</td>;
                                                })}
                                                <td className="p-2 bg-gray-300 font-bold text-emerald-950 font-mono text-xs">
                                                    {(data.items || []).reduce((acc: number, it: any) => acc + (parseInt(it.total) || 0), 0).toLocaleString()}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* 7. Form A0108 (รง.ผสต.8) */}
                        {formId === 'A0108' && (
                            <div className="p-6 max-w-3xl mx-auto space-y-4">
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                                    <span className="font-bold">หมายเหตุ:</span> รายงานนี้เป็นตัวชี้วัด (KPI) สรุปยอดรวมตรงกับรายงาน รง.ผสต.1
                                </div>
                                <table className="w-full text-xs text-left border rounded-lg overflow-hidden">
                                    <thead className="bg-gray-100 text-gray-800 font-bold border-b">
                                        <tr>
                                            <th className="p-3 border-r">กลุ่มประเภทบุคคลหลัก</th>
                                            <th className="p-3 border-r text-right w-36">ผู้ป่วยนอก (ครั้ง)</th>
                                            <th className="p-3 border-r text-right w-36">ผู้ป่วยใน รับใหม่ (คน)</th>
                                            <th className="p-3 text-right w-36 font-bold bg-emerald-50/50">รวมทั้งสิ้น</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {(data.items || []).map((it: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="p-3 border-r font-semibold">{it.label}</td>
                                                <td className="p-3 border-r text-right font-mono font-medium">{it.opd?.toLocaleString()}</td>
                                                <td className="p-3 border-r text-right font-mono font-medium">{it.ipd?.toLocaleString()}</td>
                                                <td className="p-3 text-right font-mono font-bold text-emerald-800 bg-emerald-50/20">{it.total?.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* 8. Form A0109 (รง.ผสต.9) */}
                        {formId === 'A0109' && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead className="bg-gray-100 text-gray-700 font-bold border-b text-center">
                                        <tr>
                                            <th colSpan={2} className="p-2 border-r text-left">ประเภทบุคคล</th>
                                            <th className="p-2 border-r w-36 bg-emerald-50/50">ผู้รับบริการ รายใหม่ (คน)</th>
                                            <th className="p-2 w-36 bg-blue-50/50">จำนวนบริการ (ครั้ง)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y text-gray-800">
                                        {Object.entries(data.rows || {}).map(([key, r]: [string, any]) => (
                                            <tr key={key} className="hover:bg-gray-50">
                                                <td className="p-2 border-r text-center font-bold text-gray-500 w-12">{r.group}</td>
                                                <td className="p-2 border-r font-medium">{r.label}</td>
                                                <td className="p-1 border-r text-right bg-emerald-50/10">
                                                    <Input
                                                        type="number"
                                                        value={r.new_patients}
                                                        onChange={(e) => updateA0109Row(key, 'new_patients', parseInt(e.target.value) || 0)}
                                                        className="h-7 text-xs text-right"
                                                    />
                                                </td>
                                                <td className="p-1 text-right bg-blue-50/10">
                                                    <Input
                                                        type="number"
                                                        value={r.visits}
                                                        onChange={(e) => updateA0109Row(key, 'visits', parseInt(e.target.value) || 0)}
                                                        className="h-7 text-xs text-right"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* 9. Form A0110 (รง.ผสต.10) */}
                        {formId === 'A0110' && (
                            <div className="p-4 space-y-6 max-w-4xl mx-auto">
                                <div>
                                    <h3 className="text-xs font-bold text-gray-700 uppercase mb-2">ตารางที่ 1: จำนวนผู้รับบริการฝังเข็มจำแนกตามสาเหตุป่วย 16 กลุ่มโรค</h3>
                                    <table className="w-full text-xs text-left border rounded-lg overflow-hidden">
                                        <thead className="bg-gray-100 font-bold border-b">
                                            <tr>
                                                <th className="p-2.5 border-r text-center w-14">กลุ่มที่</th>
                                                <th className="p-2.5 border-r">สาเหตุป่วย (ชื่อโรค / กลุ่มโรค)</th>
                                                <th className="p-2.5 text-right w-36">จำนวนผู้ป่วย (ราย)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {(data.items || []).map((it: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="p-2 border-r text-center font-bold text-gray-500">{it.group_no}</td>
                                                    <td className="p-2 border-r font-medium text-gray-900">{it.title}</td>
                                                    <td className="p-1 text-right">
                                                        <Input
                                                            type="number"
                                                            value={it.count}
                                                            onChange={(e) => updateA0110Count(idx, parseInt(e.target.value) || 0)}
                                                            className="h-7 text-xs text-right"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* 10. Form E0101, E0102 (Dental) */}
                        {/* 11. Form E0101 (รง.ทพ.1) - Manual Data Entry Form */}
                        {formId === 'E0101' && (
                            <div className="space-y-4 max-w-4xl mx-auto">
                                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-emerald-950 text-sm">แบบบันทึกสถิติการบริการทันตกรรมจำแนกตามประเภทการรักษา (รง.ทพ.1)</h4>
                                        <p className="text-xs text-emerald-800 mt-0.5">
                                            สามารถป้อนตัวเลขจำนวนบริการและจำนวนชิ้นงาน/ซี่ได้โดยตรง ระบบคำนวณยอดรวมให้อัตโนมัติและสามารถบันทึกลงระบบได้ทันที
                                        </p>
                                    </div>
                                    <Button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1.5 shadow-sm"
                                    >
                                        <Save className="w-3.5 h-3.5" />
                                        {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลทันตกรรม'}
                                    </Button>
                                </div>

                                <div className="rounded-xl border border-gray-200 overflow-hidden shadow-xs bg-white">
                                    <table className="w-full text-xs text-left border-collapse">
                                        <thead className="bg-gray-100 text-gray-800 font-bold border-b text-center">
                                            <tr>
                                                <th className="p-3 border-r w-14">ลำดับ</th>
                                                <th className="p-3 border-r text-left">ประเภทการรักษา</th>
                                                <th className="p-3 border-r w-40 bg-emerald-50/70">จำนวนบริการ (ครั้ง)</th>
                                                <th className="p-3 border-r w-40 bg-blue-50/70">จำนวน</th>
                                                <th className="p-3 w-28 text-center text-gray-600">หน่วย</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {(data.items || []).map((it: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                                                    <td className="p-2.5 border-r text-center font-bold text-gray-500">{it.item_no || (idx + 1)}</td>
                                                    <td className="p-2.5 border-r font-medium text-gray-900">{it.name}</td>
                                                    <td className="p-1 border-r bg-emerald-50/20">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            value={it.service_count || 0}
                                                            onChange={(e) => updateE0101Cell(idx, 'service_count', parseInt(e.target.value) || 0)}
                                                            className="h-8 text-xs text-right font-mono font-bold text-emerald-900 bg-white"
                                                        />
                                                    </td>
                                                    <td className="p-1 border-r bg-blue-50/20">
                                                        {it.has_qty ? (
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                value={it.qty || 0}
                                                                onChange={(e) => updateE0101Cell(idx, 'qty', parseInt(e.target.value) || 0)}
                                                                className="h-8 text-xs text-right font-mono font-bold text-blue-900 bg-white"
                                                            />
                                                        ) : (
                                                            <div className="text-center text-gray-400 text-xs">-</div>
                                                        )}
                                                    </td>
                                                    <td className="p-2.5 text-center text-gray-600 font-medium">
                                                        {it.unit || 'ครั้ง'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-100 font-bold text-gray-900 border-t">
                                            <tr>
                                                <td colSpan={2} className="p-3 border-r text-right font-bold text-sm">รวมทั้งสิ้น:</td>
                                                <td className="p-3 border-r text-right font-mono font-bold text-sm text-emerald-950 bg-emerald-100/60">
                                                    {((data.items || []).reduce((sum: number, it: any) => sum + (parseInt(it.service_count) || 0), 0)).toLocaleString()}
                                                </td>
                                                <td className="p-3 border-r text-right font-mono font-bold text-sm text-blue-950 bg-blue-100/60">
                                                    {((data.items || []).reduce((sum: number, it: any) => sum + (parseInt(it.qty) || 0), 0)).toLocaleString()}
                                                </td>
                                                <td className="p-3 text-center text-xs text-gray-500">
                                                    ครั้ง / ชิ้นงาน
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* 12. Form E0102 (รง.ทพ.2) */}
                        {formId === 'E0102' && (
                            <div className="p-6 max-w-3xl mx-auto">
                                <table className="w-full text-xs text-left border rounded-lg overflow-hidden">
                                    <thead className="bg-gray-100 font-bold border-b">
                                        <tr>
                                            <th className="p-3 border-r text-center w-14">ลำดับ</th>
                                            <th className="p-3 border-r">ประเภทบุคคล</th>
                                            <th className="p-3 text-right w-40">จำนวนผู้ป่วย (ราย)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {(data.items || []).map((it: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="p-3 border-r text-center">{idx + 1}</td>
                                                <td className="p-3 border-r font-medium">{it.label || it.treatment}</td>
                                                <td className="p-3 text-right font-mono font-bold text-emerald-800">
                                                    {(it.count || it.visits || 0).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
                    <UnitManagementModal
                open={unitModalOpen}
                onClose={() => {
                    setUnitModalOpen(false);
                    handleCalculate();
                }}
            />
        </AppLayout>
    );
}

function renderA0101Rows(rows: any, onChange: (key: string, field: string, val: number) => void) {
    const groups = [
        { key: 'g', label: 'ก', items: ['g1', 'g2', 'g3', 'g4', 'g5'], sumLabel: 'รวมประเภท ก' },
        { key: 'k', label: 'ข', items: ['k1', 'k2', 'k3', 'k4', 'k5'], sumLabel: 'รวมประเภท ข' },
        { key: 'c', label: 'ค', items: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'], sumLabel: 'รวมประเภท ค' },
    ];

    let totalOpdNew = 0, totalOpdVisits = 0;
    let totalIpdBrought = 0, totalIpdNew = 0, totalIpdSum = 0, totalIpdDischarge = 0, totalIpdStay = 0;

    return (
        <>
            {groups.map((grp) => {
                let grpOpdNew = 0, grpOpdVisits = 0;
                let grpIpdBrought = 0, grpIpdNew = 0, grpIpdSum = 0, grpIpdDischarge = 0, grpIpdStay = 0;

                return (
                    <React.Fragment key={grp.key}>
                        {grp.items.map((k, idx) => {
                            const r = rows[k] || {};
                            const opdNew = r.opd_new || 0;
                            const opdVisits = r.opd_visits || 0;
                            const ipdBrought = r.ipd_brought || 0;
                            const ipdNew = r.ipd_new || 0;
                            const ipdTotal = ipdBrought + ipdNew;
                            const ipdDischarge = r.ipd_discharge || 0;
                            const ipdStay = r.ipd_stay_days || 0;

                            grpOpdNew += opdNew; grpOpdVisits += opdVisits;
                            grpIpdBrought += ipdBrought; grpIpdNew += ipdNew;
                            grpIpdSum += ipdTotal; grpIpdDischarge += ipdDischarge; grpIpdStay += ipdStay;

                            totalOpdNew += opdNew; totalOpdVisits += opdVisits;
                            totalIpdBrought += ipdBrought; totalIpdNew += ipdNew;
                            totalIpdSum += ipdTotal; totalIpdDischarge += ipdDischarge; totalIpdStay += ipdStay;

                            return (
                                <tr key={k} className="hover:bg-gray-50/60">
                                    {idx === 0 && (
                                        <td rowSpan={grp.items.length} className="p-2 border-r text-center font-bold text-gray-700 bg-gray-50/40 w-10">
                                            {grp.label}
                                        </td>
                                    )}
                                    <td className="p-2 border-r font-medium text-gray-800">{r.label || k}</td>
                                    <td className="p-1 border-r text-right bg-emerald-50/5">
                                        <Input
                                            type="number"
                                            value={opdNew}
                                            onChange={(e) => onChange(k, 'opd_new', parseInt(e.target.value) || 0)}
                                            className="h-7 text-xs text-right"
                                        />
                                    </td>
                                    <td className="p-1 border-r text-right bg-emerald-50/5">
                                        <Input
                                            type="number"
                                            value={opdVisits}
                                            onChange={(e) => onChange(k, 'opd_visits', parseInt(e.target.value) || 0)}
                                            className="h-7 text-xs text-right"
                                        />
                                    </td>
                                    <td className="p-1 border-r text-right bg-blue-50/5">
                                        <Input
                                            type="number"
                                            value={ipdBrought}
                                            onChange={(e) => onChange(k, 'ipd_brought', parseInt(e.target.value) || 0)}
                                            className="h-7 text-xs text-right"
                                        />
                                    </td>
                                    <td className="p-1 border-r text-right bg-blue-50/5">
                                        <Input
                                            type="number"
                                            value={ipdNew}
                                            onChange={(e) => onChange(k, 'ipd_new', parseInt(e.target.value) || 0)}
                                            className="h-7 text-xs text-right"
                                        />
                                    </td>
                                    <td className="p-2 border-r text-right font-bold bg-blue-50/30">
                                        {ipdTotal.toLocaleString()}
                                    </td>
                                    <td className="p-1 border-r text-right bg-blue-50/5">
                                        <Input
                                            type="number"
                                            value={ipdDischarge}
                                            onChange={(e) => onChange(k, 'ipd_discharge', parseInt(e.target.value) || 0)}
                                            className="h-7 text-xs text-right"
                                        />
                                    </td>
                                    <td className="p-1 text-right bg-blue-50/5">
                                        <Input
                                            type="number"
                                            value={ipdStay}
                                            onChange={(e) => onChange(k, 'ipd_stay_days', parseInt(e.target.value) || 0)}
                                            className="h-7 text-xs text-right"
                                        />
                                    </td>
                                </tr>
                            );
                        })}

                        {/* Group Subtotal Row */}
                        <tr className="bg-gray-100/90 font-bold text-gray-900 border-t border-b">
                            <td colSpan={2} className="p-2 border-r text-right pr-4">{grp.sumLabel}</td>
                            <td className="p-2 border-r text-right font-mono">{grpOpdNew.toLocaleString()}</td>
                            <td className="p-2 border-r text-right font-mono">{grpOpdVisits.toLocaleString()}</td>
                            <td className="p-2 border-r text-right font-mono">{grpIpdBrought.toLocaleString()}</td>
                            <td className="p-2 border-r text-right font-mono">{grpIpdNew.toLocaleString()}</td>
                            <td className="p-2 border-r text-right font-mono bg-blue-100/40">{grpIpdSum.toLocaleString()}</td>
                            <td className="p-2 border-r text-right font-mono">{grpIpdDischarge.toLocaleString()}</td>
                            <td className="p-2 text-right font-mono">{grpIpdStay.toLocaleString()}</td>
                        </tr>
                    </React.Fragment>
                );
            })}

            {/* Total Row */}
            <tr className="bg-emerald-100/80 font-extrabold text-emerald-950 border-t-2 border-emerald-300">
                <td colSpan={2} className="p-2.5 border-r text-right pr-4">รวมทั้งสิ้น</td>
                <td className="p-2.5 border-r text-right font-mono">{totalOpdNew.toLocaleString()}</td>
                <td className="p-2.5 border-r text-right font-mono">{totalOpdVisits.toLocaleString()}</td>
                <td className="p-2.5 border-r text-right font-mono">{totalIpdBrought.toLocaleString()}</td>
                <td className="p-2.5 border-r text-right font-mono">{totalIpdNew.toLocaleString()}</td>
                <td className="p-2.5 border-r text-right font-mono bg-emerald-200/50">{totalIpdSum.toLocaleString()}</td>
                <td className="p-2.5 border-r text-right font-mono">{totalIpdDischarge.toLocaleString()}</td>
                <td className="p-2.5 text-right font-mono">{totalIpdStay.toLocaleString()}</td>
            </tr>
        </>
    );
}
