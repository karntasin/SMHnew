import React, { useEffect } from 'react';

import AppLayout from '@/layouts/app-layout';

import { Head, Link, useForm } from '@inertiajs/react';

import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';

import { Label } from '@/components/ui/label';

import { Textarea } from '@/components/ui/textarea';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import MaintenanceSubNav from '../MaintenanceSubNav';



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



    useEffect(() => {

        const params = new URLSearchParams(window.location.search);

        const categoryId = params.get('category_id');

        if (categoryId) {

            setData('category_id', categoryId);

        }

    }, []);



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

        <AppLayout

            breadcrumbs={[

                { title: 'ระบบแจ้งซ่อม', href: route('maintenance.dashboard') },

                { title: 'แจ้งซ่อมใหม่', href: '#' },

            ]}

        >

            <Head title="แบบฟอร์มแจ้งซ่อม" />



            <div className="relative min-h-screen overflow-hidden">

                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(249,115,22,0.14),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(245,158,11,0.10),_transparent_45%)]" />

                <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-orange-300/15 blur-3xl" />



                <div className="relative container mx-auto max-w-2xl space-y-6 px-4 py-6">

                    <MaintenanceSubNav active="maintenance.dashboard" />



                    <div>

                        <h1 className="text-2xl font-bold text-slate-800">แจ้งซ่อมใหม่</h1>

                        <p className="text-sm text-slate-500">กรอกรายละเอียดปัญหาเพื่อส่งเรื่องให้ทีมช่าง</p>

                    </div>



                    <Card className="rounded-3xl border-slate-200/80 shadow-xl shadow-orange-900/5">

                        <CardHeader>

                            <CardTitle>สร้างรายการแจ้งซ่อม</CardTitle>

                        </CardHeader>

                        <CardContent>

                            <form onSubmit={handleSubmit} className="space-y-6">

                                <div className="space-y-2">

                                    <Label htmlFor="title">หัวข้อการแจ้งซ่อม</Label>

                                    <Input

                                        id="title"

                                        className="rounded-xl"

                                        value={data.title}

                                        onChange={(e) => setData('title', e.target.value)}

                                        placeholder="เช่น แอร์เสียห้องประชุม"

                                    />

                                    {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}

                                </div>



                                <div className="space-y-2">

                                    <Label htmlFor="location">สถานที่ / จุดที่พบปัญหา</Label>

                                    <Input

                                        id="location"

                                        className="rounded-xl"

                                        value={data.location}

                                        onChange={(e) => setData('location', e.target.value)}

                                        placeholder="เช่น อาคาร A ห้อง 101"

                                    />

                                    {errors.location && <p className="text-sm text-red-500">{errors.location}</p>}

                                </div>



                                <div className="grid grid-cols-2 gap-4">

                                    <div className="space-y-2">

                                        <Label htmlFor="category">หมวดหมู่</Label>

                                        <Select

                                            value={data.category_id || undefined}

                                            onValueChange={(val) => setData('category_id', val)}

                                            disabled={categories.length === 0}

                                        >

                                            <SelectTrigger id="category" className="rounded-xl">

                                                <SelectValue

                                                    placeholder={

                                                        categories.length === 0 ? 'ยังไม่มีหมวดหมู่' : 'เลือกหมวดหมู่'

                                                    }

                                                />

                                            </SelectTrigger>

                                            <SelectContent>

                                                {categories.map((cat) => (

                                                    <SelectItem key={cat.id} value={String(cat.id)}>

                                                        {cat.name}

                                                    </SelectItem>

                                                ))}

                                            </SelectContent>

                                        </Select>

                                        {categories.length === 0 && (

                                            <p className="text-sm text-amber-600">

                                                กรุณาเพิ่มหมวดหมู่ที่เมนู ตั้งค่าระบบแจ้งซ่อม

                                            </p>

                                        )}

                                        {errors.category_id && <p className="text-sm text-red-500">{errors.category_id}</p>}

                                    </div>



                                    <div className="space-y-2">

                                        <Label htmlFor="priority">ความสำคัญ</Label>

                                        <Select

                                            value={data.priority_id || undefined}

                                            onValueChange={(val) => setData('priority_id', val)}

                                            disabled={priorities.length === 0}

                                        >

                                            <SelectTrigger id="priority" className="rounded-xl">

                                                <SelectValue

                                                    placeholder={

                                                        priorities.length === 0

                                                            ? 'ยังไม่มีระดับความสำคัญ'

                                                            : 'เลือกระดับความสำคัญ'

                                                    }

                                                />

                                            </SelectTrigger>

                                            <SelectContent>

                                                {priorities.map((prio) => (

                                                    <SelectItem key={prio.id} value={String(prio.id)}>

                                                        {prio.name}

                                                    </SelectItem>

                                                ))}

                                            </SelectContent>

                                        </Select>

                                        {priorities.length === 0 && (

                                            <p className="text-sm text-amber-600">

                                                กรุณาเพิ่มระดับความสำคัญที่เมนู ตั้งค่าระบบแจ้งซ่อม

                                            </p>

                                        )}

                                        {errors.priority_id && <p className="text-sm text-red-500">{errors.priority_id}</p>}

                                    </div>

                                </div>



                                <div className="space-y-2">

                                    <Label htmlFor="description">รายละเอียดปัญหา</Label>

                                    <Textarea

                                        id="description"

                                        className="rounded-xl"

                                        value={data.description}

                                        onChange={(e) => setData('description', e.target.value)}

                                        placeholder="ระบุรายละเอียดของปัญหา..."

                                        rows={4}

                                    />

                                    {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}

                                </div>



                                <div className="space-y-2">

                                    <Label htmlFor="images">รูปภาพประกอบ (ถ้ามี)</Label>

                                    <Input

                                        id="images"

                                        type="file"

                                        className="rounded-xl"

                                        multiple

                                        accept="image/*"

                                        onChange={handleImageChange}

                                    />

                                    {errors.images && <p className="text-sm text-red-500">{errors.images}</p>}

                                </div>



                                <div className="flex justify-end gap-4">

                                    <Link href={route('maintenance.dashboard')}>

                                        <Button variant="outline" type="button" className="rounded-xl">

                                            ยกเลิก

                                        </Button>

                                    </Link>

                                    <Button type="submit" disabled={processing} className="rounded-xl bg-orange-600 hover:bg-orange-700">

                                        บันทึกแจ้งซ่อม

                                    </Button>

                                </div>

                            </form>

                        </CardContent>

                    </Card>

                </div>

            </div>

        </AppLayout>

    );

}

