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
    outbreak_name: string;
    detection_date: string;
    resolved_date: string | null;
    pathogen: string | null;
    affected_area: string;
    status: 'investigating' | 'active' | 'controlled' | 'resolved';
    severity: 'minor' | 'moderate' | 'major' | 'critical';
    total_cases: number;
    staff_cases: number;
    patient_cases: number;
    control_measures: string | null;
    cases?: OutbreakCase[];
}

interface OutbreakCase {
    id: number;
    outbreak_id: number;
    hn: string | null;
    patient_name: string | null;
    symptom_onset_date: string;
    symptoms: string | null;
    outcome: 'recovered' | 'ongoing' | 'deceased' | 'transferred';
    is_index_case?: boolean;
}

interface Stats {
    total_outbreaks?: number;
    active_outbreaks?: number;
    total_cases?: number;
    by_type?: { outbreak_type: string; total: number }[];
}

interface Props {
    outbreaks: {
        data: Outbreak[];
        links: any[];
    };
    stats?: Stats;
    filters: {
        status?: string;
    };
}

const defaultStats: Stats = {
    total_outbreaks: 0,
    active_outbreaks: 0,
    total_cases: 0,
    by_type: [],
};

export default function OutbreakPage({ outbreaks, stats: rawStats, filters }: Props) {
    const stats = { ...defaultStats, ...rawStats, by_type: rawStats?.by_type ?? [] };
    const outbreakRows = outbreaks?.data ?? [];
    const [isOpen, setIsOpen] = useState(false);
    const [isCaseOpen, setIsCaseOpen] = useState(false);
    const [selectedOutbreak, setSelectedOutbreak] = useState<Outbreak | null>(null);
    const [viewingOutbreak, setViewingOutbreak] = useState<Outbreak | null>(null);

    const { data, setData, post, processing, reset } = useForm({
        outbreak_name: '',
        detection_date: new Date().toISOString().split('T')[0],
        pathogen: '',
        affected_area: '',
        severity: 'moderate',
        source_investigation: '',
        control_measures: '',
    });

    const caseForm = useForm({
        hn: '',
        patient_name: '',
        onset_date: new Date().toISOString().split('T')[0],
        symptoms: '',
        is_index_case: false as boolean,
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
            case 'active':
                return <Badge className="bg-red-500"><AlertTriangle className="h-3 w-3 mr-1" /> กำลังระบาด</Badge>;
            case 'controlled':
                return <Badge className="bg-yellow-500"><ShieldAlert className="h-3 w-3 mr-1" /> ควบคุมแล้ว</Badge>;
            case 'resolved':
                return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> ปิด</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const severityOptions = [
        { value: 'minor', label: 'เล็กน้อย' },
        { value: 'moderate', label: 'ปานกลาง' },
        { value: 'major', label: 'รุนแรง' },
        { value: 'critical', label: 'วิกฤต' },
    ];

    const countDeaths = (outbreak: Outbreak) =>
        (outbreak.cases ?? []).filter((c) => c.outcome === 'deceased').length;

    const outbreakLabel = (id: number) => `OB-${String(id).padStart(4, '0')}`;

    const newOutbreakDialog = (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 rounded-xl bg-rose-600 hover:bg-rose-700">
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
                                                <Label>ระดับความรุนแรง</Label>
                                                <Select value={data.severity} onValueChange={(v) => setData('severity', v)}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="เลือก" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {severityOptions.map((t) => (
                                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>วันที่ตรวจพบ</Label>
                                                <Input
                                                    type="date"
                                                    value={data.detection_date}
                                                    onChange={(e) => setData('detection_date', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>เชื้อที่สงสัย / พบ</Label>
                                            <Input
                                                placeholder="เช่น Norovirus, E. coli"
                                                value={data.pathogen}
                                                onChange={(e) => setData('pathogen', e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>พื้นที่ที่ได้รับผลกระทบ</Label>
                                            <Input
                                                placeholder="เช่น IPD, ER, ICU"
                                                value={data.affected_area}
                                                onChange={(e) => setData('affected_area', e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>การสอบสวนหาแหล่งที่มา</Label>
                                            <Textarea
                                                value={data.source_investigation}
                                                onChange={(e) => setData('source_investigation', e.target.value)}
                                                placeholder="รายละเอียดการสอบสวน..."
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>มาตรการควบคุมเบื้องต้น</Label>
                                            <Textarea
                                                value={data.control_measures}
                                                onChange={(e) => setData('control_measures', e.target.value)}
                                                placeholder="มาตรการที่ดำเนินการแล้ว..."
                                            />
                                        </div>

                                        <Button type="submit" className="w-full rounded-xl bg-rose-600 hover:bg-rose-700" disabled={processing}>
                                            แจ้ง Outbreak
                                        </Button>
                                    </form>
                                </DialogContent>
        </Dialog>
    );

    return (
        <QualityPage
            tone="rose"
            icon={AlertOctagon}
            badge="ศูนย์พัฒนาคุณภาพ · IC"
            title="Outbreak Management"
            subtitle="การจัดการและติดตามการระบาดของโรคติดเชื้อ"
            headTitle="Outbreak Management - IC"
            breadcrumbs={[
                { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
                { title: 'Infection Control (IC)', href: '/ic' },
                { title: 'ระบาด', href: '/ic/outbreak' },
            ]}
            subNav={<IcSubNav active="ic.outbreak" />}
            actions={newOutbreakDialog}
        >
            {(stats.active_outbreaks ?? 0) > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="h-6 w-6 text-amber-600" />
                        <div>
                            <div className="font-bold text-amber-800">แจ้งเตือน: มี Outbreak ที่กำลังดำเนินอยู่ {stats.active_outbreaks} รายการ</div>
                            <div className="text-sm text-amber-700">กรุณาติดตามและดำเนินมาตรการควบคุมอย่างเคร่งครัด</div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard label="Outbreak ทั้งหมด" value={stats.total_outbreaks ?? 0} icon={AlertOctagon} tone="slate" />
                <StatCard label="กำลังดำเนินอยู่" value={stats.active_outbreaks ?? 0} icon={AlertTriangle} tone="rose" />
                <StatCard label="ผู้ป่วยทั้งหมด" value={stats.total_cases ?? 0} icon={Users} tone="amber" />
                <StatCard
                    label="ระดับที่พบบ่อย"
                    value={
                        stats.by_type.length > 0
                            ? severityOptions.find((t) => t.value === stats.by_type[0]?.outbreak_type)?.label || '-'
                            : '-'
                    }
                    icon={Activity}
                    tone="violet"
                />
            </div>

                    <Panel title="กรองข้อมูล">
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
                                <SelectItem value="active">กำลังระบาด</SelectItem>
                                <SelectItem value="controlled">ควบคุมแล้ว</SelectItem>
                                <SelectItem value="resolved">ปิดแล้ว</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    </Panel>

                    {outbreakRows.length === 0 ? (
                        <EmptyState text="ไม่มี Outbreak ในขณะนี้ — สถานการณ์ปกติ" />
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {outbreakRows.map((outbreak) => {
                                const deaths = countDeaths(outbreak);

                                return (
                                <div key={outbreak.id} className={`rounded-2xl border border-slate-200/70 bg-white shadow-sm border-l-4 ${
                                    outbreak.status === 'active' ? 'border-l-red-500' :
                                    outbreak.status === 'investigating' ? 'border-l-blue-500' :
                                    outbreak.status === 'controlled' ? 'border-l-yellow-500' :
                                    'border-l-green-500'
                                }`}>
                                    <div className="border-b border-slate-100 px-5 py-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-900">{outbreak.outbreak_name}</h3>
                                                <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                                    <span>{outbreakLabel(outbreak.id)}</span>
                                                    {outbreak.pathogen && (
                                                        <Badge variant="outline">{outbreak.pathogen}</Badge>
                                                    )}
                                                </p>
                                            </div>
                                            {getStatusBadge(outbreak.status)}
                                        </div>
                                    </div>
                                    <div className="space-y-4 p-5">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                <span>ตรวจพบ: {new Date(outbreak.detection_date).toLocaleDateString('th-TH')}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4 text-muted-foreground" />
                                                <span>ผู้ป่วย: {outbreak.total_cases} ราย</span>
                                            </div>
                                            <div className="flex items-center gap-2 col-span-2">
                                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                                <span>พื้นที่: {outbreak.affected_area || '-'}</span>
                                            </div>
                                        </div>

                                        {deaths > 0 && (
                                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2 text-red-700 dark:text-red-400 text-sm">
                                                เสียชีวิต: {deaths} ราย
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
                                                disabled={outbreak.status === 'resolved'}
                                            >
                                                <Plus className="h-4 w-4 mr-1" /> เพิ่ม Case
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                );
                            })}
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
                            {viewingOutbreak && (() => {
                                const deaths = countDeaths(viewingOutbreak);

                                return (
                                <div className="space-y-4 py-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold">{viewingOutbreak.outbreak_name}</h3>
                                            <p className="text-sm text-muted-foreground">{outbreakLabel(viewingOutbreak.id)}</p>
                                        </div>
                                        {getStatusBadge(viewingOutbreak.status)}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                                        <div>
                                            <div className="text-sm text-muted-foreground">ระดับความรุนแรง</div>
                                            <div>{severityOptions.find(t => t.value === viewingOutbreak.severity)?.label || '-'}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-muted-foreground">เชื้อ</div>
                                            <div>{viewingOutbreak.pathogen || '-'}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-muted-foreground">วันที่ตรวจพบ</div>
                                            <div>{new Date(viewingOutbreak.detection_date).toLocaleDateString('th-TH')}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-muted-foreground">พื้นที่</div>
                                            <div>{viewingOutbreak.affected_area || '-'}</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                            <div className="text-2xl font-bold text-blue-600">{viewingOutbreak.total_cases}</div>
                                            <div className="text-sm text-muted-foreground">ผู้ป่วยทั้งหมด</div>
                                        </div>
                                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                            <div className="text-2xl font-bold text-green-600">
                                                {viewingOutbreak.total_cases - deaths}
                                            </div>
                                            <div className="text-sm text-muted-foreground">ไม่เสียชีวิต</div>
                                        </div>
                                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                            <div className="text-2xl font-bold text-red-600">{deaths}</div>
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
                                                                <TableCell>{c.patient_name || '-'}</TableCell>
                                                                <TableCell>{new Date(c.symptom_onset_date).toLocaleDateString('th-TH')}</TableCell>
                                                                <TableCell>
                                                                    {c.outcome === 'recovered' && <Badge className="bg-green-500">หาย</Badge>}
                                                                    {c.outcome === 'ongoing' && <Badge variant="outline">กำลังรักษา</Badge>}
                                                                    {c.outcome === 'deceased' && <Badge variant="destructive">เสียชีวิต</Badge>}
                                                                    {c.outcome === 'transferred' && <Badge variant="secondary">ส่งต่อ</Badge>}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                );
                            })()}
                        </DialogContent>
                    </Dialog>
        </QualityPage>
    );
}
