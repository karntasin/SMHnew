import React, { useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, router, useForm } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Car, ImagePlus, Pencil, Plus, Search, Tags, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import VehicleSubNav from '../VehicleSubNav';

interface Category {
    id: number;
    name: string;
    icon?: string | null;
    color?: string | null;
    description?: string | null;
    is_active: boolean;
    vehicles_count?: number;
}

interface Vehicle {
    id: number;
    license_plate: string;
    brand: string;
    model: string;
    color?: string | null;
    seats: number;
    status: string;
    category_id?: number | null;
    category?: { id: number; name: string; color?: string | null } | null;
    image_url?: string | null;
    bookings_count?: number;
}

interface Props {
    vehicles: Vehicle[];
    categories: Category[];
}

const emptyVehicleForm = {
    license_plate: '',
    brand: '',
    model: '',
    category_id: '',
    capacity: 4,
    color: '',
    status: 'available',
    image: null as File | null,
};

const emptyCategoryForm = {
    name: '',
    color: '#10b981',
    description: '',
};

export default function VehicleSettings({ vehicles = [], categories = [] }: Props) {
    const [search, setSearch] = useState('');
    const [section, setSection] = useState<'vehicles' | 'categories'>('vehicles');

    const [vehicleOpen, setVehicleOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const vehicleForm = useForm({ ...emptyVehicleForm });

    const [categoryOpen, setCategoryOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const categoryForm = useForm({ ...emptyCategoryForm });

    const filteredVehicles = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return vehicles;
        return vehicles.filter((v) =>
            [v.license_plate, v.brand, v.model, v.category?.name]
                .filter(Boolean)
                .some((val) => String(val).toLowerCase().includes(q)),
        );
    }, [vehicles, search]);

    const statusLabel = (status: string) => {
        if (status === 'available') return 'ว่าง';
        if (status === 'busy') return 'ไม่ว่าง';
        if (status === 'maintenance') return 'ซ่อมบำรุง';
        return status;
    };

    const openCreateVehicle = () => {
        setEditingVehicle(null);
        vehicleForm.setData({ ...emptyVehicleForm });
        vehicleForm.clearErrors();
        setPreview(null);
        setVehicleOpen(true);
    };

    const openEditVehicle = (vehicle: Vehicle) => {
        setEditingVehicle(vehicle);
        vehicleForm.setData({
            license_plate: vehicle.license_plate,
            brand: vehicle.brand,
            model: vehicle.model,
            category_id: vehicle.category_id ? String(vehicle.category_id) : '',
            capacity: vehicle.seats || 4,
            color: vehicle.color || '',
            status: vehicle.status || 'available',
            image: null,
        });
        vehicleForm.clearErrors();
        setPreview(vehicle.image_url || null);
        setVehicleOpen(true);
    };

    const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        vehicleForm.setData('image', file);
        if (file) setPreview(URL.createObjectURL(file));
    };

    const submitVehicle = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingVehicle) {
            vehicleForm.post(route('vehicles.settings.vehicles.update', editingVehicle.id), {
                forceFormData: true,
                onSuccess: () => {
                    setVehicleOpen(false);
                    setEditingVehicle(null);
                },
            });
        } else {
            vehicleForm.post(route('vehicles.settings.vehicles.store'), {
                forceFormData: true,
                onSuccess: () => setVehicleOpen(false),
            });
        }
    };

    const removeVehicle = (vehicle: Vehicle) => {
        if (!confirm(`ลบรถ "${vehicle.license_plate}" หรือไม่?`)) return;
        router.delete(route('vehicles.settings.vehicles.destroy', vehicle.id));
    };

    const openCreateCategory = () => {
        setEditingCategory(null);
        categoryForm.setData({ ...emptyCategoryForm });
        categoryForm.clearErrors();
        setCategoryOpen(true);
    };

    const openEditCategory = (category: Category) => {
        setEditingCategory(category);
        categoryForm.setData({
            name: category.name,
            color: category.color || '#10b981',
            description: category.description || '',
        });
        categoryForm.clearErrors();
        setCategoryOpen(true);
    };

    const submitCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCategory) {
            categoryForm.put(route('vehicles.settings.categories.update', editingCategory.id), {
                onSuccess: () => {
                    setCategoryOpen(false);
                    setEditingCategory(null);
                },
            });
        } else {
            categoryForm.post(route('vehicles.settings.categories.store'), {
                onSuccess: () => setCategoryOpen(false),
            });
        }
    };

    const removeCategory = (category: Category) => {
        if (!confirm(`ลบประเภท "${category.name}" หรือไม่?`)) return;
        router.delete(route('vehicles.settings.categories.destroy', category.id));
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'ระบบจองรถ', href: route('vehicles.index') },
                { title: 'ตั้งค่ารถ', href: route('vehicles.settings.index') },
            ]}
        >
            <Head title="ตั้งค่าระบบจองรถ" />

            <div className="container mx-auto space-y-6 px-4 py-6">
                <VehicleSubNav active="vehicles.settings.index" />

                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">ตั้งค่าระบบจองรถ</h1>
                        <p className="text-sm text-slate-500">เพิ่ม/แก้ไขรถ อัปโหลดรูป และกำหนดประเภทรถ</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {section === 'vehicles' ? (
                            <Button onClick={openCreateVehicle} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
                                <Plus className="mr-2 h-4 w-4" />
                                เพิ่มรถ
                            </Button>
                        ) : (
                            <Button onClick={openCreateCategory} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
                                <Plus className="mr-2 h-4 w-4" />
                                เพิ่มประเภท
                            </Button>
                        )}
                    </div>
                </div>

                <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                    <button
                        type="button"
                        onClick={() => setSection('vehicles')}
                        className={cn(
                            'rounded-xl px-4 py-2 text-sm font-medium transition',
                            section === 'vehicles' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500',
                        )}
                    >
                        จัดการรถ ({vehicles.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setSection('categories')}
                        className={cn(
                            'rounded-xl px-4 py-2 text-sm font-medium transition',
                            section === 'categories' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500',
                        )}
                    >
                        ประเภทรถ ({categories.length})
                    </button>
                </div>

                {section === 'vehicles' && (
                    <>
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="ค้นหาทะเบียน / ยี่ห้อ / รุ่น..."
                                className="rounded-xl pl-9"
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {filteredVehicles.map((vehicle) => (
                                <div key={vehicle.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                                    <div className="aspect-[16/10] bg-slate-100">
                                        {vehicle.image_url ? (
                                            <img src={vehicle.image_url} alt={vehicle.license_plate} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-emerald-300">
                                                <Car className="h-12 w-12" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-3 p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h3 className="font-semibold text-slate-800">{vehicle.license_plate}</h3>
                                                <p className="text-xs text-slate-500">
                                                    {vehicle.brand} {vehicle.model}
                                                </p>
                                            </div>
                                            <Badge variant={vehicle.status === 'available' ? 'default' : 'secondary'}>
                                                {statusLabel(vehicle.status)}
                                            </Badge>
                                        </div>
                                        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                                                {vehicle.seats} ที่นั่ง
                                            </span>
                                            {vehicle.category && (
                                                <span
                                                    className="rounded-full px-2 py-1"
                                                    style={{
                                                        backgroundColor: `${vehicle.category.color || '#10b981'}20`,
                                                        color: vehicle.category.color || '#047857',
                                                    }}
                                                >
                                                    {vehicle.category.name}
                                                </span>
                                            )}
                                            <span className="rounded-full bg-slate-100 px-2 py-1">
                                                {vehicle.bookings_count || 0} การจอง
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                className="flex-1 rounded-xl"
                                                onClick={() => openEditVehicle(vehicle)}
                                            >
                                                <Pencil className="mr-2 h-4 w-4" />
                                                แก้ไข
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="rounded-xl text-rose-600 hover:bg-rose-50"
                                                onClick={() => removeVehicle(vehicle)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {filteredVehicles.length === 0 && (
                            <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
                                ยังไม่มีรถในระบบ
                            </div>
                        )}
                    </>
                )}

                {section === 'categories' && (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {categories.map((category) => (
                                <div key={category.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                                    <div
                                        className="flex aspect-[16/10] items-center justify-center"
                                        style={{
                                            background: `linear-gradient(135deg, ${category.color || '#10b981'} 0%, #a7f3d0 55%, ${category.color || '#10b981'}88 100%)`,
                                        }}
                                    >
                                        <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
                                            <Tags className="h-10 w-10" style={{ color: category.color || '#10b981' }} />
                                        </div>
                                    </div>
                                    <div className="space-y-3 p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h3 className="font-semibold text-slate-800">{category.name}</h3>
                                                <p className="text-xs text-slate-500">
                                                    {category.description || 'ไม่มีรายละเอียด'}
                                                </p>
                                            </div>
                                            <Badge variant={category.is_active ? 'default' : 'secondary'}>
                                                {category.is_active ? 'ใช้งาน' : 'ปิด'}
                                            </Badge>
                                        </div>
                                        <div className="flex flex-wrap gap-2 text-xs">
                                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                                                {category.vehicles_count || 0} คัน
                                            </span>
                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                                                <span
                                                    className="h-2.5 w-2.5 rounded-full"
                                                    style={{ backgroundColor: category.color || '#10b981' }}
                                                />
                                                {category.color || '#10b981'}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                className="flex-1 rounded-xl"
                                                onClick={() => openEditCategory(category)}
                                            >
                                                <Pencil className="mr-2 h-4 w-4" />
                                                แก้ไข
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="rounded-xl text-rose-600 hover:bg-rose-50"
                                                onClick={() => removeCategory(category)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {categories.length === 0 && (
                            <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
                                ยังไม่มีประเภทรถ
                            </div>
                        )}
                    </>
                )}
            </div>

            <Dialog open={vehicleOpen} onOpenChange={setVehicleOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
                    <DialogHeader>
                        <DialogTitle>{editingVehicle ? 'แก้ไขข้อมูลรถ' : 'เพิ่มรถใหม่'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitVehicle} className="space-y-5">
                        <div className="space-y-2">
                            <Label>รูปรถ</Label>
                            <div className="overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50">
                                {preview ? (
                                    <img src={preview} alt="preview" className="h-44 w-full object-cover" />
                                ) : (
                                    <div className="flex h-44 flex-col items-center justify-center gap-2 text-slate-400">
                                        <ImagePlus className="h-8 w-8" />
                                        <span className="text-sm">อัปโหลดรูปรถ</span>
                                    </div>
                                )}
                            </div>
                            <Input type="file" accept="image/*" onChange={onImageChange} />
                            {vehicleForm.errors.image && (
                                <p className="text-sm text-rose-500">{vehicleForm.errors.image}</p>
                            )}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>ทะเบียนรถ *</Label>
                                <Input
                                    value={vehicleForm.data.license_plate}
                                    onChange={(e) => vehicleForm.setData('license_plate', e.target.value)}
                                    required
                                />
                                {vehicleForm.errors.license_plate && (
                                    <p className="text-sm text-rose-500">{vehicleForm.errors.license_plate}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>ประเภท *</Label>
                                <Select
                                    value={vehicleForm.data.category_id}
                                    onValueChange={(v) => vehicleForm.setData('category_id', v)}
                                >
                                    <SelectTrigger><SelectValue placeholder="เลือกประเภท" /></SelectTrigger>
                                    <SelectContent>
                                        {categories.map((c) => (
                                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {vehicleForm.errors.category_id && (
                                    <p className="text-sm text-rose-500">{vehicleForm.errors.category_id}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>ยี่ห้อ *</Label>
                                <Input
                                    value={vehicleForm.data.brand}
                                    onChange={(e) => vehicleForm.setData('brand', e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>รุ่น *</Label>
                                <Input
                                    value={vehicleForm.data.model}
                                    onChange={(e) => vehicleForm.setData('model', e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>จำนวนที่นั่ง *</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={vehicleForm.data.capacity}
                                    onChange={(e) => vehicleForm.setData('capacity', Number(e.target.value))}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>สีตัวรถ</Label>
                                <Input
                                    value={vehicleForm.data.color}
                                    onChange={(e) => vehicleForm.setData('color', e.target.value)}
                                    placeholder="ขาว, ดำ..."
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label>สถานะ</Label>
                                <Select
                                    value={vehicleForm.data.status}
                                    onValueChange={(v) => vehicleForm.setData('status', v)}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="available">ว่าง</SelectItem>
                                        <SelectItem value="busy">ไม่ว่าง</SelectItem>
                                        <SelectItem value="maintenance">ซ่อมบำรุง</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setVehicleOpen(false)}>
                                ยกเลิก
                            </Button>
                            <Button type="submit" disabled={vehicleForm.processing} className="bg-emerald-600 hover:bg-emerald-700">
                                {editingVehicle ? 'บันทึกการแก้ไข' : 'เพิ่มรถ'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? 'แก้ไขประเภทรถ' : 'เพิ่มประเภทรถ'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitCategory} className="space-y-5">
                        <div className="space-y-2">
                            <Label>ชื่อประเภท *</Label>
                            <Input
                                value={categoryForm.data.name}
                                onChange={(e) => categoryForm.setData('name', e.target.value)}
                                placeholder="เช่น รถตู้, รถเก๋ง"
                                required
                            />
                            {categoryForm.errors.name && (
                                <p className="text-sm text-rose-500">{categoryForm.errors.name}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>สีบนปฏิทิน</Label>
                            <Input
                                type="color"
                                value={categoryForm.data.color}
                                onChange={(e) => categoryForm.setData('color', e.target.value)}
                                className="h-10 p-1"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>รายละเอียด</Label>
                            <Textarea
                                value={categoryForm.data.description}
                                onChange={(e) => categoryForm.setData('description', e.target.value)}
                                className="min-h-20"
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setCategoryOpen(false)}>
                                ยกเลิก
                            </Button>
                            <Button type="submit" disabled={categoryForm.processing} className="bg-emerald-600 hover:bg-emerald-700">
                                {editingCategory ? 'บันทึก' : 'เพิ่มประเภท'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
