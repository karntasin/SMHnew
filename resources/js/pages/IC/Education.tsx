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
    objectives: string | null;
    materials_url: string | null;
    attendees_count?: number;
    attendees?: Attendee[];
}

interface Attendee {
    id: number;
    employee_code: string;
    employee_name: string;
    department: string;
    post_test_score: number | null;
    passed: boolean;
}

interface Stats {
    total_trainings: number;
    total_attendees: number;
    total_hours: number;
    by_type: { training_type: string; total: number }[];
    by_month: { month: string; total: number }[];
}

interface Props {
    records: {
        data: EducationRecord[];
        links: any[];
    };
    stats: Stats;
    filters: {
        training_type?: string;
        month?: string;
    };
}

export default function Education({ records, stats, filters }: Props) {
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

    const breadcrumbs = [
        { title: 'IC', href: '/ic' },
        { title: 'Education & Training', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="IC Education & Training" />

            <div className="flex flex-col min-h-screen">
                {/* Hero Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-600 text-white">
                    <div className="absolute inset-0 bg-grid-white/10"></div>
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>

                    <div className="relative px-6 py-8">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                                    <GraduationCap className="h-10 w-10" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight">
                                        IC Education & Training
                                    </h1>
                                    <p className="text-white/80 text-lg">
                                        การอบรมและพัฒนาความรู้ด้านการควบคุมการติดเชื้อ
                                    </p>
                                </div>
                            </div>
                            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                                <DialogTrigger asChild>
                                    <Button className="gap-2 bg-white text-indigo-600 hover:bg-white/90">
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

                                        <Button type="submit" className="w-full" disabled={processing}>
                                            บันทึกการอบรม
                                        </Button>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
                                    <BookOpen className="h-4 w-4" /> การอบรมทั้งหมด
                                </div>
                                <div className="text-3xl font-bold">{stats.total_trainings}</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
                                    <Users className="h-4 w-4" /> ผู้เข้าอบรมสะสม
                                </div>
                                <div className="text-3xl font-bold">{stats.total_attendees}</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
                                    <Clock className="h-4 w-4" /> ชั่วโมงอบรมสะสม
                                </div>
                                <div className="text-3xl font-bold">{stats.total_hours}</div>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
                                    <Award className="h-4 w-4" /> เฉลี่ย/คน
                                </div>
                                <div className="text-3xl font-bold">
                                    {stats.total_attendees > 0 
                                        ? (stats.total_hours / stats.total_attendees * stats.total_trainings).toFixed(1)
                                        : 0
                                    } ชม.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 p-6 space-y-6 bg-gray-50 dark:bg-gray-900">
                    {/* Stats by Type */}
                    <div className="grid gap-4 md:grid-cols-5">
                        {trainingTypes.map((type) => {
                            const count = stats.by_type.find(t => t.training_type === type.value)?.total || 0;
                            return (
                                <Card key={type.value} className="text-center">
                                    <CardContent className="pt-4">
                                        <div className="text-2xl font-bold text-indigo-600">{count}</div>
                                        <div className="text-sm text-muted-foreground">{type.label}</div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Filter */}
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

                    {/* Training Records */}
                    {records.data.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <GraduationCap className="h-16 w-16 text-muted-foreground mb-4" />
                                <p className="text-xl font-medium">ยังไม่มีข้อมูลการอบรม</p>
                                <p className="text-muted-foreground">กดปุ่ม "เพิ่มการอบรม" เพื่อเริ่มต้น</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {records.data.map((record) => (
                                <Card key={record.id} className="hover:shadow-lg transition-shadow">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between">
                                            <Badge variant="outline">
                                                {trainingTypes.find(t => t.value === record.training_type)?.label}
                                            </Badge>
                                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                <Calendar className="h-4 w-4" />
                                                {new Date(record.training_date).toLocaleDateString('th-TH')}
                                            </div>
                                        </div>
                                        <CardTitle className="text-lg mt-2">{record.topic}</CardTitle>
                                        <CardDescription>
                                            {targetAudiences.find(t => t.value === record.target_audience)?.label}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex items-center gap-4 text-sm">
                                            <div className="flex items-center gap-1">
                                                <Users className="h-4 w-4 text-muted-foreground" />
                                                <span>{record.attendees_count || 0} คน</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                                <span>{record.duration_hours} ชม.</span>
                                            </div>
                                        </div>
                                        <div className="text-sm">
                                            <span className="text-muted-foreground">วิทยากร: </span>
                                            {record.trainer_name}
                                        </div>
                                        {record.location && (
                                            <div className="text-sm">
                                                <span className="text-muted-foreground">สถานที่: </span>
                                                {record.location}
                                            </div>
                                        )}
                                        <div className="flex gap-2 pt-2">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="flex-1"
                                                onClick={() => setViewingRecord(record)}
                                            >
                                                <Eye className="h-4 w-4 mr-1" /> ดูรายละเอียด
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                className="flex-1"
                                                onClick={() => handleAddAttendee(record)}
                                            >
                                                <Plus className="h-4 w-4 mr-1" /> เพิ่มผู้เข้าอบรม
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
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

                                    {viewingRecord.objectives && (
                                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                            <h4 className="font-medium text-indigo-700 dark:text-indigo-400 mb-2">วัตถุประสงค์</h4>
                                            <p className="text-sm whitespace-pre-wrap">{viewingRecord.objectives}</p>
                                        </div>
                                    )}

                                    {/* Attendees Table */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-medium">รายชื่อผู้เข้าอบรม ({viewingRecord.attendees_count || 0} คน)</h4>
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
                                                        {viewingRecord.attendees.map((a) => (
                                                            <TableRow key={a.id}>
                                                                <TableCell>{a.employee_code}</TableCell>
                                                                <TableCell>{a.employee_name}</TableCell>
                                                                <TableCell>{a.department}</TableCell>
                                                                <TableCell>{a.post_test_score ?? '-'}</TableCell>
                                                                <TableCell>
                                                                    {a.passed ? (
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
                </div>
            </div>
        </AppLayout>
    );
}
