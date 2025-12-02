import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
    Hand,
    Plus,
    Target,
    TrendingUp,
    Users,
    CheckCircle2,
    XCircle,
    Filter,
    Download,
    Info,
} from 'lucide-react';
import { toast } from 'sonner';

interface Observation {
    id: number;
    observation_date: string;
    ward_name: string;
    observer_name: string;
    profession: string;
    moment_1_opportunities: number;
    moment_1_compliances: number;
    moment_2_opportunities: number;
    moment_2_compliances: number;
    moment_3_opportunities: number;
    moment_3_compliances: number;
    moment_4_opportunities: number;
    moment_4_compliances: number;
    moment_5_opportunities: number;
    moment_5_compliances: number;
    compliance_rate: number;
    total_opportunities: number;
    total_compliances: number;
    reporter?: { name: string };
}

interface Stats {
    target: number;
    overall_rate: number;
    by_moment: {
        moment: number;
        name: string;
        rate: number;
    }[];
    by_profession: {
        profession: string;
        rate: number;
    }[];
}

interface Props {
    observations: {
        data: Observation[];
        links: any[];
        current_page: number;
        last_page: number;
    };
    stats: Stats;
    filters: {
        ward?: string;
        profession?: string;
        date_from?: string;
        date_to?: string;
    };
}

