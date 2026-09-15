import React, { useState } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';

const breadcrumbs = [
    { title: 'KM', href: '/km/dashboard' },
    { title: 'ระบบการเรียนรู้ (E-Learning)', href: '/km/learn/dashboard' },
    { title: 'สร้างหลักสูตรใหม่', href: '#' },
];

export default function CreateCourse() {
    const [showMore, setShowMore] = useState(false);
    const { data, setData, post, processing, errors } = useForm({
        title: '',
        description: '',
        type: 'online',
        start_date: '',
        end_date: '',
        hours: 1,
        location: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('km.learn.courses.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="สร้างหลักสูตรใหม่" />

            <div className="container mx-auto max-w-2xl p-6">
                <Link
                    href={route('km.learn.index')}
                    className="mb-4 flex items-center text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> กลับไปหน้ารายการหลักสูตร
                </Link>

                <Card>
                    <CardHeader>
                        <CardTitle>สร้างหลักสูตรใหม่</CardTitle>
                        <CardDescription>
                            กรอกข้อมูลสั้นๆ แล้วไปจัดโครงเนื้อหาทันที ระบบจะสร้างบทแรกและหัวข้อแรกให้อัตโนมัติ
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">ชื่อหลักสูตร</Label>
                                <Input
                                    id="title"
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    placeholder="เช่น ความปลอดภัยไซเบอร์สำหรับบุคลากร"
                                    required
                                    autoFocus
                                />
                                {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">รายละเอียดสั้นๆ</Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    placeholder="ผู้เรียนจะได้อะไรจากหลักสูตรนี้"
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="type">ประเภทหลักสูตร</Label>
                                    <Select value={data.type} onValueChange={(val) => setData('type', val)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="online">หลักสูตรออนไลน์</SelectItem>
                                            <SelectItem value="internal">อบรมภายใน</SelectItem>
                                            <SelectItem value="external">อบรมภายนอก</SelectItem>
                                            <SelectItem value="ojt">การสอนงาน (OJT)</SelectItem>
                                            <SelectItem value="conference">ประชุม/สัมมนา</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="hours">จำนวนชั่วโมง</Label>
                                    <Input
                                        id="hours"
                                        type="number"
                                        step="0.5"
                                        min={0}
                                        value={data.hours}
                                        onChange={(e) => setData('hours', parseFloat(e.target.value) || 0)}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowMore(!showMore)}
                                className="flex w-full items-center justify-between rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground hover:bg-muted/40"
                            >
                                <span>ข้อมูลเพิ่มเติม (ถ้ามี) — วันที่ / สถานที่</span>
                                {showMore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>

                            {showMore && (
                                <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="start_date">วันที่เริ่ม</Label>
                                            <Input
                                                id="start_date"
                                                type="date"
                                                value={data.start_date}
                                                onChange={(e) => setData('start_date', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="end_date">วันที่สิ้นสุด</Label>
                                            <Input
                                                id="end_date"
                                                type="date"
                                                value={data.end_date}
                                                onChange={(e) => setData('end_date', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="location">สถานที่ / ลิงก์</Label>
                                        <Input
                                            id="location"
                                            value={data.location}
                                            onChange={(e) => setData('location', e.target.value)}
                                            placeholder="เช่น ห้องประชุม 1 หรือ Zoom"
                                        />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={processing} className="w-full bg-emerald-600 hover:bg-emerald-700">
                                {processing ? 'กำลังสร้าง...' : 'สร้างแล้วไปจัดเนื้อหา'}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </AppLayout>
    );
}
