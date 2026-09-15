import React, { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { QualityPage, Panel, EmptyState } from '@/components/quality/quality-ui';
import IcSubNav from '@/pages/IC/IcSubNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Calendar,
    Plus,
    TrendingUp,
    Activity,
    Info,
} from 'lucide-react';
import { toast } from 'sonner';

interface DeviceDay {
    id: number;
    record_date: string;
    ward_name: string;
    patient_days: number;
    urinary_catheter_days: number;
    central_line_days: number;
    ventilator_days: number;
    peripheral_iv_days: number;
    ng_tube_days: number;
    reporter?: { name: string };
}

interface MonthlySummary {
    month: string;
    total_patient_days: number;
    total_catheter_days: number;
    total_central_line_days: number;
    total_ventilator_days: number;
}

interface Props {
    records: {
        data: DeviceDay[];
        links: any[];
    };
    monthlySummary: MonthlySummary[];
    filters: {
        ward?: string;
        month?: string;
        year?: string;
    };
}

export default function DeviceDays({ records, monthlySummary, filters }: Props) {
    const [isOpen, setIsOpen] = useState(false);

    const { data, setData, post, processing, reset } = useForm({
        record_date: new Date().toISOString().split('T')[0],
        ward_name: '',
        patient_days: 0,
        urinary_catheter_days: 0,
        central_line_days: 0,
        ventilator_days: 0,
        peripheral_iv_days: 0,
        ng_tube_days: 0,
        notes: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/ic/device-days', {
            onSuccess: () => {
                toast.success('บันทึกข้อมูล Device Days เรียบร้อยแล้ว');
                reset();
                setIsOpen(false);
            },
        });
    };

    const calculateUtilization = (deviceDays: number, patientDays: number) => {
        if (patientDays === 0) return 0;
        return ((deviceDays / patientDays) * 100).toFixed(1);
    };

    const recordDialog = (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 rounded-xl bg-rose-600 hover:bg-rose-700">
                    <Plus className="h-4 w-4" /> บันทึกข้อมูล
                </Button>
            </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>บันทึก Device Days</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>วันที่บันทึก</Label>
                                                <Input
                                                    type="date"
                                                    value={data.record_date}
                                                    onChange={(e) => setData('record_date', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>หอผู้ป่วย</Label>
                                                <Input
                                                    placeholder="เช่น Ward, ICU"
                                                    value={data.ward_name}
                                                    onChange={(e) => setData('ward_name', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Info className="h-4 w-4 text-blue-500" />
                                                <span className="font-medium text-blue-700">Patient Census</span>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>จำนวนวันนอน (Patient Days)</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={data.patient_days}
                                                    onChange={(e) => setData('patient_days', parseInt(e.target.value) || 0)}
                                                />
                                                <p className="text-xs text-muted-foreground">นับจากจำนวนผู้ป่วยที่ admit ณ เวลาที่กำหนด (เช่น 00:00 น.)</p>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-muted rounded-lg">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Activity className="h-4 w-4" />
                                                <span className="font-medium">Device Days</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Urinary Catheter Days</Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={data.urinary_catheter_days}
                                                        onChange={(e) => setData('urinary_catheter_days', parseInt(e.target.value) || 0)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Central Line Days</Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={data.central_line_days}
                                                        onChange={(e) => setData('central_line_days', parseInt(e.target.value) || 0)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Ventilator Days</Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={data.ventilator_days}
                                                        onChange={(e) => setData('ventilator_days', parseInt(e.target.value) || 0)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Peripheral IV Days</Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={data.peripheral_iv_days}
                                                        onChange={(e) => setData('peripheral_iv_days', parseInt(e.target.value) || 0)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>NG Tube Days</Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={data.ng_tube_days}
                                                        onChange={(e) => setData('ng_tube_days', parseInt(e.target.value) || 0)}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>หมายเหตุ</Label>
                                            <Textarea
                                                value={data.notes}
                                                onChange={(e) => setData('notes', e.target.value)}
                                            />
                                        </div>

                                        <Button type="submit" className="w-full rounded-xl bg-rose-600 hover:bg-rose-700" disabled={processing}>
                                            บันทึกข้อมูล
                                        </Button>
                                    </form>
                                </DialogContent>
        </Dialog>
    );

    return (
        <QualityPage
            tone="rose"
            icon={Calendar}
            badge="ศูนย์พัฒนาคุณภาพ · IC"
            title="Device Days Tracking"
            subtitle="บันทึก Patient Days และ Device Days สำหรับคำนวณ HAI Rate"
            headTitle="Device Days - IC"
            breadcrumbs={[
                { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
                { title: 'Infection Control (IC)', href: '/ic' },
                { title: 'Device Days', href: '/ic/device-days' },
            ]}
            subNav={<IcSubNav active="ic.device-days" />}
            actions={recordDialog}
        >
                    <Panel title="สรุปรายเดือน" description="ข้อมูลรวมสำหรับคำนวณ HAI Rate">
                            <div className="overflow-hidden rounded-xl border border-slate-200">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                                            <th className="p-3">เดือน</th>
                                            <th className="p-3 text-right">Patient Days</th>
                                            <th className="p-3 text-right">Catheter Days</th>
                                            <th className="p-3 text-right">Catheter UR%</th>
                                            <th className="p-3 text-right">Central Line Days</th>
                                            <th className="p-3 text-right">CL UR%</th>
                                            <th className="p-3 text-right">Ventilator Days</th>
                                            <th className="p-3 text-right">Vent UR%</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {monthlySummary.length === 0 ? (
                                            <tr><td colSpan={8}><EmptyState text="ยังไม่มีข้อมูล" /></td></tr>
                                        ) : (
                                            monthlySummary.map((summary) => (
                                                <tr key={summary.month} className="border-t border-slate-100 hover:bg-slate-50/60">
                                                    <td className="p-3 font-medium">{summary.month}</td>
                                                    <td className="p-3 text-right">{summary.total_patient_days?.toLocaleString() || 0}</td>
                                                    <td className="p-3 text-right">{summary.total_catheter_days?.toLocaleString() || 0}</td>
                                                    <td className="p-3 text-right">
                                                        <Badge variant="secondary">
                                                            {calculateUtilization(summary.total_catheter_days || 0, summary.total_patient_days || 0)}%
                                                        </Badge>
                                                    </td>
                                                    <td className="p-3 text-right">{summary.total_central_line_days?.toLocaleString() || 0}</td>
                                                    <td className="p-3 text-right">
                                                        <Badge variant="secondary">
                                                            {calculateUtilization(summary.total_central_line_days || 0, summary.total_patient_days || 0)}%
                                                        </Badge>
                                                    </td>
                                                    <td className="p-3 text-right">{summary.total_ventilator_days?.toLocaleString() || 0}</td>
                                                    <td className="p-3 text-right">
                                                        <Badge variant="secondary">
                                                            {calculateUtilization(summary.total_ventilator_days || 0, summary.total_patient_days || 0)}%
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                    </Panel>

                    <Panel title="รายการบันทึกประจำวัน">
                            <div className="overflow-hidden rounded-xl border border-slate-200">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                                            <th className="p-3">วันที่</th>
                                            <th className="p-3">หอผู้ป่วย</th>
                                            <th className="p-3 text-right">Patient Days</th>
                                            <th className="p-3 text-right">Catheter</th>
                                            <th className="p-3 text-right">Central Line</th>
                                            <th className="p-3 text-right">Ventilator</th>
                                            <th className="p-3 text-right">Peripheral IV</th>
                                            <th className="p-3">ผู้บันทึก</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {records.data.length === 0 ? (
                                            <tr><td colSpan={8}><EmptyState text="ยังไม่มีข้อมูล" /></td></tr>
                                        ) : (
                                            records.data.map((record) => (
                                                <tr key={record.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                                                    <td className="p-3">{new Date(record.record_date).toLocaleDateString('th-TH')}</td>
                                                    <td className="p-3">{record.ward_name}</td>
                                                    <td className="p-3 text-right font-medium">{record.patient_days}</td>
                                                    <td className="p-3 text-right">{record.urinary_catheter_days}</td>
                                                    <td className="p-3 text-right">{record.central_line_days}</td>
                                                    <td className="p-3 text-right">{record.ventilator_days}</td>
                                                    <td className="p-3 text-right">{record.peripheral_iv_days}</td>
                                                    <td className="p-3">{record.reporter?.name || '-'}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                    </Panel>

                    <Panel title="วิธีคำนวณ HAI Rate" className="border-sky-200 bg-sky-50/50">
                            <div className="space-y-2 text-sky-800">
                            <p><strong>CAUTI Rate</strong> = (จำนวน CAUTI / Catheter Days) × 1,000</p>
                            <p><strong>CLABSI Rate</strong> = (จำนวน CLABSI / Central Line Days) × 1,000</p>
                            <p><strong>VAP Rate</strong> = (จำนวน VAP / Ventilator Days) × 1,000</p>
                            <p className="mt-4 text-sm">
                                <strong>Device Utilization Ratio (UR)</strong> = (Device Days / Patient Days) × 100
                            </p>
                            </div>
                    </Panel>
        </QualityPage>
    );
}
