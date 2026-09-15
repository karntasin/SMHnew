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
    GraduationCap,
    Plus,
    Users,
    Calendar,
    Clock,
    FileText,
    CheckCircle2,
    BookOpen,
    Award,
    Eye,
} from 'lucide-react';
import { toast } from 'sonner';

interface EducationRecord {
    id: number;
    topic: string;
    training_type: string;
    target_audience: string;
    trainer_name: string;
    training_date: string;
    duration_hours: number;
    location: string | null;
    objectives?: string | null;
    content_summary?: string | null;
    materials_url?: string | null;
    total_participants?: number;
    attendees_count?: number;
    attendees?: Attendee[];
}

interface Attendee {
    id: number;
    employee_code?: string;
    employee_name?: string;
    attendee_name?: string;
    department: string | null;
    post_test_score: number | null;
    passed: boolean;
}

interface Stats {
    total_trainings?: number;
    total_attendees?: number;
    total_hours?: number;
    by_type?: { training_type: string; total: number }[];
    by_month?: { month: string; total: number }[];
}

interface Props {
    records: {
        data: EducationRecord[];
        links: any[];
    };
    stats?: Stats;
    filters: {
        training_type?: string;
        month?: string;
    };
}

const defaultStats: Stats = {
    total_trainings: 0,
    total_attendees: 0,
    total_hours: 0,
    by_type: [],
    by_month: [],
};

const attendeeCount = (record: EducationRecord) =>
    record.attendees_count ?? record.total_participants ?? record.attendees?.length ?? 0;

const recordObjectives = (record: EducationRecord) =>
    record.objectives ?? record.content_summary ?? null;

const attendeeName = (attendee: Attendee) =>
    attendee.employee_name ?? attendee.attendee_name ?? '-';