export default function HandHygiene({ observations, stats, filters }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const { data, setData, post, processing, reset, errors } = useForm({
        observation_date: new Date().toISOString().split('T')[0],
        ward_name: '',
        observer_name: '',
        profession: '',
        moment_1_opportunities: 0,
        moment_1_compliances: 0,
        moment_2_opportunities: 0,
        moment_2_compliances: 0,
        moment_3_opportunities: 0,
        moment_3_compliances: 0,
        moment_4_opportunities: 0,
        moment_4_compliances: 0,
        moment_5_opportunities: 0,
        moment_5_compliances: 0,
        hand_hygiene_method: '',
        notes: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/ic/hand-hygiene', {
            onSuccess: () => {
                toast.success('บันทึกข้อมูล Hand Hygiene เรียบร้อยแล้ว');
                reset();
                setIsOpen(false);
            },
        });
    };

    const applyFilters = (newFilters: Record<string, string>) => {
        router.get('/ic/hand-hygiene', { ...filters, ...newFilters }, { preserveState: true });
    };

    const moments = [
        { num: 1, name: 'Before touching patient', nameThai: 'ก่อนสัมผัสผู้ป่วย', color: 'bg-blue-500' },
        { num: 2, name: 'Before clean/aseptic procedure', nameThai: 'ก่อนทำหัตถการ', color: 'bg-green-500' },
        { num: 3, name: 'After body fluid exposure', nameThai: 'หลังสัมผัสสารคัดหลั่ง', color: 'bg-yellow-500' },
        { num: 4, name: 'After touching patient', nameThai: 'หลังสัมผัสผู้ป่วย', color: 'bg-orange-500' },
        { num: 5, name: 'After touching surroundings', nameThai: 'หลังสัมผัสสิ่งแวดล้อม', color: 'bg-purple-500' },
    ];

    const professions = [
        { value: 'doctor', label: 'แพทย์' },
        { value: 'nurse', label: 'พยาบาล' },
        { value: 'aide', label: 'ผู้ช่วยเหลือคนไข้' },
        { value: 'technician', label: 'เจ้าหน้าที่เทคนิค' },
        { value: 'other', label: 'อื่นๆ' },
    ];

    const breadcrumbs = [
        { title: 'IC', href: '/ic' },
        { title: 'Hand Hygiene', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Hand Hygiene - IC" />

            <div className="flex flex-col min-h-screen">
                {/* Hero Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-teal-500 via-emerald-500 to-green-600 text-white">
                    <div className="absolute inset-0 bg-grid-white/10"></div>
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>

                    <div className="relative px-6 py-8">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                                    <Hand className="h-10 w-10" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight">
                                        Hand Hygiene Compliance
                                    </h1>
                                    <p className="text-white/80 text-lg">
                                        WHO 5 Moments for Hand Hygiene
                                    </p>
                                </div>
                            </div>
                            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                                <DialogTrigger asChild>
                                    <Button className="gap-2 bg-white text-teal-600 hover:bg-white/90">
                                        <Plus className="h-4 w-4" /> บันทึกการสังเกต
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>บันทึกการสังเกต Hand Hygiene</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleSubmit} className="space-y-6 py-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>วันที่สังเกต</Label>
                                                <Input
                                                    type="date"
                                                    value={data.observation_date}
                                                    onChange={(e) => setData('observation_date', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>หอผู้ป่วย / แผนก</Label>
                                                <Input
                                                    placeholder="เช่น Ward, ER, OPD"
                                                    value={data.ward_name}
                                                    onChange={(e) => setData('ward_name', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>ชื่อผู้สังเกต</Label>
                                                <Input
                                                    placeholder="ชื่อ-สกุล"
                                                    value={data.observer_name}
                                                    onChange={(e) => setData('observer_name', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>กลุ่มวิชาชีพที่สังเกต</Label>
                                                <Select value={data.profession} onValueChange={(v) => setData('profession', v)}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="เลือกกลุ่มวิชาชีพ" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {professions.map((p) => (
                                                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        {/* WHO 5 Moments */}
                                        <div className="border rounded-lg p-4">
                                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                                <Info className="h-4 w-4" />
                                                WHO 5 Moments - บันทึกจำนวนโอกาส และจำนวนที่ล้างมือ
                                            </h3>
                                            <div className="space-y-4">
                                                {moments.map((moment) => (
                                                    <div key={moment.num} className="grid grid-cols-3 gap-4 items-center p-3 bg-muted/50 rounded-lg">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-8 h-8 rounded-full ${moment.color} flex items-center justify-center text-white font-bold text-sm`}>
                                                                {moment.num}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-sm">{moment.nameThai}</p>
                                                                <p className="text-xs text-muted-foreground">{moment.name}</p>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">โอกาส (Opportunities)</Label>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                value={data[`moment_${moment.num}_opportunities` as keyof typeof data]}
                                                                onChange={(e) => setData(`moment_${moment.num}_opportunities` as any, parseInt(e.target.value) || 0)}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">ปฏิบัติถูกต้อง (Compliances)</Label>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                value={data[`moment_${moment.num}_compliances` as keyof typeof data]}
                                                                onChange={(e) => setData(`moment_${moment.num}_compliances` as any, parseInt(e.target.value) || 0)}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>วิธีล้างมือที่พบ</Label>
                                                <Select value={data.hand_hygiene_method} onValueChange={(v) => setData('hand_hygiene_method', v)}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="เลือกวิธี" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="alcohol_rub">Alcohol Hand Rub</SelectItem>
                                                        <SelectItem value="handwashing">Handwashing with Soap</SelectItem>
                                                        <SelectItem value="both">ทั้งสองวิธี</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>หมายเหตุ</Label>
                                            <Textarea
                                                value={data.notes}
                                                onChange={(e) => setData('notes', e.target.value)}
                                                placeholder="บันทึกเพิ่มเติม (ถ้ามี)"
                                            />
                                        </div>

                                        <Button type="submit" className="w-full" disabled={processing}>
                                            บันทึกข้อมูล
                                        </Button>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {/* Stats in Hero */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
                                    <Target className="h-4 w-4" />
                                    <span>เป้าหมาย</span>
                                </div>
                                <div className="text-3xl font-bold">{stats.target}%</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
                                    <TrendingUp className="h-4 w-4" />
                                    <span>Compliance Rate</span>
                                </div>
                                <div className="text-3xl font-bold flex items-center gap-2">
                                    {stats.overall_rate}%
                                    {stats.overall_rate >= stats.target ? (
                                        <CheckCircle2 className="h-6 w-6 text-green-300" />
                                    ) : (
                                        <XCircle className="h-6 w-6 text-red-300" />
                                    )}
                                </div>
                            </div>
                            <div className="col-span-2 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                <Progress value={stats.overall_rate} className="h-4 bg-white/20" />
                                <p className="text-sm text-white/70 mt-2 text-center">
                                    {stats.overall_rate >= stats.target ? 'บรรลุเป้าหมาย ✓' : `ต้องเพิ่มอีก ${(stats.target - stats.overall_rate).toFixed(1)}%`}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 p-6 space-y-6 bg-gray-50 dark:bg-gray-900">
                    {/* Compliance by Moment */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Hand className="h-5 w-5 text-teal-500" />
                                Compliance แยกตาม 5 Moments (เดือนนี้)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-5">
                                {stats.by_moment.map((moment, index) => (
                                    <div key={moment.moment} className="text-center">
                                        <div className={`w-16 h-16 mx-auto rounded-full ${moments[index].color} flex items-center justify-center text-white font-bold text-2xl mb-2`}>
                                            {moment.moment}
                                        </div>
                                        <p className="text-sm font-medium mb-1">{moments[index].nameThai}</p>
                                        <p className="text-2xl font-bold">
                                            {moment.rate}%
                                        </p>
                                        <Progress value={moment.rate} className="h-2 mt-2" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Compliance by Profession */}
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-blue-500" />
                                    Compliance แยกตามวิชาชีพ (เดือนนี้)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {stats.by_profession.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-4">ยังไม่มีข้อมูล</p>
                                ) : (
                                    <div className="space-y-4">
                                        {stats.by_profession.map((item) => {
                                            const profession = professions.find(p => p.value === item.profession);
                                            return (
                                                <div key={item.profession} className="flex items-center gap-4">
                                                    <div className="w-24 text-sm font-medium">{profession?.label || item.profession}</div>
                                                    <div className="flex-1">
                                                        <Progress value={item.rate} className="h-3" />
                                                    </div>
                                                    <div className="w-16 text-right">
                                                        <Badge variant={item.rate >= stats.target ? "default" : "destructive"}>
                                                            {item.rate}%
                                                        </Badge>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* WHO 5 Moments Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Info className="h-5 w-5 text-purple-500" />
                                    WHO 5 Moments for Hand Hygiene
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {moments.map((moment) => (
                                        <div key={moment.num} className="flex items-start gap-3">
                                            <div className={`w-8 h-8 rounded-full ${moment.color} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                                                {moment.num}
                                            </div>
                                            <div>
                                                <p className="font-medium">{moment.nameThai}</p>
                                                <p className="text-sm text-muted-foreground">{moment.name}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Filters */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>ประวัติการสังเกต</CardTitle>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                                        <Filter className="h-4 w-4 mr-1" /> กรอง
                                    </Button>
                                    <Button variant="outline" size="sm">
                                        <Download className="h-4 w-4 mr-1" /> Export
                                    </Button>
                                </div>
                            </div>
                            {showFilters && (
                                <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
                                    <Input
                                        type="text"
                                        placeholder="หอผู้ป่วย"
                                        value={filters.ward || ''}
                                        onChange={(e) => applyFilters({ ward: e.target.value })}
                                    />
                                    <Select value={filters.profession || ''} onValueChange={(v) => applyFilters({ profession: v })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="วิชาชีพ" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">ทั้งหมด</SelectItem>
                                            {professions.map((p) => (
                                                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="date"
                                        placeholder="จากวันที่"
                                        value={filters.date_from || ''}
                                        onChange={(e) => applyFilters({ date_from: e.target.value })}
                                    />
                                    <Input
                                        type="date"
                                        placeholder="ถึงวันที่"
                                        value={filters.date_to || ''}
                                        onChange={(e) => applyFilters({ date_to: e.target.value })}
                                    />
                                </div>
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>วันที่</TableHead>
                                            <TableHead>หอผู้ป่วย</TableHead>
                                            <TableHead>วิชาชีพ</TableHead>
                                            <TableHead>ผู้สังเกต</TableHead>
                                            <TableHead className="text-center">โอกาส</TableHead>
                                            <TableHead className="text-center">ปฏิบัติถูกต้อง</TableHead>
                                            <TableHead className="text-center">Compliance</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {observations.data.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                    ไม่พบข้อมูล
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            observations.data.map((obs) => {
                                                const profession = professions.find(p => p.value === obs.profession);
                                                return (
                                                    <TableRow key={obs.id}>
                                                        <TableCell>{new Date(obs.observation_date).toLocaleDateString('th-TH')}</TableCell>
                                                        <TableCell>{obs.ward_name}</TableCell>
                                                        <TableCell>{profession?.label || obs.profession}</TableCell>
                                                        <TableCell>{obs.observer_name}</TableCell>
                                                        <TableCell className="text-center">{obs.total_opportunities}</TableCell>
                                                        <TableCell className="text-center">{obs.total_compliances}</TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge variant={obs.compliance_rate >= stats.target ? "default" : "destructive"}>
                                                                {obs.compliance_rate}%
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
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
