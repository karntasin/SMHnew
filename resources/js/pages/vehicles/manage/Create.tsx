import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';

interface Category {
    id: number;
    name: string;
}

interface Props {
    categories: Category[];
}

export default function Create({ categories }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        license_plate: '',
        brand: '',
        model: '',
        category_id: '',
        capacity: '4', // Form uses capacity, controller maps to seats if needed, but let's match controller expectation
        color: '',
        status: 'available',
        image: null as File | null,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('vehicles.manage.store'));
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'จัดการรถ', href: route('vehicles.manage.index') },
            { title: 'เพิ่มรถใหม่', href: '#' }
        ]}>
            <Head title="เพิ่มรถใหม่" />

            <div className="max-w-2xl mx-auto p-6">
                <Link href={route('vehicles.manage.index')} className="flex items-center text-gray-500 hover:text-gray-700 mb-4">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    ย้อนกลับ
                </Link>

                <Card>
                    <CardHeader>
                        <CardTitle>เพิ่มข้อมูลรถใหม่</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="license_plate">ทะเบียนรถ <span className="text-red-500">*</span></Label>
                                    <Input 
                                        id="license_plate" 
                                        value={data.license_plate} 
                                        onChange={e => setData('license_plate', e.target.value)}
                                        placeholder="เช่น 1กข-1234"
                                    />
                                    {errors.license_plate && <p className="text-red-500 text-sm">{errors.license_plate}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="category_id">ประเภทรถ <span className="text-red-500">*</span></Label>
                                    <Select onValueChange={(val) => setData('category_id', val)} value={data.category_id}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="เลือกประเภท" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map(cat => (
                                                <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.category_id && <p className="text-red-500 text-sm">{errors.category_id}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="brand">ยี่ห้อ <span className="text-red-500">*</span></Label>
                                    <Input 
                                        id="brand" 
                                        value={data.brand} 
                                        onChange={e => setData('brand', e.target.value)}
                                        placeholder="Toyota, Honda..."
                                    />
                                    {errors.brand && <p className="text-red-500 text-sm">{errors.brand}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="model">รุ่น <span className="text-red-500">*</span></Label>
                                    <Input 
                                        id="model" 
                                        value={data.model} 
                                        onChange={e => setData('model', e.target.value)}
                                        placeholder="Commuter, Camry..."
                                    />
                                    {errors.model && <p className="text-red-500 text-sm">{errors.model}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="capacity">จำนวนที่นั่ง <span className="text-red-500">*</span></Label>
                                    <Input 
                                        id="capacity" 
                                        type="number"
                                        value={data.capacity} 
                                        onChange={e => setData('capacity', e.target.value)}
                                    />
                                    {errors.capacity && <p className="text-red-500 text-sm">{errors.capacity}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="color">สีตัวรถ</Label>
                                    <Input 
                                        id="color" 
                                        value={data.color} 
                                        onChange={e => setData('color', e.target.value)}
                                        placeholder="ขาว, ดำ, บรอนซ์..."
                                    />
                                    {errors.color && <p className="text-red-500 text-sm">{errors.color}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">สถานะเริ่มต้น</Label>
                                <Select onValueChange={(val) => setData('status', val)} value={data.status}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="available">ว่าง (Available)</SelectItem>
                                        <SelectItem value="maintenance">ซ่อมบำรุง (Maintenance)</SelectItem>
                                        <SelectItem value="busy">ไม่ว่าง (Busy)</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.status && <p className="text-red-500 text-sm">{errors.status}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="image">รูปภาพรถ</Label>
                                <Input 
                                    id="image" 
                                    type="file" 
                                    accept="image/*"
                                    onChange={e => setData('image', e.target.files ? e.target.files[0] : null)}
                                />
                                {errors.image && <p className="text-red-500 text-sm">{errors.image}</p>}
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button type="submit" disabled={processing}>
                                    <Save className="w-4 h-4 mr-2" />
                                    บันทึกข้อมูล
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
