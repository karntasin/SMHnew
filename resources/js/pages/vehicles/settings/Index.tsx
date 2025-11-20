import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Settings } from 'lucide-react';

interface Category {
    id: number;
    name: string;
    icon?: string;
    color?: string;
    description?: string;
    is_active: boolean;
}

interface Props {
    categories: Category[];
}

export default function Index({ categories }: Props) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        icon: '',
        color: '#3b82f6',
        description: '',
    });

    const openCreate = () => {
        reset();
        clearErrors();
        setEditingCategory(null);
        setIsCreateOpen(true);
    };

    const openEdit = (category: Category) => {
        setData({
            name: category.name,
            icon: category.icon || '',
            color: category.color || '#3b82f6',
            description: category.description || '',
        });
        clearErrors();
        setEditingCategory(category);
        setIsCreateOpen(true);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCategory) {
            put(route('vehicles.settings.categories.update', editingCategory.id), {
                onSuccess: () => setIsCreateOpen(false),
            });
        } else {
            post(route('vehicles.settings.categories.store'), {
                onSuccess: () => setIsCreateOpen(false),
            });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('คุณแน่ใจหรือไม่ที่จะลบประเภทรถนี้?')) {
            router.delete(route('vehicles.settings.categories.destroy', id));
        }
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'ระบบจองรถ', href: route('vehicles.bookings.index') },
            { title: 'ตั้งค่า', href: route('vehicles.settings.index') }
        ]}>
            <Head title="ตั้งค่าระบบยานพาหนะ" />

            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Settings className="w-6 h-6" />
                        ตั้งค่าระบบยานพาหนะ
                    </h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Categories Management */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>ประเภทรถ (Vehicle Categories)</CardTitle>
                            <Button size="sm" onClick={openCreate}>
                                <Plus className="w-4 h-4 mr-2" />
                                เพิ่มประเภท
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ชื่อประเภท</TableHead>
                                        <TableHead>สี</TableHead>
                                        <TableHead className="text-right">จัดการ</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {categories.map((category) => (
                                        <TableRow key={category.id}>
                                            <TableCell className="font-medium">{category.name}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }}></div>
                                                    <span className="text-xs text-gray-500">{category.color}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(category)}>
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(category.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {categories.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-gray-500">ยังไม่มีข้อมูล</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Other settings can go here */}
                    <Card>
                        <CardHeader>
                            <CardTitle>การตั้งค่าอื่นๆ</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-500">ยังไม่มีการตั้งค่าเพิ่มเติม</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Create/Edit Dialog */}
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingCategory ? 'แก้ไขประเภทรถ' : 'เพิ่มประเภทรถ'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={submit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">ชื่อประเภท <span className="text-red-500">*</span></Label>
                                <Input 
                                    id="name" 
                                    value={data.name} 
                                    onChange={e => setData('name', e.target.value)}
                                    placeholder="เช่น รถเก๋ง, รถตู้"
                                />
                                {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="color">สี (สำหรับแสดงในปฏิทิน)</Label>
                                <div className="flex gap-2">
                                    <Input 
                                        id="color" 
                                        type="color"
                                        value={data.color} 
                                        onChange={e => setData('color', e.target.value)}
                                        className="w-12 h-10 p-1"
                                    />
                                    <Input 
                                        value={data.color} 
                                        onChange={e => setData('color', e.target.value)}
                                        placeholder="#000000"
                                    />
                                </div>
                                {errors.color && <p className="text-red-500 text-sm">{errors.color}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">รายละเอียดเพิ่มเติม</Label>
                                <Input 
                                    id="description" 
                                    value={data.description} 
                                    onChange={e => setData('description', e.target.value)}
                                />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>ยกเลิก</Button>
                                <Button type="submit" disabled={processing}>บันทึก</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
