import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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

    const breadcrumbs = [
        { title: 'IC', href: '/ic' },
        { title: 'Device Days', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Device Days - IC" />

            <div className="flex flex-col min-h-screen">
                {/* Hero Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-600 text-white">
                    <div className="absolute inset-0 bg-grid-white/10"></div>
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>

                    <div className="relative px-6 py-8">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                                    <Calendar className="h-10 w-10" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight">
                                        Device Days Tracking
                                    </h1>
                                    <p className="text-white/80 text-lg">
                                        บันทึก Patient Days และ Device Days สำหรับคำนวณ HAI Rate
                                    </p>
                                </div>
                            </div>
                            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                                <DialogTrigger asChild>
                                    <Button className="gap-2 bg-white text-indigo-600 hover:bg-white/90">
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

                                        <Button type="submit" className="w-full" disabled={processing}>
                                            บันทึกข้อมูล
                                        </Button>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 p-6 space-y-6 bg-gray-50 dark:bg-gray-900">
                    {/* Monthly Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-blue-500" />
                                สรุปรายเดือน
                            </CardTitle>
                            <CardDescription>
                                ข้อมูลรวมสำหรับคำนวณ HAI Rate
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>เดือน</TableHead>
                                            <TableHead className="text-right">Patient Days</TableHead>
                                            <TableHead className="text-right">Catheter Days</TableHead>
                                            <TableHead className="text-right">Catheter UR%</TableHead>
                                            <TableHead className="text-right">Central Line Days</TableHead>
                                            <TableHead className="text-right">CL UR%</TableHead>
                                            <TableHead className="text-right">Ventilator Days</TableHead>
                                            <TableHead className="text-right">Vent UR%</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {monthlySummary.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                                    ยังไม่มีข้อมูล
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            monthlySummary.map((summary) => (
                                                <TableRow key={summary.month}>
                                                    <TableCell className="font-medium">{summary.month}</TableCell>
                                                    <TableCell className="text-right">{summary.total_patient_days?.toLocaleString() || 0}</TableCell>
                                                    <TableCell className="text-right">{summary.total_catheter_days?.toLocaleString() || 0}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant="secondary">
                                                            {calculateUtilization(summary.total_catheter_days || 0, summary.total_patient_days || 0)}%
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">{summary.total_central_line_days?.toLocaleString() || 0}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant="secondary">
                                                            {calculateUtilization(summary.total_central_line_days || 0, summary.total_patient_days || 0)}%
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">{summary.total_ventilator_days?.toLocaleString() || 0}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant="secondary">
                                                            {calculateUtilization(summary.total_ventilator_days || 0, summary.total_patient_days || 0)}%
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Daily Records */}
                    <Card>
                        <CardHeader>
                            <CardTitle>รายการบันทึกประจำวัน</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>วันที่</TableHead>
                                            <TableHead>หอผู้ป่วย</TableHead>
                                            <TableHead className="text-right">Patient Days</TableHead>
                                            <TableHead className="text-right">Catheter</TableHead>
                                            <TableHead className="text-right">Central Line</TableHead>
                                            <TableHead className="text-right">Ventilator</TableHead>
                                            <TableHead className="text-right">Peripheral IV</TableHead>
                                            <TableHead>ผู้บันทึก</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {records.data.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                                    ยังไม่มีข้อมูล
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            records.data.map((record) => (
                                                <TableRow key={record.id}>
                                                    <TableCell>{new Date(record.record_date).toLocaleDateString('th-TH')}</TableCell>
                                                    <TableCell>{record.ward_name}</TableCell>
                                                    <TableCell className="text-right font-medium">{record.patient_days}</TableCell>
                                                    <TableCell className="text-right">{record.urinary_catheter_days}</TableCell>
                                                    <TableCell className="text-right">{record.central_line_days}</TableCell>
                                                    <TableCell className="text-right">{record.ventilator_days}</TableCell>
                                                    <TableCell className="text-right">{record.peripheral_iv_days}</TableCell>
                                                    <TableCell>{record.reporter?.name || '-'}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Info Card */}
                    <Card className="bg-blue-50 border-blue-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-blue-700">
                                <Info className="h-5 w-5" />
                                วิธีคำนวณ HAI Rate
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-blue-700 space-y-2">
                            <p><strong>CAUTI Rate</strong> = (จำนวน CAUTI / Catheter Days) × 1,000</p>
                            <p><strong>CLABSI Rate</strong> = (จำนวน CLABSI / Central Line Days) × 1,000</p>
                            <p><strong>VAP Rate</strong> = (จำนวน VAP / Ventilator Days) × 1,000</p>
                            <p className="text-sm mt-4">
                                <strong>Device Utilization Ratio (UR)</strong> = (Device Days / Patient Days) × 100
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
