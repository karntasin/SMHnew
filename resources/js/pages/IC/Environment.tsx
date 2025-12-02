import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    Microscope,
    Plus,
    CheckCircle2,
    XCircle,
    Clock,
    Filter,
    AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

interface Check {
    id: number;
    check_date: string;
    area_name: string;
    check_type: string;
    sampling_site: string | null;
    organism_found: string | null;
    result: 'pass' | 'fail' | 'pending';
    cfu_count: number | null;
    equipment_name: string | null;
    sterilization_method: string | null;
    indicator_passed: boolean | null;
    corrective_action: string | null;
    reporter?: { name: string };
}

interface Stats {
    total_checks: number;
    this_month: number;
    pass_rate: number;
    by_type: { check_type: string; total: number }[];
    failed_areas: { area_name: string; failures: number }[];
}

interface Props {
    checks: {
        data: Check[];
        links: any[];
    };
    stats: Stats;
    filters: {
        area?: string;
        check_type?: string;
        result?: string;
    };
}

export default function Environment({ checks, stats, filters }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const { data, setData, post, processing, reset } = useForm({
        check_date: new Date().toISOString().split('T')[0],
        area_name: '',
        check_type: '',
        sampling_site: '',
        organism_found: '',
        result: 'pending',
        cfu_count: '',
        equipment_name: '',
        sterilization_method: '',
        indicator_passed: '',
        corrective_action: '',
        notes: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/ic/environment', {
            onSuccess: () => {
                toast.success('บันทึกข้อมูลเรียบร้อยแล้ว');
                reset();
                setIsOpen(false);
            },
        });
    };

    const checkTypes = [
        { value: 'surface_sampling', label: 'Surface Sampling (เก็บตัวอย่างพื้นผิว)' },
        { value: 'air_quality', label: 'Air Quality (คุณภาพอากาศ)' },
        { value: 'water_quality', label: 'Water Quality (คุณภาพน้ำ)' },
        { value: 'equipment_sterilization', label: 'Equipment Sterilization (ทำให้ปราศจากเชื้อ)' },
    ];

    const getResultBadge = (result: string) => {
        switch (result) {
            case 'pass':
                return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> ผ่าน</Badge>;
            case 'fail':
                return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> ไม่ผ่าน</Badge>;
            default:
                return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> รอผล</Badge>;
        }
    };

    const breadcrumbs = [
        { title: 'IC', href: '/ic' },
        { title: 'Environment Check', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Environment Check - IC" />

            <div className="flex flex-col min-h-screen">
                {/* Hero Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 text-white">
                    <div className="absolute inset-0 bg-grid-white/10"></div>
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>

                    <div className="relative px-6 py-8">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                                    <Microscope className="h-10 w-10" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight">
                                        Environment Surveillance
                                    </h1>
                                    <p className="text-white/80 text-lg">
                                        การตรวจสอบสิ่งแวดล้อมและอุปกรณ์
                                    </p>
                                </div>
                            </div>
                            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                                <DialogTrigger asChild>
                                    <Button className="gap-2 bg-white text-purple-600 hover:bg-white/90">
                                        <Plus className="h-4 w-4" /> บันทึกการตรวจ
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>บันทึกการตรวจสอบสิ่งแวดล้อม</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>วันที่ตรวจ</Label>
                                                <Input
                                                    type="date"
                                                    value={data.check_date}
                                                    onChange={(e) => setData('check_date', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>พื้นที่ / แผนก</Label>
                                                <Input
                                                    placeholder="เช่น Ward, ER, OPD, Lab"
                                                    value={data.area_name}
                                                    onChange={(e) => setData('area_name', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>ประเภทการตรวจ</Label>
                                            <Select value={data.check_type} onValueChange={(v) => setData('check_type', v)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="เลือกประเภท" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {checkTypes.map((t) => (
                                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Surface Sampling Fields */}
                                        {data.check_type === 'surface_sampling' && (
                                            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                                                <div className="space-y-2">
                                                    <Label>จุดเก็บตัวอย่าง</Label>
                                                    <Input
                                                        placeholder="เช่น ราวเตียง, nurse station"
                                                        value={data.sampling_site}
                                                        onChange={(e) => setData('sampling_site', e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>CFU Count</Label>
                                                    <Input
                                                        type="number"
                                                        placeholder="Colony Forming Units"
                                                        value={data.cfu_count}
                                                        onChange={(e) => setData('cfu_count', e.target.value)}
                                                    />
                                                </div>
                                                <div className="col-span-2 space-y-2">
                                                    <Label>เชื้อที่พบ (ถ้ามี)</Label>
                                                    <Input
                                                        placeholder="เช่น S. aureus, E. coli"
                                                        value={data.organism_found}
                                                        onChange={(e) => setData('organism_found', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Equipment Sterilization Fields */}
                                        {data.check_type === 'equipment_sterilization' && (
                                            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                                                <div className="space-y-2">
                                                    <Label>ชื่ออุปกรณ์</Label>
                                                    <Input
                                                        placeholder="เช่น Autoclave #1"
                                                        value={data.equipment_name}
                                                        onChange={(e) => setData('equipment_name', e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>วิธีทำให้ปราศจากเชื้อ</Label>
                                                    <Select value={data.sterilization_method} onValueChange={(v) => setData('sterilization_method', v)}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="เลือกวิธี" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="autoclave">Autoclave</SelectItem>
                                                            <SelectItem value="eo">EO Gas</SelectItem>
                                                            <SelectItem value="chemical">Chemical</SelectItem>
                                                            <SelectItem value="plasma">Plasma</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="col-span-2 space-y-2">
                                                    <Label>ผล Indicator</Label>
                                                    <Select value={data.indicator_passed} onValueChange={(v) => setData('indicator_passed', v)}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="เลือกผล" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="true">ผ่าน</SelectItem>
                                                            <SelectItem value="false">ไม่ผ่าน</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <Label>ผลการตรวจ</Label>
                                            <Select value={data.result} onValueChange={(v) => setData('result', v)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="เลือกผล" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="pending">รอผล</SelectItem>
                                                    <SelectItem value="pass">ผ่าน</SelectItem>
                                                    <SelectItem value="fail">ไม่ผ่าน</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {data.result === 'fail' && (
                                            <div className="space-y-2">
                                                <Label>การแก้ไข (Corrective Action)</Label>
                                                <Textarea
                                                    value={data.corrective_action}
                                                    onChange={(e) => setData('corrective_action', e.target.value)}
                                                    placeholder="ระบุมาตรการแก้ไข"
                                                />
                                            </div>
                                        )}

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

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                <div className="text-white/70 text-sm mb-1">ตรวจทั้งหมด</div>
                                <div className="text-3xl font-bold">{stats.total_checks}</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                <div className="text-white/70 text-sm mb-1">เดือนนี้</div>
                                <div className="text-3xl font-bold">{stats.this_month}</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                <div className="text-white/70 text-sm mb-1">อัตราผ่าน</div>
                                <div className="text-3xl font-bold flex items-center gap-2">
                                    {stats.pass_rate}%
                                    {stats.pass_rate >= 90 ? (
                                        <CheckCircle2 className="h-6 w-6 text-green-300" />
                                    ) : (
                                        <AlertTriangle className="h-6 w-6 text-yellow-300" />
                                    )}
                                </div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                <div className="text-white/70 text-sm mb-1">พื้นที่ไม่ผ่าน</div>
                                <div className="text-3xl font-bold text-red-300">{stats.failed_areas.length}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 p-6 space-y-6 bg-gray-50 dark:bg-gray-900">
                    {/* Failed Areas Alert */}
                    {stats.failed_areas.length > 0 && (
                        <Card className="border-red-200 bg-red-50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-red-600">
                                    <AlertTriangle className="h-5 w-5" />
                                    พื้นที่ที่ต้องแก้ไข (เดือนนี้)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {stats.failed_areas.map((area, index) => (
                                        <Badge key={index} variant="destructive">
                                            {area.area_name}: {area.failures} ครั้ง
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Stats by Type */}
                    <div className="grid gap-4 md:grid-cols-4">
                        {checkTypes.map((type) => {
                            const count = stats.by_type.find(t => t.check_type === type.value)?.total || 0;
                            return (
                                <Card key={type.value}>
                                    <CardContent className="pt-6">
                                        <div className="text-center">
                                            <div className="text-3xl font-bold">{count}</div>
                                            <p className="text-sm text-muted-foreground">{type.label.split('(')[0]}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Table */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>ประวัติการตรวจ</CardTitle>
                                <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                                    <Filter className="h-4 w-4 mr-1" /> กรอง
                                </Button>
                            </div>
                            {showFilters && (
                                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                                    <Input
                                        placeholder="พื้นที่"
                                        value={filters.area || ''}
                                        onChange={(e) => router.get('/ic/environment', { ...filters, area: e.target.value }, { preserveState: true })}
                                    />
                                    <Select value={filters.check_type || ''} onValueChange={(v) => router.get('/ic/environment', { ...filters, check_type: v }, { preserveState: true })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="ประเภท" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">ทั้งหมด</SelectItem>
                                            {checkTypes.map((t) => (
                                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={filters.result || ''} onValueChange={(v) => router.get('/ic/environment', { ...filters, result: v }, { preserveState: true })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="ผลการตรวจ" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">ทั้งหมด</SelectItem>
                                            <SelectItem value="pass">ผ่าน</SelectItem>
                                            <SelectItem value="fail">ไม่ผ่าน</SelectItem>
                                            <SelectItem value="pending">รอผล</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>วันที่</TableHead>
                                            <TableHead>พื้นที่</TableHead>
                                            <TableHead>ประเภท</TableHead>
                                            <TableHead>จุดเก็บ/อุปกรณ์</TableHead>
                                            <TableHead>ผล</TableHead>
                                            <TableHead>เชื้อที่พบ</TableHead>
                                            <TableHead>ผู้บันทึก</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {checks.data.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                    ไม่พบข้อมูล
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            checks.data.map((check) => (
                                                <TableRow key={check.id}>
                                                    <TableCell>{new Date(check.check_date).toLocaleDateString('th-TH')}</TableCell>
                                                    <TableCell>{check.area_name}</TableCell>
                                                    <TableCell>{checkTypes.find(t => t.value === check.check_type)?.label.split('(')[0] || check.check_type}</TableCell>
                                                    <TableCell>{check.sampling_site || check.equipment_name || '-'}</TableCell>
                                                    <TableCell>{getResultBadge(check.result)}</TableCell>
                                                    <TableCell>{check.organism_found || '-'}</TableCell>
                                                    <TableCell>{check.reporter?.name || '-'}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
