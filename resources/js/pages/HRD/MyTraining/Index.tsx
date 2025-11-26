import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface Enrollment {
    id: number;
    status: string;
    completed_at: string | null;
    course: {
        title: string;
        start_date: string;
        end_date: string;
        hours: number;
        location: string;
    };
}

interface ExternalRecord {
    id: number;
    title: string;
    organizer: string;
    location: string;
    start_date: string;
    hours: number;
    status: string;
    certificate_path: string | null;
}

interface Props {
    enrollments: Enrollment[];
    externalRecords: ExternalRecord[];
}

const breadcrumbs = [
    {
        title: 'KM',
        href: '/km/dashboard',
    },
    {
        title: 'ระบบการเรียนรู้ (E-Learning)',
        href: '/km/learn/dashboard',
    },
    {
        title: 'การอบรมของฉัน',
        href: '/km/learn/my-training',
    },
];

export default function MyTrainingIndex({ enrollments, externalRecords }: Props) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        title: '',
        organizer: '',
        location: '',
        start_date: '',
        end_date: '',
        hours: '',
        certificate: null as File | null,
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
            case 'approved':
                return <Badge className="bg-green-500 hover:bg-green-600">สำเร็จ/อนุมัติ</Badge>;
            case 'pending':
                return <Badge variant="outline">รออนุมัติ</Badge>;
            case 'rejected':
                return <Badge variant="destructive">ปฏิเสธ</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('km.learn.external-records.store'), {
            onSuccess: () => {
                setIsDialogOpen(false);
                reset();
                toast.success('บันทึกข้อมูลเรียบร้อยแล้ว');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="ประวัติการฝึกอบรมของฉัน" />

            <div className="flex flex-col gap-6 p-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">ประวัติการฝึกอบรมของฉัน</h1>
                        <p className="text-muted-foreground">
                            ดูหลักสูตรที่ลงทะเบียนและประวัติการฝึกอบรม
                        </p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                บันทึกการอบรมภายนอก
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>บันทึกการอบรมภายนอก</DialogTitle>
                                <DialogDescription>
                                    กรอกรายละเอียดการฝึกอบรมที่คุณไปเข้าร่วมมาด้วยตนเอง
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="title">ชื่อหลักสูตร/หัวข้อ</Label>
                                    <Input 
                                        id="title" 
                                        value={data.title} 
                                        onChange={e => setData('title', e.target.value)}
                                        required 
                                    />
                                    {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="organizer">หน่วยงานที่จัด</Label>
                                    <Input 
                                        id="organizer" 
                                        value={data.organizer} 
                                        onChange={e => setData('organizer', e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="start_date">วันที่เริ่ม</Label>
                                        <Input 
                                            id="start_date" 
                                            type="date"
                                            value={data.start_date} 
                                            onChange={e => setData('start_date', e.target.value)}
                                            required 
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="end_date">วันที่สิ้นสุด</Label>
                                        <Input 
                                            id="end_date" 
                                            type="date"
                                            value={data.end_date} 
                                            onChange={e => setData('end_date', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="hours">จำนวนชั่วโมง</Label>
                                        <Input 
                                            id="hours" 
                                            type="number"
                                            step="0.5"
                                            value={data.hours} 
                                            onChange={e => setData('hours', e.target.value)}
                                            required 
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="location">สถานที่</Label>
                                        <Input 
                                            id="location" 
                                            value={data.location} 
                                            onChange={e => setData('location', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="certificate">ไฟล์เกียรติบัตร/หลักฐาน (ถ้ามี)</Label>
                                    <Input 
                                        id="certificate" 
                                        type="file"
                                        onChange={e => setData('certificate', e.target.files ? e.target.files[0] : null)}
                                    />
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={processing}>บันทึกข้อมูล</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <Tabs defaultValue="internal" className="w-full">
                    <TabsList>
                        <TabsTrigger value="internal">หลักสูตรภายใน (Internal)</TabsTrigger>
                        <TabsTrigger value="external">อบรมภายนอก (External)</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="internal">
                        <Card>
                            <CardHeader>
                                <CardTitle>หลักสูตรภายในโรงพยาบาล</CardTitle>
                                <CardDescription>
                                    ประวัติการอบรมที่จัดโดยโรงพยาบาล
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>ชื่อหลักสูตร</TableHead>
                                            <TableHead>วันที่</TableHead>
                                            <TableHead>ชั่วโมง</TableHead>
                                            <TableHead>สถานที่</TableHead>
                                            <TableHead>สถานะ</TableHead>
                                            <TableHead>วันที่สำเร็จ</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {enrollments.length > 0 ? (
                                            enrollments.map((enrollment) => (
                                                <TableRow key={enrollment.id}>
                                                    <TableCell className="font-medium">
                                                        {enrollment.course.title}
                                                    </TableCell>
                                                    <TableCell>
                                                        {new Date(enrollment.course.start_date).toLocaleDateString('th-TH')}
                                                    </TableCell>
                                                    <TableCell>{enrollment.course.hours}</TableCell>
                                                    <TableCell>{enrollment.course.location}</TableCell>
                                                    <TableCell>{getStatusBadge(enrollment.status)}</TableCell>
                                                    <TableCell>
                                                        {enrollment.completed_at 
                                                            ? new Date(enrollment.completed_at).toLocaleDateString('th-TH') 
                                                            : '-'}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                    ไม่พบข้อมูลการอบรมภายใน
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="external">
                        <Card>
                            <CardHeader>
                                <CardTitle>ประวัติการอบรมภายนอก</CardTitle>
                                <CardDescription>
                                    ข้อมูลการอบรมที่คุณบันทึกด้วยตนเอง
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>หัวข้อ/หลักสูตร</TableHead>
                                            <TableHead>หน่วยงานที่จัด</TableHead>
                                            <TableHead>วันที่</TableHead>
                                            <TableHead>ชั่วโมง</TableHead>
                                            <TableHead>สถานะ</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {externalRecords.length > 0 ? (
                                            externalRecords.map((record) => (
                                                <TableRow key={record.id}>
                                                    <TableCell className="font-medium">
                                                        {record.title}
                                                    </TableCell>
                                                    <TableCell>{record.organizer}</TableCell>
                                                    <TableCell>
                                                        {new Date(record.start_date).toLocaleDateString('th-TH')}
                                                    </TableCell>
                                                    <TableCell>{record.hours}</TableCell>
                                                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                    ไม่พบข้อมูลการอบรมภายนอก
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
