import React, { useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search } from 'lucide-react';
import EquipmentSubNav from '../EquipmentSubNav';
import EquipmentCatalogCard from '../EquipmentCatalogCard';

interface Props {
    equipment: { data: any[]; links: any[] };
    categories: any[];
    departments: any[];
    filters: { search?: string; category_id?: string; status?: string };
}

export default function EquipmentIndex({ equipment, categories, departments, filters }: Props) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [search, setSearch] = useState(filters.search || '');

    const form = useForm({
        category_id: '',
        asset_code: '',
        name: '',
        brand: '',
        model: '',
        serial_number: '',
        location: 'คลังศูนย์พัฒนาคุณภาพ',
        department_id: '',
        quantity_total: 1,
        unit: 'ชิ้น',
        status: 'available',
        is_active: true,
        notes: '',
        image: null as File | null,
    });

    const catalogItems = useMemo(() => {
        return (equipment?.data ?? []).map((item) => {
            const borrowed = Math.max(0, (item.quantity_total || 0) - (item.quantity_available || 0));
            const total = item.quantity_total || 0;
            const available = item.quantity_available || 0;
            return {
                id: item.id,
                name: item.name,
                asset_code: item.asset_code,
                brand: item.brand,
                location: item.location,
                image_url: item.image_url,
                unit: item.unit || 'ชิ้น',
                category: item.category ? { name: item.category.name, color: item.category.color } : null,
                status: item.status,
                quantity_total: total,
                quantity_borrowed: borrowed,
                quantity_available: available,
                borrowed_percent: total > 0 ? Math.round((borrowed / total) * 100) : 0,
                stock_label: available === 0 ? 'หมดสต็อก' : available <= 2 ? 'ใกล้หมด' : 'พร้อมใช้',
            };
        });
    }, [equipment]);

    const openCreate = () => {
        setEditing(null);
        form.transform((data) => data);
        form.reset();
        form.setData('quantity_total', 1);
        form.setData('unit', 'ชิ้น');
        form.setData('location', 'คลังศูนย์พัฒนาคุณภาพ');
        form.setData('status', 'available');
        form.setData('is_active', true);
        setOpen(true);
    };

    const openEdit = (item: any) => {
        const raw = (equipment?.data ?? []).find((e) => e.id === item.id);
        if (!raw) return;
        setEditing(raw);
        form.setData({
            category_id: raw.category_id ? String(raw.category_id) : '',
            asset_code: raw.asset_code,
            name: raw.name,
            brand: raw.brand || '',
            model: raw.model || '',
            serial_number: raw.serial_number || '',
            location: raw.location || '',
            department_id: raw.department_id ? String(raw.department_id) : '',
            quantity_total: raw.quantity_total,
            unit: raw.unit || 'ชิ้น',
            status: raw.status,
            is_active: raw.is_active,
            notes: raw.notes || '',
            image: null,
        });
        setOpen(true);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editing) {
            form.transform((data) => ({ ...data, _method: 'put' }));
            form.post(route('equipment-borrowing.equipment.update', editing.id), {
                forceFormData: true,
                onSuccess: () => {
                    setOpen(false);
                    setEditing(null);
                },
                onFinish: () => {
                    form.transform((data) => data);
                },
            });
        } else {
            form.post(route('equipment-borrowing.equipment.store'), {
                forceFormData: true,
                onSuccess: () => { setOpen(false); },
            });
        }
    };

    const applySearch = () => {
        router.get(route('equipment-borrowing.equipment.index'), { ...filters, search }, { preserveState: true });
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'ยืมอุปกรณ์แพทย์', href: route('equipment-borrowing.dashboard') },
            { title: 'จัดการอุปกรณ์', href: '#' },
        ]}>
            <Head title="จัดการอุปกรณ์" />

            <div className="container mx-auto space-y-6 px-4 py-6">
                <EquipmentSubNav active="equipment-borrowing.equipment.index" />

                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">จัดการอุปกรณ์</h1>
                        <p className="text-sm text-slate-500">เพิ่ม/แก้ไขอุปกรณ์ อัปโหลดรูป และดูสต็อก</p>
                    </div>
                    <Button onClick={openCreate} className="rounded-xl bg-teal-600 hover:bg-teal-700">
                        <Plus className="mr-2 h-4 w-4" />เพิ่มอุปกรณ์
                    </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                    <div className="relative max-w-xs flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                            placeholder="ค้นหาชื่อ/รหัส..."
                            className="rounded-xl pl-9"
                        />
                    </div>
                    <Select
                        value={filters.category_id || 'all'}
                        onValueChange={(v) =>
                            router.get(route('equipment-borrowing.equipment.index'), { ...filters, category_id: v === 'all' ? '' : v }, { preserveState: true })
                        }
                    >
                        <SelectTrigger className="w-44 rounded-xl"><SelectValue placeholder="หมวดหมู่" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">ทุกหมวด</SelectItem>
                            {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button variant="secondary" className="rounded-xl" onClick={applySearch}><Search className="h-4 w-4" /></Button>
                </div>

                {catalogItems.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
                        ยังไม่มีอุปกรณ์
                    </div>
                ) : (
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {catalogItems.map((item) => (
                            <EquipmentCatalogCard
                                key={item.id}
                                item={item}
                                mode="manage"
                                onEdit={() => openEdit(item)}
                                historyHref={route('equipment-borrowing.equipment.history', item.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'แก้ไขอุปกรณ์' : 'เพิ่มอุปกรณ์'}</DialogTitle>
                        <DialogDescription className="sr-only">
                            {editing ? 'แก้ไขรายละเอียดและรูปอุปกรณ์' : 'เพิ่มอุปกรณ์ใหม่เข้าระบบยืม'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1"><Label>รหัสทรัพย์สิน *</Label><Input value={form.data.asset_code} onChange={(e) => form.setData('asset_code', e.target.value)} /></div>
                            <div className="space-y-1"><Label>จำนวน *</Label><Input type="number" min={1} value={form.data.quantity_total} onChange={(e) => form.setData('quantity_total', Number(e.target.value))} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1"><Label>หน่วย</Label><Input value={form.data.unit} onChange={(e) => form.setData('unit', e.target.value)} placeholder="ชิ้น / ชุด" /></div>
                            <div className="space-y-1"><Label>สถานที่เก็บ</Label><Input value={form.data.location} onChange={(e) => form.setData('location', e.target.value)} /></div>
                        </div>
                        <div className="space-y-1"><Label>ชื่ออุปกรณ์ *</Label><Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1"><Label>ยี่ห้อ</Label><Input value={form.data.brand} onChange={(e) => form.setData('brand', e.target.value)} /></div>
                            <div className="space-y-1"><Label>รุ่น</Label><Input value={form.data.model} onChange={(e) => form.setData('model', e.target.value)} /></div>
                        </div>
                        <div className="space-y-1">
                            <Label>หมวดหมู่</Label>
                            <Select value={form.data.category_id || undefined} onValueChange={(v) => form.setData('category_id', v)}>
                                <SelectTrigger><SelectValue placeholder="เลือกหมวด" /></SelectTrigger>
                                <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1"><Label>รูปอุปกรณ์</Label><Input type="file" accept="image/*" onChange={(e) => form.setData('image', e.target.files?.[0] || null)} /></div>
                        <div className="space-y-1"><Label>หมายเหตุ</Label><Textarea value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} rows={2} /></div>
                        <Button type="submit" disabled={form.processing} className="w-full rounded-xl bg-teal-600 hover:bg-teal-700">บันทึก</Button>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
