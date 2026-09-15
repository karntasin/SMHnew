import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import EquipmentSubNav from '../EquipmentSubNav';

interface Props {
    categories: any[];
}

export default function SettingsIndex({ categories }: Props) {
    const form = useForm({ name: '', icon: 'Package', color: '#0f766e', description: '', sort_order: 0 });
    const [editing, setEditing] = useState<any>(null);
    const editForm = useForm({ name: '', icon: '', color: '', description: '', sort_order: 0, is_active: true });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(route('equipment-borrowing.settings.categories.store'), { onSuccess: () => form.reset() });
    };

    const saveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editing) return;
        editForm.put(route('equipment-borrowing.settings.categories.update', editing.id), { onSuccess: () => setEditing(null) });
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'ยืมอุปกรณ์แพทย์', href: route('equipment-borrowing.dashboard') },
            { title: 'ตั้งค่า', href: '#' },
        ]}>
            <Head title="ตั้งค่าระบบยืมอุปกรณ์" />

            <div className="container mx-auto max-w-3xl space-y-6 px-4 py-6">
                <EquipmentSubNav active="equipment-borrowing.settings.index" />

                <div>
                    <h1 className="text-2xl font-bold text-slate-800">ตั้งค่าหมวดหมู่อุปกรณ์</h1>
                    <p className="text-sm text-slate-500">กำหนดหมวดหมู่และสีสำหรับการ์ดอุปกรณ์</p>
                </div>

                <Card className="rounded-3xl border-slate-200/80 shadow-sm">
                    <CardHeader><CardTitle>เพิ่มหมวดหมู่</CardTitle></CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-3">
                            <div><Label>ชื่อหมวด *</Label><Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} className="rounded-xl" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><Label>สี</Label><Input type="color" value={form.data.color} onChange={(e) => form.setData('color', e.target.value)} /></div>
                                <div><Label>ลำดับ</Label><Input type="number" value={form.data.sort_order} onChange={(e) => form.setData('sort_order', Number(e.target.value))} className="rounded-xl" /></div>
                            </div>
                            <Button type="submit" disabled={form.processing} className="rounded-xl bg-teal-600 hover:bg-teal-700"><Plus className="mr-2 h-4 w-4" />เพิ่ม</Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="space-y-3">
                    {categories.map((cat) => (
                        <Card key={cat.id} className="rounded-2xl border-slate-200/80">
                            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                                <div className="flex items-center gap-3">
                                    <span className="h-8 w-8 rounded-full border" style={{ backgroundColor: cat.color }} />
                                    <div>
                                        <p className="font-semibold">{cat.name}</p>
                                        <p className="text-xs text-muted-foreground">ลำดับ {cat.sort_order}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => { setEditing(cat); editForm.setData({ name: cat.name, icon: cat.icon || '', color: cat.color, description: cat.description || '', sort_order: cat.sort_order, is_active: cat.is_active }); }}>
                                        แก้ไข
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {editing && (
                    <Card className="rounded-3xl border-teal-200">
                        <CardHeader><CardTitle>แก้ไข: {editing.name}</CardTitle></CardHeader>
                        <CardContent>
                            <form onSubmit={saveEdit} className="space-y-3">
                                <div><Label>ชื่อ</Label><Input value={editForm.data.name} onChange={(e) => editForm.setData('name', e.target.value)} className="rounded-xl" /></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><Label>สี</Label><Input type="color" value={editForm.data.color} onChange={(e) => editForm.setData('color', e.target.value)} /></div>
                                    <div><Label>ลำดับ</Label><Input type="number" value={editForm.data.sort_order} onChange={(e) => editForm.setData('sort_order', Number(e.target.value))} className="rounded-xl" /></div>
                                </div>
                                <div className="flex gap-2">
                                    <Button type="submit" disabled={editForm.processing} className="rounded-xl bg-teal-600 hover:bg-teal-700">บันทึก</Button>
                                    <Button type="button" variant="outline" className="rounded-xl" onClick={() => setEditing(null)}>ยกเลิก</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