export default function Education({ records, stats: rawStats, filters }: Props) {
    const stats = {
        ...defaultStats,
        ...rawStats,
        by_type: rawStats?.by_type ?? [],
        by_month: rawStats?.by_month ?? [],
    };
    const recordRows = records?.data ?? [];
    const [isOpen, setIsOpen] = useState(false);
    const [isAttendeeOpen, setIsAttendeeOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<EducationRecord | null>(null);
    const [viewingRecord, setViewingRecord] = useState<EducationRecord | null>(null);

    const { data, setData, post, processing, reset } = useForm({
        topic: '',
        training_type: '',
        target_audience: '',
        trainer_name: '',
        training_date: new Date().toISOString().split('T')[0],
        duration_hours: 1,
        location: '',
        objectives: '',
        description: '',
    });

    const attendeeForm = useForm({
        employee_code: '',
        employee_name: '',
        department: '',
        post_test_score: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/ic/education', {
            onSuccess: () => {
                toast.success('บันทึกการอบรมเรียบร้อยแล้ว');
                reset();
                setIsOpen(false);
            },
        });
    };

    const handleAddAttendee = (record: EducationRecord) => {
        setSelectedRecord(record);
        attendeeForm.reset();
        setIsAttendeeOpen(true);
    };

    const submitAttendee = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRecord) return;
        attendeeForm.post(`/ic/education/${selectedRecord.id}/attendee`, {
            onSuccess: () => {
                toast.success('เพิ่มผู้เข้าอบรมเรียบร้อยแล้ว');
                setIsAttendeeOpen(false);
                attendeeForm.reset();
            },
        });
    };

    const trainingTypes = [
        { value: 'orientation', label: 'ปฐมนิเทศ (Orientation)' },
        { value: 'annual', label: 'อบรมประจำปี' },
        { value: 'update', label: 'อบรมทบทวน/Update' },
        { value: 'special', label: 'อบรมพิเศษ/Outbreak' },
        { value: 'workshop', label: 'Workshop' },
    ];

    const targetAudiences = [
        { value: 'all_staff', label: 'บุคลากรทุกคน' },
        { value: 'nurses', label: 'พยาบาล' },
        { value: 'doctors', label: 'แพทย์' },
        { value: 'nursing_assistants', label: 'ผู้ช่วยพยาบาล' },
        { value: 'housekeeping', label: 'แม่บ้าน/พนักงานทำความสะอาด' },
        { value: 'new_staff', label: 'บุคลากรใหม่' },
        { value: 'ic_team', label: 'ทีม IC' },
    ];

    const topics = [
        'การล้างมือ 7 ขั้นตอน (Hand Hygiene)',
        'การใช้ PPE อย่างถูกต้อง',
        'Standard Precautions',
        'Transmission-Based Precautions',
        'การจัดการขยะติดเชื้อ',
        'การทำความสะอาดและฆ่าเชื้อ',
        'การป้องกันการติดเชื้อจากเข็มทิ่มแทง',
        'การเฝ้าระวังการติดเชื้อในโรงพยาบาล',
        'การควบคุมการระบาด',
    ];

    const trainingDialog = (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 rounded-xl bg-rose-600 hover:bg-rose-700">
                    <Plus className="h-4 w-4" /> เพิ่มการอบรม
                </Button>
            </DialogTrigger>
                                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>เพิ่มการอบรม IC</DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>หัวข้อการอบรม</Label>
                                            <Select value={data.topic} onValueChange={(v) => setData('topic', v)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="เลือกหัวข้อ" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {topics.map((t) => (
                                                        <SelectItem key={t} value={t}>{t}</SelectItem>
                                                    ))}
                                                    <SelectItem value="other">อื่นๆ (ระบุเอง)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {data.topic === 'other' && (
                                                <Input
                                                    placeholder="ระบุหัวข้อ"
                                                    onChange={(e) => setData('topic', e.target.value)}
                                                />
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>ประเภทการอบรม</Label>
                                                <Select value={data.training_type} onValueChange={(v) => setData('training_type', v)}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="เลือก" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {trainingTypes.map((t) => (
                                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>กลุ่มเป้าหมาย</Label>
                                                <Select value={data.target_audience} onValueChange={(v) => setData('target_audience', v)}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="เลือก" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {targetAudiences.map((t) => (
                                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>วันที่อบรม</Label>
                                                <Input
                                                    type="date"
                                                    value={data.training_date}
                                                    onChange={(e) => setData('training_date', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>ระยะเวลา (ชั่วโมง)</Label>
                                                <Input
                                                    type="number"
                                                    min="0.5"
                                                    step="0.5"
                                                    value={data.duration_hours}
                                                    onChange={(e) => setData('duration_hours', parseFloat(e.target.value))}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>วิทยากร</Label>
                                            <Input
                                                placeholder="ชื่อวิทยากร"
                                                value={data.trainer_name}
                                                onChange={(e) => setData('trainer_name', e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>สถานที่</Label>
                                            <Input
                                                placeholder="ห้องประชุม / Online"
                                                value={data.location}
                                                onChange={(e) => setData('location', e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>วัตถุประสงค์</Label>
                                            <Textarea
                                                placeholder="วัตถุประสงค์ของการอบรม..."
                                                value={data.objectives}
                                                onChange={(e) => setData('objectives', e.target.value)}
                                            />
                                        </div>

                                        <Button type="submit" className="w-full rounded-xl bg-rose-600 hover:bg-rose-700" disabled={processing}>
                                            บันทึกการอบรม
                                        </Button>
                                    </form>
                                </DialogContent>
        </Dialog>
    );

    return (
        <QualityPage
            tone="rose"
            icon={GraduationCap}
            badge="ศูนย์พัฒนาคุณภาพ · IC"
            title="IC Education & Training"
            subtitle="การอบรมและพัฒนาความรู้ด้านการควบคุมการติดเชื้อ"
            headTitle="IC Education & Training"
            breadcrumbs={[
                { title: 'ศูนย์พัฒนาคุณภาพ', href: '/quality' },
                { title: 'Infection Control (IC)', href: '/ic' },
                { title: 'อบรม', href: '/ic/education' },
            ]}
            subNav={<IcSubNav active="ic.education" />}
            actions={trainingDialog}
        >
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard label="การอบรมทั้งหมด" value={stats.total_trainings ?? 0} icon={BookOpen} tone="slate" />
                <StatCard label="ผู้เข้าอบรมสะสม" value={stats.total_attendees ?? 0} icon={Users} tone="rose" />
                <StatCard label="ชั่วโมงอบรมสะสม" value={stats.total_hours ?? 0} icon={Clock} tone="violet" />
                <StatCard
                    label="เฉลี่ย/คน"
                    value={`${(stats.total_attendees ?? 0) > 0 ? ((stats.total_hours ?? 0) / (stats.total_attendees ?? 1)).toFixed(1) : 0} ชม.`}
                    icon={Award}
                    tone="amber"
                />
            </div>

                    <div className="grid gap-4 md:grid-cols-5">
                        {trainingTypes.map((type) => {
                            const count = (stats.by_type ?? []).find(t => t.training_type === type.value)?.total || 0;
                            return (
                                <StatCard key={type.value} label={type.label} value={count} icon={GraduationCap} tone="indigo" />
                            );
                        })}
                    </div>

                    <Panel title="กรองข้อมูล">
                    <div className="flex gap-4">
                        <Select
                            value={filters.training_type || 'all'}
                            onValueChange={(v) => router.get('/ic/education', { ...filters, training_type: v === 'all' ? '' : v }, { preserveState: true })}
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="ประเภทการอบรม" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">ทั้งหมด</SelectItem>
                                {trainingTypes.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            type="month"
                            value={filters.month || ''}
                            onChange={(e) => router.get('/ic/education', { ...filters, month: e.target.value }, { preserveState: true })}
                            className="w-[200px]"
                        />
                    </div>
                    </Panel>

                    {recordRows.length === 0 ? (
                        <EmptyState text="ยังไม่มีข้อมูลการอบรม — กดปุ่มเพิ่มการอบรมเพื่อเริ่มต้น" />
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {recordRows.map((record) => (
                                <div key={record.id} className="rounded-2xl border border-slate-200/70 bg-white shadow-sm transition-shadow hover:shadow-md">
                                    <div className="border-b border-slate-100 px-4 pb-2 pt-4">
                                        <div className="flex items-start justify-between">
                                            <Badge variant="outline">
                                                {trainingTypes.find(t => t.value === record.training_type)?.label}
                                            </Badge>
                                            <div className="flex items-center gap-1 text-sm text-slate-500">
                                                <Calendar className="h-4 w-4" />
                                                {new Date(record.training_date).toLocaleDateString('th-TH')}
                                            </div>
                                        </div>
                                        <h3 className="mt-2 text-lg font-bold text-slate-900">{record.topic}</h3>
                                        <p className="text-xs text-slate-500">
                                            {targetAudiences.find(t => t.value === record.target_audience)?.label}
                                        </p>
                                    </div>
                                    <div className="space-y-3 p-4">
                                        <div className="flex items-center gap-4 text-sm">
                                            <div className="flex items-center gap-1">
                                                <Users className="h-4 w-4 text-slate-400" />
                                                <span>{attendeeCount(record)} คน</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-4 w-4 text-slate-400" />
                                                <span>{record.duration_hours} ชม.</span>
                                            </div>
                                        </div>
                                        <div className="text-sm">
                                            <span className="text-slate-500">วิทยากร: </span>
                                            {record.trainer_name}
                                        </div>
                                        {record.location && (
                                            <div className="text-sm">
                                                <span className="text-slate-500">สถานที่: </span>
                                                {record.location}
                                            </div>
                                        )}
                                        <div className="flex gap-2 pt-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 rounded-xl"
                                                onClick={() => setViewingRecord(record)}
                                            >
                                                <Eye className="mr-1 h-4 w-4" /> ดูรายละเอียด
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700"
                                                onClick={() => handleAddAttendee(record)}
                                            >
                                                <Plus className="mr-1 h-4 w-4" /> เพิ่มผู้เข้าอบรม
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add Attendee Dialog */}
                    <Dialog open={isAttendeeOpen} onOpenChange={setIsAttendeeOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>เพิ่มผู้เข้าอบรม</DialogTitle>
                            </DialogHeader>
                            {selectedRecord && (
                                <form onSubmit={submitAttendee} className="space-y-4 py-4">
                                    <div className="p-3 bg-muted rounded-lg text-sm">
                                        <strong>{selectedRecord.topic}</strong>
                                        <p className="text-muted-foreground">
                                            {new Date(selectedRecord.training_date).toLocaleDateString('th-TH')}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>รหัสพนักงาน</Label>
                                            <Input
                                                value={attendeeForm.data.employee_code}
                                                onChange={(e) => attendeeForm.setData('employee_code', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>แผนก</Label>
                                            <Input
                                                value={attendeeForm.data.department}
                                                onChange={(e) => attendeeForm.setData('department', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>ชื่อ-สกุล</Label>
                                        <Input
                                            value={attendeeForm.data.employee_name}
                                            onChange={(e) => attendeeForm.setData('employee_name', e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>คะแนน Post-test (ถ้ามี)</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            placeholder="0-100"
                                            value={attendeeForm.data.post_test_score}
                                            onChange={(e) => attendeeForm.setData('post_test_score', e.target.value)}
                                        />
                                    </div>

                                    <Button type="submit" className="w-full" disabled={attendeeForm.processing}>
                                        เพิ่มผู้เข้าอบรม
                                    </Button>
                                </form>
                            )}
                        </DialogContent>
                    </Dialog>

                    {/* View Training Details Dialog */}
                    <Dialog open={!!viewingRecord} onOpenChange={() => setViewingRecord(null)}>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>รายละเอียดการอบรม</DialogTitle>
                            </DialogHeader>
                            {viewingRecord && (
                                <div className="space-y-4 py-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-bold">{viewingRecord.topic}</h3>
                                        <Badge>
                                            {trainingTypes.find(t => t.value === viewingRecord.training_type)?.label}
                                        </Badge>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                                        <div>
                                            <div className="text-sm text-muted-foreground">วันที่อบรม</div>
                                            <div>{new Date(viewingRecord.training_date).toLocaleDateString('th-TH')}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-muted-foreground">ระยะเวลา</div>
                                            <div>{viewingRecord.duration_hours} ชั่วโมง</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-muted-foreground">วิทยากร</div>
                                            <div>{viewingRecord.trainer_name}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-muted-foreground">สถานที่</div>
                                            <div>{viewingRecord.location || '-'}</div>
                                        </div>
                                        <div className="col-span-2">
                                            <div className="text-sm text-muted-foreground">กลุ่มเป้าหมาย</div>
                                            <div>{targetAudiences.find(t => t.value === viewingRecord.target_audience)?.label}</div>
                                        </div>
                                    </div>

                                    {recordObjectives(viewingRecord) && (
                                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                            <h4 className="font-medium text-indigo-700 dark:text-indigo-400 mb-2">วัตถุประสงค์</h4>
                                            <p className="text-sm whitespace-pre-wrap">{recordObjectives(viewingRecord)}</p>
                                        </div>
                                    )}

                                    {/* Attendees Table */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-medium">รายชื่อผู้เข้าอบรม ({attendeeCount(viewingRecord)} คน)</h4>
                                            <Button size="sm" onClick={() => {
                                                setViewingRecord(null);
                                                handleAddAttendee(viewingRecord);
                                            }}>
                                                <Plus className="h-4 w-4 mr-1" /> เพิ่ม
                                            </Button>
                                        </div>
                                        {viewingRecord.attendees && viewingRecord.attendees.length > 0 ? (
                                            <div className="border rounded-lg overflow-hidden">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>รหัส</TableHead>
                                                            <TableHead>ชื่อ-สกุล</TableHead>
                                                            <TableHead>แผนก</TableHead>
                                                            <TableHead>Post-test</TableHead>
                                                            <TableHead>ผลการอบรม</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {viewingRecord.attendees.map((attendee) => (
                                                            <TableRow key={attendee.id}>
                                                                <TableCell>{attendee.employee_code || '-'}</TableCell>
                                                                <TableCell>{attendeeName(attendee)}</TableCell>
                                                                <TableCell>{attendee.department || '-'}</TableCell>
                                                                <TableCell>{attendee.post_test_score ?? '-'}</TableCell>
                                                                <TableCell>
                                                                    {attendee.passed ? (
                                                                        <Badge className="bg-green-500">
                                                                            <CheckCircle2 className="h-3 w-3 mr-1" /> ผ่าน
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge variant="secondary">รอประเมิน</Badge>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground border rounded-lg">
                                                ยังไม่มีผู้เข้าอบรม
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
        </QualityPage>
    );
}
