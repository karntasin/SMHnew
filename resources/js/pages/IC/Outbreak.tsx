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
    AlertOctagon,
    Plus,
    AlertTriangle,
    ShieldAlert,
    Users,
    Activity,
    MapPin,
    Calendar,
    Eye,
    CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

interface Outbreak {
    id: number;
    outbreak_number: string;
    outbreak_name: string;
    outbreak_type: string;
    organism: string | null;
    start_date: string;
    end_date: string | null;
    affected_areas: string[];
    status: 'investigating' | 'ongoing' | 'controlled' | 'closed';
    index_case_date: string | null;
    total_cases: number;
    total_deaths: number;
    control_measures: string | null;
    cases?: OutbreakCase[];
}

interface OutbreakCase {
    id: number;
    outbreak_id: number;
    hn: string;
    patient_name: string;
    onset_date: string;
    symptoms: string | null;
    outcome: 'active' | 'recovered' | 'death';
    is_index_case: boolean;
}

interface Stats {
    total_outbreaks: number;
    active_outbreaks: number;
    total_cases: number;
    by_type: { outbreak_type: string; total: number }[];
}

interface Props {
    outbreaks: {
        data: Outbreak[];
        links: any[];
    };
    stats: Stats;
    filters: {
        status?: string;
    };
}

