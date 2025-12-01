import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EditProps {
    maintenanceRequest: any;
    categories: any[];
    priorities: any[];
}

export default function Edit({ maintenanceRequest, categories, priorities }: EditProps) {
    const { data, setData, put, processing, errors } = useForm({
        title: maintenanceRequest.title,
        description: maintenanceRequest.description,
        location: maintenanceRequest.location,
        category_id: maintenanceRequest.category_id?.toString() || '',
        priority_id: maintenanceRequest.priority_id?.toString() || '',
        // Images handling is complex for edit, usually we just allow adding new ones or deleting old ones separately
        // For simplicity here, we won't handle image updates in this form yet, or just allow adding new ones?
        // Let's stick to basic fields for now.
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('maintenance.requests.update', maintenanceRequest.id));
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'ระบบแจ้งซ่อม', href: route('maintenance.dashboard') },
            { title: 'รายการของฉัน', href: route('maintenance.requests.my') },
            { title: 'แก้ไขแจ้งซ่อม', href: '#' }
        ]}>
            <Head title="แก้ไขแจ้งซ่อม" />

            <div className="p-6 max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>แก้ไขรายการแจ้งซ่อม: {maintenanceRequest.ticket_number}</CardTitle>
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
                                    <Select value={data.category_id} onValueChange={val => setData('category_id', val)}>
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
                                    <Select value={data.priority_id} onValueChange={val => setData('priority_id', val)}>
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

                            <div className="flex justify-end gap-4">
                                <Link href={route('maintenance.requests.my')}>
                                    <Button variant="outline" type="button">ยกเลิก</Button>
                                </Link>
                                <Button type="submit" disabled={processing}>
                                    บันทึกการแก้ไข
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
