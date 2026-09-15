import React, { useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Car } from 'lucide-react';
import VehicleSubNav from '../VehicleSubNav';

interface Vehicle {
    id: number;
    license_plate: string;
    brand: string;
    model: string;
    category?: {
        name: string;
        color: string;
    };
    status: 'available' | 'maintenance' | 'busy';
    seats: number;
    image_url?: string | null;
}

interface Props {
    vehicles: {
        data: Vehicle[];
        links: any[];
        current_page: number;
        last_page: number;
    };
    filters: {
        search?: string;
    };
}

export default function Index({ vehicles, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('vehicles.manage.index'), { search }, { preserveState: true });
    };

    const handleDelete = (id: number) => {
        if (confirm('คุณแน่ใจหรือไม่ที่จะลบรถคันนี้?')) {
            router.delete(route('vehicles.manage.destroy', { manage: id }));
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'available':
                return <Badge className="bg-emerald-500">ว่าง</Badge>;
            case 'maintenance':
                return <Badge className="bg-rose-500">ซ่อมบำรุง</Badge>;
            case 'busy':
                return <Badge className="bg-amber-400 text-slate-900">ไม่ว่าง</Badge>;
            default:
                return <Badge className="bg-slate-400">{status}</Badge>;
        }
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return vehicles.data;
        return vehicles.data.filter((v) =>
            [v.license_plate, v.brand, v.model, v.category?.name]
                .filter(Boolean)
                .some((val) => String(val).toLowerCase().includes(q)),
        );
    }, [vehicles.data, search]);

    return (
        <AppLayout breadcrumbs={[
            { title: 'ระบบจองรถ', href: route('vehicles.index') },
            { title: 'จัดการรถ', href: route('vehicles.manage.index') },
        ]}>
            <Head title="จัดการรถ" />

            <div className="relative min-h-screen overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.12),_transparent_55%)]" />

                <div className="relative container mx-auto space-y-6 px-4 py-6">
                    <VehicleSubNav active="vehicles.settings.index" />

                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">จัดการข้อมูลรถ</h1>
                            <p className="text-sm text-slate-500">
                                แนะนำให้ใช้หน้า{' '}
                                <Link href={route('vehicles.settings.index')} className="font-medium text-emerald-700 underline">
                                    ตั้งค่ารถ
                                </Link>{' '}
                                สำหรับเพิ่ม/แก้ไขพร้อมอัปโหลดรูป
                            </p>
                        </div>
                        <Link href={route('vehicles.settings.index')}>
                            <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
                                <Plus className="mr-2 h-4 w-4" />
                                ไปตั้งค่ารถ
                            </Button>
                        </Link>
                    </div>

                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="ค้นหาทะเบียน, ยี่ห้อ, รุ่น..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch(e as unknown as React.FormEvent)}
                            className="rounded-xl pl-9"
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {filtered.map((vehicle) => (
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
                                            <p className="text-xs text-slate-500">{vehicle.brand} {vehicle.model}</p>
                                        </div>
                                        {getStatusBadge(vehicle.status)}
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                        {vehicle.category && (
                                            <span
                                                className="rounded-full px-2 py-1"
                                                style={{
                                                    backgroundColor: `${vehicle.category.color}20`,
                                                    color: vehicle.category.color,
                                                }}
                                            >
                                                {vehicle.category.name}
                                            </span>
                                        )}
                                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">{vehicle.seats} ที่นั่ง</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Link href={route('vehicles.manage.edit', { manage: vehicle.id })} className="flex-1">
                                            <Button variant="outline" className="w-full rounded-xl">
                                                <Edit className="mr-2 h-4 w-4" />
                                                แก้ไข
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="outline"
                                            className="rounded-xl text-rose-600 hover:bg-rose-50"
                                            onClick={() => handleDelete(vehicle.id)}
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
                            ไม่พบข้อมูลรถ
                        </div>
                    )}

                    {vehicles.last_page > 1 && (
                        <div className="flex justify-center gap-2">
                            {vehicles.links.map((link, i) => (
                                <Link
                                    key={i}
                                    href={link.url || '#'}
                                    className={`rounded-lg border px-3 py-1 ${link.active ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700'} ${!link.url ? 'pointer-events-none opacity-50' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
