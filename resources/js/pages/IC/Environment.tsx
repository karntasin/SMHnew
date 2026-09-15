import React, { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { QualityPage, StatCard, Panel, EmptyState } from '@/components/quality/quality-ui';
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

    const checkDialog = (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 rounded-xl bg-rose-600 hover:bg-rose-700">
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
            icon={Microscope}
            badge="ศูนย์พัฒนาคุณภาพ · IC"
            title="Environment Surveillance"
            subtitle="การตรวจสอบสิ่งแวดล้อมและอุปกรณ์"
            headTitle="Environment Check - IC"
            breadcrumbs={[
                { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
                { title: 'Infection Control (IC)', href: '/ic' },
                { title: 'สิ่งแวดล้อม', href: '/ic/environment' },
            ]}
            subNav={<IcSubNav active="ic.environment" />}
            actions={checkDialog}
        >
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard label="ตรวจทั้งหมด" value={stats.total_checks} icon={Microscope} tone="slate" />
                <StatCard label="เดือนนี้" value={stats.this_month} icon={Clock} tone="sky" />
                <StatCard
                    label="อัตราผ่าน"
                    value={
                        <span className="flex items-center gap-2">
                            {stats.pass_rate}%
                            {stats.pass_rate >= 90 ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            ) : (
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                            )}
                        </span>
                    }
                    icon={CheckCircle2}
                    tone="emerald"
                />
                <StatCard label="พื้นที่ไม่ผ่าน" value={stats.failed_areas.length} icon={XCircle} tone="rose" />
            </div>

                    {stats.failed_areas.length > 0 && (
                        <Panel title="พื้นที่ที่ต้องแก้ไข (เดือนนี้)" className="border-rose-200 bg-rose-50/50">
                                <div className="flex flex-wrap gap-2">
                                    {stats.failed_areas.map((area, index) => (
                                        <Badge key={index} variant="destructive">
                                            {area.area_name}: {area.failures} ครั้ง
                                        </Badge>
                                    ))}
                                </div>
                        </Panel>
                    )}

                    <div className="grid gap-4 md:grid-cols-4">
                        {checkTypes.map((type) => {
                            const count = stats.by_type.find(t => t.check_type === type.value)?.total || 0;
                            return (
                                <StatCard
                                    key={type.value}
                                    label={type.label.split('(')[0].trim()}
                                    value={count}
                                    icon={Microscope}
                                    tone="violet"
                                />
                            );
                        })}
                    </div>

                    <Panel
                        title="ประวัติการตรวจ"
                        action={
                            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShowFilters(!showFilters)}>
                                <Filter className="mr-1 h-4 w-4" /> กรอง
                            </Button>
                        }
                    >
                            {showFilters && (
                                <div className="mb-4 grid grid-cols-3 gap-4 border-b border-slate-100 pb-4">
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
                            <div className="overflow-hidden rounded-xl border border-slate-200">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                                            <th className="p-3">วันที่</th>
                                            <th className="p-3">พื้นที่</th>
                                            <th className="p-3">ประเภท</th>
                                            <th className="p-3">จุดเก็บ/อุปกรณ์</th>
                                            <th className="p-3">ผล</th>
                                            <th className="p-3">เชื้อที่พบ</th>
                                            <th className="p-3">ผู้บันทึก</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {checks.data.length === 0 ? (
                                            <tr><td colSpan={7}><EmptyState text="ไม่พบข้อมูล" /></td></tr>
                                        ) : (
                                            checks.data.map((check) => (
                                                <tr key={check.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                                                    <td className="p-3">{new Date(check.check_date).toLocaleDateString('th-TH')}</td>
                                                    <td className="p-3">{check.area_name}</td>
                                                    <td className="p-3">{checkTypes.find(t => t.value === check.check_type)?.label.split('(')[0] || check.check_type}</td>
                                                    <td className="p-3">{check.sampling_site || check.equipment_name || '-'}</td>
                                                    <td className="p-3">{getResultBadge(check.result)}</td>
                                                    <td className="p-3">{check.organism_found || '-'}</td>
                                                    <td className="p-3">{check.reporter?.name || '-'}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                    </Panel>
        </QualityPage>
    );
}
