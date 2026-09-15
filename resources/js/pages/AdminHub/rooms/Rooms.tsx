import React, { useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, router, useForm } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DoorOpen, ImagePlus, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import RoomSubNav from './RoomSubNav';

interface Room {
    id: number;
    name: string;
    capacity: number;
    location?: string | null;
    description?: string | null;
    status: string;
    color: string;
    facilities: string[];
    requires_approval: boolean;
    image_url?: string | null;
    bookings_count?: number;
}

interface Props {
    rooms: Room[];
    facilityOptions: Record<string, string>;
}

const emptyForm = {
    name: '',
    capacity: 10,
    location: '',
    description: '',
    status: 'active',
    color: '#0ea5e9',
    requires_approval: true,
    facilities: [] as string[],
    image: null as File | null,
};

export default function Rooms({ rooms = [], facilityOptions = {} }: Props) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Room | null>(null);
    const [search, setSearch] = useState('');
    const [preview, setPreview] = useState<string | null>(null);

    const form = useForm({ ...emptyForm });

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rooms;
        return rooms.filter((room) =>
            [room.name, room.location, room.description]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q)),
        );
    }, [rooms, search]);

    const openCreate = () => {
        setEditing(null);
        form.setData({ ...emptyForm });
        form.clearErrors();
        setPreview(null);
        setOpen(true);
    };

    const openEdit = (room: Room) => {
        setEditing(room);
        form.setData({
            name: room.name,
            capacity: room.capacity,
            location: room.location || '',
            description: room.description || '',
            status: room.status || 'active',
            color: room.color || '#0ea5e9',
            requires_approval: !!room.requires_approval,
            facilities: room.facilities || [],
            image: null,
        });
        form.clearErrors();
        setPreview(room.image_url || null);
        setOpen(true);
    };

    const toggleFacility = (key: string) => {
        const current = form.data.facilities || [];
        form.setData(
            'facilities',
            current.includes(key) ? current.filter((f) => f !== key) : [...current, key],
        );
    };

    const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        form.setData('image', file);
        if (file) {
            setPreview(URL.createObjectURL(file));
        }
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editing) {
            form.post(route('rooms.settings.update', editing.id), {
                forceFormData: true,
                onSuccess: () => {
                    setOpen(false);
                    setEditing(null);
                },
            });
        } else {
            form.post(route('rooms.settings.store'), {
                forceFormData: true,
                onSuccess: () => setOpen(false),
            });
        }
    };

    const removeRoom = (room: Room) => {
        if (!confirm(`ลบห้อง "${room.name}" หรือไม่?`)) return;
        router.delete(route('rooms.settings.destroy', room.id));
    };

    const statusLabel = (status: string) => {
        if (status === 'active') return 'พร้อมใช้';
        if (status === 'maintenance') return 'ซ่อมบำรุง';
        return 'ปิดใช้งาน';
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'ระบบจองห้องประชุม', href: '/administration/rooms' },
                { title: 'ตั้งค่าห้องประชุม', href: '/administration/rooms/settings' },
            ]}
        >
            <Head title="ตั้งค่าห้องประชุม" />

            <div className="container mx-auto space-y-6 px-4 py-6">
                <RoomSubNav active="rooms.settings" />

                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">ตั้งค่าห้องประชุม</h1>
                        <p className="text-sm text-slate-500">เพิ่ม/แก้ไขห้อง อัปโหลดรูป และกำหนดอุปกรณ์ในห้อง</p>
                    </div>
                    <Button onClick={openCreate} className="rounded-xl bg-sky-600 hover:bg-sky-700">
                        <Plus className="mr-2 h-4 w-4" />
                        เพิ่มห้องประชุม
                    </Button>
                </div>

                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="ค้นหาห้อง..."
                        className="rounded-xl pl-9"
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((room) => (
                        <div key={room.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                            <div className="aspect-[16/10] bg-slate-100">
                                {room.image_url ? (
                                    <img src={room.image_url} alt={room.name} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-sky-300">
                                        <DoorOpen className="h-12 w-12" />
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3 p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h3 className="font-semibold text-slate-800">{room.name}</h3>
                                        <p className="text-xs text-slate-500">{room.location || 'ไม่ระบุสถานที่'}</p>
                                    </div>
                                    <Badge variant={room.status === 'active' ? 'default' : 'secondary'}>
                                        {statusLabel(room.status)}
                                    </Badge>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                    <span className="rounded-full bg-sky-50 px-2 py-1 text-sky-700">{room.capacity} ที่นั่ง</span>
                                    <span className="rounded-full bg-slate-100 px-2 py-1">{(room.facilities || []).length} อุปกรณ์</span>
                                    <span className="rounded-full bg-slate-100 px-2 py-1">{room.bookings_count || 0} การจอง</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => openEdit(room)}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        แก้ไข
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="rounded-xl text-rose-600 hover:bg-rose-50"
                                        onClick={() => removeRoom(room)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filtered.length === 0 && (
                    <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
                        ยังไม่มีห้องประชุมในระบบ
                    </div>
                )}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'แก้ไขห้องประชุม' : 'เพิ่มห้องประชุมใหม่'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-5">
                        <div className="space-y-2">
                            <Label>รูปห้องประชุม</Label>
                            <div className="overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50">
                                {preview ? (
                                    <img src={preview} alt="preview" className="h-44 w-full object-cover" />
                                ) : (
                                    <div className="flex h-44 flex-col items-center justify-center gap-2 text-slate-400">
                                        <ImagePlus className="h-8 w-8" />
                                        <span className="text-sm">อัปโหลดรูปห้อง</span>
                                    </div>
                                )}
                            </div>
                            <Input type="file" accept="image/*" onChange={onImageChange} />
                            {form.errors.image && <p className="text-sm text-rose-500">{form.errors.image}</p>}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2 md:col-span-2">
                                <Label>ชื่อห้อง *</Label>
                                <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required />
                                {form.errors.name && <p className="text-sm text-rose-500">{form.errors.name}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>ความจุ (คน) *</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={form.data.capacity}
                                    onChange={(e) => form.setData('capacity', Number(e.target.value))}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>สถานที่</Label>
                                <Input
                                    value={form.data.location}
                                    onChange={(e) => form.setData('location', e.target.value)}
                                    placeholder="เช่น ชั้น 2 อาคาร A"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>สถานะ</Label>
                                <Select value={form.data.status} onValueChange={(v) => form.setData('status', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">พร้อมใช้</SelectItem>
                                        <SelectItem value="maintenance">ซ่อมบำรุง</SelectItem>
                                        <SelectItem value="inactive">ปิดใช้งาน</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>สีบนปฏิทิน</Label>
                                <Input
                                    type="color"
                                    value={form.data.color}
                                    onChange={(e) => form.setData('color', e.target.value)}
                                    className="h-10 p-1"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>รายละเอียด</Label>
                            <Textarea
                                value={form.data.description}
                                onChange={(e) => form.setData('description', e.target.value)}
                                className="min-h-24"
                            />
                        </div>

                        <div className="space-y-3">
                            <Label>อุปกรณ์ในห้อง</Label>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {Object.entries(facilityOptions).map(([key, label]) => (
                                    <label
                                        key={key}
                                        className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-sky-50"
                                    >
                                        <Checkbox
                                            checked={form.data.facilities.includes(key)}
                                            onCheckedChange={() => toggleFacility(key)}
                                        />
                                        {label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm">
                            <Checkbox
                                checked={form.data.requires_approval}
                                onCheckedChange={(checked) => form.setData('requires_approval', !!checked)}
                            />
                            ต้องรออนุมัติก่อนใช้งาน
                        </label>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
                            <Button type="submit" disabled={form.processing} className="bg-sky-600 hover:bg-sky-700">
                                {editing ? 'บันทึกการแก้ไข' : 'เพิ่มห้อง'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
