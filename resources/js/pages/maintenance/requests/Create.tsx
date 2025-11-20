import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CreateProps {
    categories: any[];
    priorities: any[];
}

export default function Create({ categories, priorities }: CreateProps) {
    const { data, setData, post, processing, errors } = useForm({
        title: '',
        description: '',
        location: '',
        category_id: '',
        priority_id: '',
        images: [] as File[],
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('maintenance.requests.store'));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setData('images', Array.from(e.target.files));
        }
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'ระบบแจ้งซ่อม', href: route('maintenance.dashboard') },
            { title: 'แจ้งซ่อมใหม่', href: '#' }
        ]}>
            <Head title="แบบฟอร์มแจ้งซ่อม" />

            <div className="p-6 max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>สร้างรายการแจ้งซ่อม</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="title">หัวข้อการแจ้งซ่อม</Label>
                                <Input
                                    id="title"
                                    value={data.title}
                                    onChange={e => setData('title', e.target.value)}
                                    placeholder="เช่น แอร์เสียห้องประชุม"
                                />
                                {errors.title && <p className="text-red-500 text-sm">{errors.title}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="location">สถานที่ / จุดที่พบปัญหา</Label>
                                <Input
                                    id="location"
                                    value={data.location}
                                    onChange={e => setData('location', e.target.value)}
                                    placeholder="เช่น อาคาร A ห้อง 101"
                                />
                                {errors.location && <p className="text-red-500 text-sm">{errors.location}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="category">หมวดหมู่</Label>
                                    <Select onValueChange={val => setData('category_id', val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="เลือกหมวดหมู่" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map(cat => (
                                                <SelectItem key={cat.id} value={cat.id.toString()}>
                                                    {cat.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.category_id && <p className="text-red-500 text-sm">{errors.category_id}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="priority">ความสำคัญ</Label>
                                    <Select onValueChange={val => setData('priority_id', val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="เลือกระดับความสำคัญ" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {priorities.map(prio => (
                                                <SelectItem key={prio.id} value={prio.id.toString()}>
                                                    {prio.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.priority_id && <p className="text-red-500 text-sm">{errors.priority_id}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">รายละเอียดปัญหา</Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={e => setData('description', e.target.value)}
                                    placeholder="ระบุรายละเอียดของปัญหา..."
                                    rows={4}
                                />
                                {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="images">รูปภาพประกอบ (ถ้ามี)</Label>
                                <Input
                                    id="images"
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleImageChange}
                                />
                                {errors.images && <p className="text-red-500 text-sm">{errors.images}</p>}
                            </div>

                            <div className="flex justify-end gap-4">
                                <Link href={route('maintenance.dashboard')}>
                                    <Button variant="outline" type="button">ยกเลิก</Button>
                                </Link>
                                <Button type="submit" disabled={processing}>
                                    บันทึกแจ้งซ่อม
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
