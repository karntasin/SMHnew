import React from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';

const breadcrumbs = [
    { title: 'KM', href: '/km/dashboard' },
    { title: 'ระบบการเรียนรู้ (E-Learning)', href: '/km/learn/dashboard' },
    { title: 'สร้างหลักสูตรใหม่', href: '#' },
];

export default function CreateCourse() {
    const { data, setData, post, processing, errors } = useForm({
        title: '',
        description: '',
        type: 'internal',
        start_date: '',
        end_date: '',
        hours: 0,
        location: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('km.learn.courses.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="สร้างหลักสูตรใหม่" />

            <div className="container mx-auto p-6 max-w-2xl">
                <Link href={route('km.learn.index')} className="flex items-center text-muted-foreground hover:text-foreground mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> กลับไปหน้ารายการหลักสูตร
                </Link>

                <Card>
                    <CardHeader>
                        <CardTitle>สร้างหลักสูตรใหม่</CardTitle>
                        <CardDescription>กรอกข้อมูลพื้นฐานของหลักสูตร คุณสามารถเพิ่มบทเรียนและเนื้อหาได้ในภายหลัง</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">ชื่อหลักสูตร</Label>
                                <Input 
                                    id="title" 
                                    value={data.title} 
                                    onChange={e => setData('title', e.target.value)}
                                    required 
                                />
                                {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">รายละเอียด</Label>
                                <Textarea 
                                    id="description" 
                                    value={data.description} 
                                    onChange={e => setData('description', e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="type">ประเภทหลักสูตร</Label>
                                    <Select value={data.type} onValueChange={val => setData('type', val)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="internal">อบรมภายใน (Internal)</SelectItem>
                                            <SelectItem value="external">อบรมภายนอก (External)</SelectItem>
                                            <SelectItem value="online">หลักสูตรออนไลน์ (Online)</SelectItem>
                                            <SelectItem value="ojt">การสอนงาน (OJT)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="hours">จำนวนชั่วโมง</Label>
                                    <Input 
                                        id="hours" 
                                        type="number" 
                                        step="0.5"
                                        value={data.hours} 
                                        onChange={e => setData('hours', parseFloat(e.target.value))}
                                        required 
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="start_date">วันที่เริ่ม</Label>
                                    <Input 
                                        id="start_date" 
                                        type="datetime-local"
                                        value={data.start_date} 
                                        onChange={e => setData('start_date', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="end_date">วันที่สิ้นสุด</Label>
                                    <Input 
                                        id="end_date" 
                                        type="datetime-local"
                                        value={data.end_date} 
                                        onChange={e => setData('end_date', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="location">สถานที่</Label>
                                <Input 
                                    id="location" 
                                    value={data.location} 
                                    onChange={e => setData('location', e.target.value)}
                                    placeholder="เช่น ห้องประชุม 1 หรือ ลิงก์ออนไลน์"
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={processing} className="w-full">
                                สร้างและไปที่เครื่องมือสร้างหลักสูตร
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </AppLayout>
    );
}
