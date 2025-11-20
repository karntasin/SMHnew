import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2 } from 'lucide-react';

interface SettingsProps {
    categories: any[];
    priorities: any[];
}

export default function Settings({ categories, priorities }: SettingsProps) {
    const [activeTab, setActiveTab] = useState<'categories' | 'priorities'>('categories');

    return (
        <AppLayout breadcrumbs={[
            { title: 'ระบบแจ้งซ่อม', href: route('maintenance.dashboard') },
            { title: 'ตั้งค่า', href: '#' }
        ]}>
            <Head title="ตั้งค่าระบบแจ้งซ่อม" />

            <div className="p-6">
                <div className="flex space-x-2 mb-6">
                    <Button 
                        variant={activeTab === 'categories' ? 'default' : 'outline'}
                        onClick={() => setActiveTab('categories')}
                    >
                        หมวดหมู่
                    </Button>
                    <Button 
                        variant={activeTab === 'priorities' ? 'default' : 'outline'}
                        onClick={() => setActiveTab('priorities')}
                    >
                        ระดับความสำคัญ
                    </Button>
                </div>

                {activeTab === 'categories' && <CategorySettings categories={categories} />}
                {activeTab === 'priorities' && <PrioritySettings priorities={priorities} />}
            </div>
        </AppLayout>
    );
}

function CategorySettings({ categories }: { categories: any[] }) {
    const { data, setData, post, processing, reset } = useForm({
        name: '',
        description: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('maintenance.settings.categories.store'), {
            onSuccess: () => reset(),
        });
    };

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>เพิ่มหมวดหมู่</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>ชื่อ</Label>
                            <Input 
                                value={data.name} 
                                onChange={e => setData('name', e.target.value)} 
                                placeholder="เช่น ไฟฟ้า, ประปา"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>รายละเอียด</Label>
                            <Input 
                                value={data.description} 
                                onChange={e => setData('description', e.target.value)} 
                                placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                            />
                        </div>
                        <Button type="submit" disabled={processing}>เพิ่มหมวดหมู่</Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>หมวดหมู่ที่มีอยู่</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ชื่อ</TableHead>
                                <TableHead>รายละเอียด</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.map(cat => (
                                <TableRow key={cat.id}>
                                    <TableCell>{cat.name}</TableCell>
                                    <TableCell>{cat.description}</TableCell>
                                    <TableCell>
                                        {/* Delete button implementation would go here */}
                                        <Button variant="ghost" size="icon" disabled>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

function PrioritySettings({ priorities }: { priorities: any[] }) {
    const { data, setData, post, processing, reset } = useForm({
        name: '',
        level: 1,
        color: '#000000',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('maintenance.settings.priorities.store'), {
            onSuccess: () => reset(),
        });
    };

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>เพิ่มระดับความสำคัญ</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>ชื่อ</Label>
                            <Input 
                                value={data.name} 
                                onChange={e => setData('name', e.target.value)} 
                                placeholder="เช่น ด่วนมาก"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>ระดับ (1-5)</Label>
                            <Input 
                                type="number"
                                min="1"
                                max="5"
                                value={data.level} 
                                onChange={e => setData('level', parseInt(e.target.value))} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>สี</Label>
                            <div className="flex gap-2">
                                <Input 
                                    type="color"
                                    value={data.color} 
                                    onChange={e => setData('color', e.target.value)} 
                                    className="w-12 p-1 h-10"
                                />
                                <Input 
                                    value={data.color} 
                                    onChange={e => setData('color', e.target.value)} 
                                    placeholder="#000000"
                                />
                            </div>
                        </div>
                        <Button type="submit" disabled={processing}>เพิ่มระดับความสำคัญ</Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>ระดับความสำคัญที่มีอยู่</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ชื่อ</TableHead>
                                <TableHead>ระดับ</TableHead>
                                <TableHead>สี</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {priorities.map(prio => (
                                <TableRow key={prio.id}>
                                    <TableCell>{prio.name}</TableCell>
                                    <TableCell>{prio.level}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: prio.color }}></div>
                                            {prio.color}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