export default function OutbreakPage({ outbreaks, stats, filters }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [isCaseOpen, setIsCaseOpen] = useState(false);
    const [selectedOutbreak, setSelectedOutbreak] = useState<Outbreak | null>(null);
    const [viewingOutbreak, setViewingOutbreak] = useState<Outbreak | null>(null);

    const { data, setData, post, processing, reset, errors } = useForm({
        outbreak_name: '',
        outbreak_type: '',
        organism: '',
        start_date: new Date().toISOString().split('T')[0],
        affected_areas: [] as string[],
        description: '',
    });

    const caseForm = useForm({
        hn: '',
        patient_name: '',
        onset_date: new Date().toISOString().split('T')[0],
        symptoms: '',
        is_index_case: false,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/ic/outbreak', {
            onSuccess: () => {
                toast.success('บันทึก Outbreak เรียบร้อยแล้ว');
                reset();
                setIsOpen(false);
            },
        });
    };

    const handleAddCase = (outbreak: Outbreak) => {
        setSelectedOutbreak(outbreak);
        caseForm.reset();
        setIsCaseOpen(true);
    };

    const submitCase = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOutbreak) return;
        caseForm.post(`/ic/outbreak/${selectedOutbreak.id}/case`, {
            onSuccess: () => {
                toast.success('เพิ่ม Case เรียบร้อยแล้ว');
                setIsCaseOpen(false);
                setSelectedOutbreak(null);
            },
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'investigating':
                return <Badge variant="outline" className="border-blue-500 text-blue-600"><Activity className="h-3 w-3 mr-1" /> กำลังสอบสวน</Badge>;
            case 'ongoing':
                return <Badge className="bg-red-500"><AlertTriangle className="h-3 w-3 mr-1" /> กำลังระบาด</Badge>;
            case 'controlled':
                return <Badge className="bg-yellow-500"><ShieldAlert className="h-3 w-3 mr-1" /> ควบคุมแล้ว</Badge>;
            case 'closed':
                return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> ปิด</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const outbreakTypes = [
        { value: 'respiratory', label: 'ระบบทางเดินหายใจ' },
        { value: 'gastrointestinal', label: 'ระบบทางเดินอาหาร' },
        { value: 'bloodstream', label: 'การติดเชื้อในกระแสเลือด' },
        { value: 'wound', label: 'การติดเชื้อแผล' },
        { value: 'skin', label: 'การติดเชื้อผิวหนัง' },
        { value: 'urinary', label: 'ระบบทางเดินปัสสาวะ' },
        { value: 'other', label: 'อื่นๆ' },
    ];

    const wardOptions = [
        'IPD', 'ER', 'OPD', 'ICU', 'ห้องคลอด', 'ห้องผ่าตัด', 'Nursery',
    ];

    const breadcrumbs = [
        { title: 'IC', href: '/ic' },
        { title: 'Outbreak Management', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Outbreak Management - IC" />

            <div className="flex flex-col min-h-screen">
                {/* Hero Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-red-700 via-red-600 to-orange-600 text-white">
                    <div className="absolute inset-0 bg-grid-white/10"></div>
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>

                    <div className="relative px-6 py-8">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                                    <AlertOctagon className="h-10 w-10" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight">
                                        Outbreak Management
                                    </h1>
                                    <p className="text-white/80 text-lg">
                                        การจัดการและติดตามการระบาดของโรคติดเชื้อ
                                    </p>
                                </div>
                            </div>
                            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                                <DialogTrigger asChild>
                                    <Button className="gap-2 bg-white text-red-600 hover:bg-white/90">
                                        <Plus className="h-4 w-4" /> แจ้ง Outbreak ใหม่
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg">
                                    <DialogHeader>
                                        <DialogTitle>แจ้ง Outbreak ใหม่</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>ชื่อ Outbreak</Label>
                                            <Input
                                                placeholder="เช่น การระบาดของ Norovirus หอผู้ป่วยใน"
                                                value={data.outbreak_name}
                                                onChange={(e) => setData('outbreak_name', e.target.value)}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>ประเภทการระบาด</Label>
                                                <Select value={data.outbreak_type} onValueChange={(v) => setData('outbreak_type', v)}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="เลือก" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {outbreakTypes.map((t) => (
                                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>วันที่เริ่มพบ</Label>
                                                <Input
                                                    type="date"
                                                    value={data.start_date}
                                                    onChange={(e) => setData('start_date', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>เชื้อที่สงสัย / พบ</Label>
                                            <Input
                                                placeholder="เช่น Norovirus, E. coli"
                                                value={data.organism}
                                                onChange={(e) => setData('organism', e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>พื้นที่ที่ได้รับผลกระทบ</Label>
                                            <div className="flex flex-wrap gap-2">
                                                {wardOptions.map((ward) => (
                                                    <label key={ward} className="flex items-center gap-1 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={data.affected_areas.includes(ward)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setData('affected_areas', [...data.affected_areas, ward]);
                                                                } else {
                                                                    setData('affected_areas', data.affected_areas.filter(a => a !== ward));
                                                                }
                                                            }}
                                                            className="rounded"
                                                        />
                                                        <span className="text-sm">{ward}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>รายละเอียดเพิ่มเติม</Label>
                                            <Textarea
                                                value={data.description}
                                                onChange={(e) => setData('description', e.target.value)}
                                                placeholder="รายละเอียดเกี่ยวกับการระบาด..."
                                            />
                                        </div>

                                        <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={processing}>
                                            แจ้ง Outbreak
                                        </Button>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {/* Alert Banner for Active Outbreaks */}
                        {stats.active_outbreaks > 0 && (
                            <div className="bg-yellow-500/30 backdrop-blur-sm border border-yellow-300/50 rounded-xl p-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="h-6 w-6 animate-pulse" />
                                    <div>
                                        <div className="font-bold">แจ้งเตือน: มี Outbreak ที่กำลังดำเนินอยู่ {stats.active_outbreaks} รายการ</div>
                                        <div className="text-sm text-white/80">กรุณาติดตามและดำเนินมาตรการควบคุมอย่างเคร่งครัด</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                <div className="text-white/70 text-sm mb-1">Outbreak ทั้งหมด</div>
                                <div className="text-3xl font-bold">{stats.total_outbreaks}</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                <div className="text-white/70 text-sm mb-1">กำลังดำเนินอยู่</div>
                                <div className="text-3xl font-bold text-yellow-300">{stats.active_outbreaks}</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                <div className="text-white/70 text-sm mb-1">ผู้ป่วยทั้งหมด</div>
                                <div className="text-3xl font-bold">{stats.total_cases}</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                <div className="text-white/70 text-sm mb-1">ประเภทที่พบบ่อย</div>
                                <div className="text-xl font-bold">
                                    {stats.by_type.length > 0 
                                        ? outbreakTypes.find(t => t.value === stats.by_type[0]?.outbreak_type)?.label || '-'
                                        : '-'
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 p-6 space-y-6 bg-gray-50 dark:bg-gray-900">
                    {/* Filter */}
                    <div className="flex gap-4">
                        <Select
                            value={filters.status || 'all'}
                            onValueChange={(v) => router.get('/ic/outbreak', { status: v === 'all' ? '' : v }, { preserveState: true })}
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="สถานะ" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">ทั้งหมด</SelectItem>
                                <SelectItem value="investigating">กำลังสอบสวน</SelectItem>
                                <SelectItem value="ongoing">กำลังระบาด</SelectItem>
                                <SelectItem value="controlled">ควบคุมแล้ว</SelectItem>
                                <SelectItem value="closed">ปิด</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Outbreak Cards */}
                    {outbreaks.data.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <ShieldAlert className="h-16 w-16 text-green-500 mb-4" />
                                <p className="text-xl font-medium">ไม่มี Outbreak ในขณะนี้</p>
                                <p className="text-muted-foreground">สถานการณ์ปกติ</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {outbreaks.data.map((outbreak) => (
                                <Card key={outbreak.id} className={`border-l-4 ${
                                    outbreak.status === 'ongoing' ? 'border-l-red-500' :
                                    outbreak.status === 'investigating' ? 'border-l-blue-500' :
                                    outbreak.status === 'controlled' ? 'border-l-yellow-500' :
                                    'border-l-green-500'
                                }`}>
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <CardTitle className="text-lg">{outbreak.outbreak_name}</CardTitle>
                                                <CardDescription className="flex items-center gap-2 mt-1">
                                                    <span>{outbreak.outbreak_number}</span>
                                                    {outbreak.organism && (
                                                        <Badge variant="outline">{outbreak.organism}</Badge>
                                                    )}
                                                </CardDescription>
                                            </div>
                                            {getStatusBadge(outbreak.status)}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                <span>เริ่ม: {new Date(outbreak.start_date).toLocaleDateString('th-TH')}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4 text-muted-foreground" />
                                                <span>ผู้ป่วย: {outbreak.total_cases} ราย</span>
                                            </div>
                                            <div className="flex items-center gap-2 col-span-2">
                                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                                <span>พื้นที่: {outbreak.affected_areas?.join(', ') || '-'}</span>
                                            </div>
                                        </div>

                                        {outbreak.total_deaths > 0 && (
                                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2 text-red-700 dark:text-red-400 text-sm">
                                                เสียชีวิต: {outbreak.total_deaths} ราย
                                            </div>
                                        )}

                                        <div className="flex gap-2">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="flex-1"
                                                onClick={() => setViewingOutbreak(outbreak)}
                                            >
                                                <Eye className="h-4 w-4 mr-1" /> ดูรายละเอียด
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                className="flex-1"
                                                onClick={() => handleAddCase(outbreak)}
                                                disabled={outbreak.status === 'closed'}
                                            >
                                                <Plus className="h-4 w-4 mr-1" /> เพิ่ม Case
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Add Case Dialog */}
                    <Dialog open={isCaseOpen} onOpenChange={setIsCaseOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>เพิ่ม Case ใน Outbreak</DialogTitle>
                            </DialogHeader>
                            {selectedOutbreak && (
                                <form onSubmit={submitCase} className="space-y-4 py-4">
                                    <div className="p-3 bg-muted rounded-lg text-sm">
                                        <strong>{selectedOutbreak.outbreak_name}</strong>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>HN</Label>
                                            <Input
                                                value={caseForm.data.hn}
                                                onChange={(e) => caseForm.setData('hn', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>วันที่เริ่มมีอาการ</Label>
                                            <Input
                                                type="date"
                                                value={caseForm.data.onset_date}
                                                onChange={(e) => caseForm.setData('onset_date', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>ชื่อผู้ป่วย</Label>
                                        <Input
                                            value={caseForm.data.patient_name}
                                            onChange={(e) => caseForm.setData('patient_name', e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>อาการ</Label>
                                        <Textarea
                                            value={caseForm.data.symptoms}
                                            onChange={(e) => caseForm.setData('symptoms', e.target.value)}
                                            placeholder="อาการของผู้ป่วย..."
                                        />
                                    </div>

                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={caseForm.data.is_index_case}
                                            onChange={(e) => caseForm.setData('is_index_case', e.target.checked)}
                                            className="rounded"
                                        />
                                        <span>Index Case (ผู้ป่วยรายแรก)</span>
                                    </label>

                                    <Button type="submit" className="w-full" disabled={caseForm.processing}>
                                        เพิ่ม Case
                                    </Button>
                                </form>
                            )}
                        </DialogContent>
                    </Dialog>

                    {/* View Outbreak Details Dialog */}
                    <Dialog open={!!viewingOutbreak} onOpenChange={() => setViewingOutbreak(null)}>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>รายละเอียด Outbreak</DialogTitle>
                            </DialogHeader>
                            {viewingOutbreak && (
                                <div className="space-y-4 py-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold">{viewingOutbreak.outbreak_name}</h3>
                                            <p className="text-sm text-muted-foreground">{viewingOutbreak.outbreak_number}</p>
                                        </div>
                                        {getStatusBadge(viewingOutbreak.status)}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                                        <div>
                                            <div className="text-sm text-muted-foreground">ประเภท</div>
                                            <div>{outbreakTypes.find(t => t.value === viewingOutbreak.outbreak_type)?.label}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-muted-foreground">เชื้อ</div>
                                            <div>{viewingOutbreak.organism || '-'}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-muted-foreground">วันที่เริ่ม</div>
                                            <div>{new Date(viewingOutbreak.start_date).toLocaleDateString('th-TH')}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-muted-foreground">พื้นที่</div>
                                            <div>{viewingOutbreak.affected_areas?.join(', ') || '-'}</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                            <div className="text-2xl font-bold text-blue-600">{viewingOutbreak.total_cases}</div>
                                            <div className="text-sm text-muted-foreground">ผู้ป่วยทั้งหมด</div>
                                        </div>
                                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                            <div className="text-2xl font-bold text-green-600">
                                                {viewingOutbreak.total_cases - viewingOutbreak.total_deaths}
                                            </div>
                                            <div className="text-sm text-muted-foreground">หายแล้ว</div>
                                        </div>
                                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                            <div className="text-2xl font-bold text-red-600">{viewingOutbreak.total_deaths}</div>
                                            <div className="text-sm text-muted-foreground">เสียชีวิต</div>
                                        </div>
                                    </div>

                                    {viewingOutbreak.control_measures && (
                                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                            <h4 className="font-medium text-yellow-700 dark:text-yellow-400 mb-2">มาตรการควบคุม</h4>
                                            <p className="text-sm whitespace-pre-wrap">{viewingOutbreak.control_measures}</p>
                                        </div>
                                    )}

                                    {/* Cases Table */}
                                    {viewingOutbreak.cases && viewingOutbreak.cases.length > 0 && (
                                        <div>
                                            <h4 className="font-medium mb-2">รายชื่อผู้ป่วย</h4>
                                            <div className="border rounded-lg overflow-hidden">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>HN</TableHead>
                                                            <TableHead>ชื่อ</TableHead>
                                                            <TableHead>วันที่เริ่มอาการ</TableHead>
                                                            <TableHead>สถานะ</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {viewingOutbreak.cases.map((c) => (
                                                            <TableRow key={c.id}>
                                                                <TableCell>
                                                                    {c.hn}
                                                                    {c.is_index_case && (
                                                                        <Badge variant="outline" className="ml-2">Index</Badge>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>{c.patient_name}</TableCell>
                                                                <TableCell>{new Date(c.onset_date).toLocaleDateString('th-TH')}</TableCell>
                                                                <TableCell>
                                                                    {c.outcome === 'recovered' && <Badge className="bg-green-500">หาย</Badge>}
                                                                    {c.outcome === 'active' && <Badge variant="outline">กำลังรักษา</Badge>}
                                                                    {c.outcome === 'death' && <Badge variant="destructive">เสียชีวิต</Badge>}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </AppLayout>
    );
}
