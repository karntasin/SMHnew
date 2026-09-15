import React, { useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    CalendarDays,
    Car,
    Clock,
    MapPin,
    Plus,
    Search,
    Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import VehicleSubNav from './VehicleSubNav';

interface VehicleCategory {
    id: number;
    name: string;
    color?: string;
}

interface Vehicle {
    id: number;
    license_plate: string;
    brand: string;
    model: string;
    seats: number;
    status: string;
    image_url?: string | null;
    category?: VehicleCategory | null;
}

interface Booking {
    id: number;
    booking_number: string;
    purpose: string;
    destination: string;
    start_datetime: string;
    end_datetime: string;
    status: string;
    user?: { name: string } | null;
    vehicle?: {
        license_plate: string;
        brand: string;
        model: string;
        image_url?: string | null;
    } | null;
}

interface Props {
    vehicles: Vehicle[];
    upcoming: Booking[];
    stats: {
        active_vehicles: number;
        pending: number;
        today: number;
        approved: number;
    };
    preselectVehicleId?: number | null;
}

const STATUS_BADGE: Record<string, string> = {
    available: 'bg-emerald-500 text-white',
    busy: 'bg-amber-400 text-slate-900',
    maintenance: 'bg-rose-500 text-white',
    approved: 'bg-emerald-500 text-white',
    pending: 'bg-amber-400 text-slate-900',
    rejected: 'bg-rose-500 text-white',
    cancelled: 'bg-slate-400 text-white',
};

const STATUS_LABEL: Record<string, string> = {
    available: 'ว่าง',
    busy: 'ไม่ว่าง',
    maintenance: 'ซ่อมบำรุง',
    approved: 'อนุมัติ',
    pending: 'รออนุมัติ',
    rejected: 'ไม่อนุมัติ',
    cancelled: 'ยกเลิก',
};

export default function VehicleIndex({ vehicles = [], upcoming = [], stats, preselectVehicleId = null }: Props) {
    const [search, setSearch] = useState('');

    const filteredVehicles = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return vehicles;
        return vehicles.filter((v) =>
            [v.license_plate, v.brand, v.model, v.category?.name]
                .filter(Boolean)
                .some((val) => String(val).toLowerCase().includes(q)),
        );
    }, [vehicles, search]);

    return (
        <AppLayout breadcrumbs={[{ title: 'ระบบจองรถ', href: route('vehicles.index') }]}>
            <Head title="เลือกรถ" />

            <div className="relative min-h-screen overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(20,184,166,0.12),_transparent_45%)]" />
                <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
                <div className="pointer-events-none absolute -right-16 top-80 h-80 w-80 rounded-full bg-teal-300/20 blur-3xl" />

                <div className="relative container mx-auto space-y-6 px-4 py-6">
                    <VehicleSubNav active="vehicles.index" />

                    <section className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-slate-900 via-emerald-950 to-teal-900 p-6 text-white shadow-2xl shadow-emerald-900/20 md:p-8">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                            <div className="max-w-2xl space-y-3">
                                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-emerald-100 backdrop-blur">
                                    <Car className="h-3.5 w-3.5" />
                                    ระบบขอใช้รถ
                                </div>
                                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">เลือกรถ ดูตาราง แล้วจองได้ทันที</h1>
                                <p className="text-sm text-emerald-100/80 md:text-base">
                                    ดูรูปรถ ทะเบียน และจำนวนที่นั่งก่อนจอง แล้วตรวจสอบตารางการใช้รถในหน้าเดียว
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Link href={route('vehicles.calendar')}>
                                    <Button variant="secondary" className="bg-white/15 text-white hover:bg-white/25">
                                        <CalendarDays className="mr-2 h-4 w-4" />
                                        ดูปฏิทิน
                                    </Button>
                                </Link>
                                <Link href={route('vehicles.bookings.create')}>
                                    <Button className="bg-emerald-400 text-slate-900 hover:bg-emerald-300">
                                        <Plus className="mr-2 h-4 w-4" />
                                        ขอใช้รถ
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {[
                                { label: 'รถพร้อมใช้', value: stats?.active_vehicles ?? 0 },
                                { label: 'จองวันนี้', value: stats?.today ?? 0 },
                                { label: 'รออนุมัติ', value: stats?.pending ?? 0 },
                                { label: 'อนุมัติแล้ว', value: stats?.approved ?? 0 },
                            ].map((item) => (
                                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                                    <div className="text-2xl font-bold">{item.value}</div>
                                    <div className="text-xs text-emerald-100/70">{item.label}</div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">รถทั้งหมด</h2>
                                <p className="text-sm text-slate-500">เลือกรถจากรูปแล้วกดจองได้เลย</p>
                            </div>
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="ค้นหาทะเบียน / ยี่ห้อ / รุ่น..."
                                    className="rounded-xl border-emerald-100 bg-white/90 pl-9 shadow-sm"
                                />
                            </div>
                        </div>

                        {filteredVehicles.length === 0 ? (
                            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 p-12 text-center text-slate-500">
                                ยังไม่มีรถพร้อมใช้งาน — ไปที่เมนูจัดการรถเพื่อเพิ่มรถและอัปโหลดรูป
                                <div className="mt-4">
                                    <Link href={route('vehicles.manage.index')}>
                                        <Button>ไปจัดการรถ</Button>
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                                {filteredVehicles.map((vehicle) => (
                                    <article
                                        key={vehicle.id}
                                        className={cn(
                                            'group overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-900/10',
                                            preselectVehicleId === vehicle.id && 'ring-2 ring-emerald-400',
                                        )}
                                    >
                                        <div className="relative p-3 pb-0">
                                            <div
                                                className="relative overflow-hidden rounded-2xl p-[3px]"
                                                style={{
                                                    background: `linear-gradient(135deg, ${vehicle.category?.color || '#10b981'} 0%, #6ee7b7 55%, ${vehicle.category?.color || '#10b981'}88 100%)`,
                                                }}
                                            >
                                                <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] bg-slate-100">
                                                    {vehicle.image_url ? (
                                                        <img
                                                            src={vehicle.image_url}
                                                            alt={vehicle.license_plate}
                                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-300">
                                                            <Car className="h-12 w-12" />
                                                            <span className="text-xs text-slate-400">ยังไม่มีรูปรถ</span>
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                                                    <div className="absolute left-3 top-3">
                                                        <Badge className="bg-white/90 text-slate-800 hover:bg-white">
                                                            <Users className="mr-1 h-3 w-3" />
                                                            {vehicle.seats} ที่นั่ง
                                                        </Badge>
                                                    </div>
                                                    <div className="absolute right-3 top-3">
                                                        <Badge className={cn('shrink-0', STATUS_BADGE[vehicle.status] || 'bg-slate-200')}>
                                                            {STATUS_LABEL[vehicle.status] || vehicle.status}
                                                        </Badge>
                                                    </div>
                                                    <div className="absolute bottom-3 left-3 right-3">
                                                        <h3 className="truncate text-lg font-bold text-white drop-shadow">
                                                            {vehicle.license_plate}
                                                        </h3>
                                                        <p className="truncate text-xs text-white/85">
                                                            {vehicle.brand} {vehicle.model}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 p-4">
                                            {vehicle.category && (
                                                <span
                                                    className="inline-flex rounded-full px-2 py-1 text-[11px] font-medium"
                                                    style={{
                                                        backgroundColor: `${vehicle.category.color || '#10b981'}20`,
                                                        color: vehicle.category.color || '#059669',
                                                    }}
                                                >
                                                    {vehicle.category.name}
                                                </span>
                                            )}
                                            <Link href={route('vehicles.bookings.create', { vehicle_id: vehicle.id })}>
                                                <Button className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700">
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    จองรถคันนี้
                                                </Button>
                                            </Link>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="space-y-4 rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-xl shadow-slate-900/5 backdrop-blur md:p-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">การจองที่กำลังจะถึง</h2>
                            <p className="text-sm text-slate-500">รายการใช้รถถัดไปในระบบ</p>
                        </div>

                        {upcoming.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-400">
                                ยังไม่มีรายการในช่วงนี้
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                {upcoming.map((booking) => (
                                    <Link
                                        key={booking.id}
                                        href={route('vehicles.bookings.show', booking.id)}
                                        className="group overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg"
                                    >
                                        <div className="relative aspect-[16/9] bg-slate-100">
                                            {booking.vehicle?.image_url ? (
                                                <img
                                                    src={booking.vehicle.image_url}
                                                    alt={booking.vehicle.license_plate}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-emerald-300">
                                                    <Car className="h-10 w-10" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                            <div className="absolute bottom-2 left-3 right-3">
                                                <div className="truncate text-sm font-semibold text-white">
                                                    {booking.vehicle
                                                        ? `${booking.vehicle.license_plate} · ${booking.vehicle.brand} ${booking.vehicle.model}`
                                                        : 'รอจัดรถ'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-3 p-4">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <div className="text-xs font-medium text-slate-400">{booking.user?.name}</div>
                                                    <h3 className="line-clamp-1 font-semibold text-slate-800 group-hover:text-emerald-700">
                                                        {booking.destination}
                                                    </h3>
                                                </div>
                                                <Badge className={cn('shrink-0', STATUS_BADGE[booking.status] || 'bg-slate-200')}>
                                                    {STATUS_LABEL[booking.status] || booking.status}
                                                </Badge>
                                            </div>
                                            <p className="line-clamp-2 text-sm text-slate-600">{booking.purpose}</p>
                                            <div className="space-y-1 text-xs text-slate-500">
                                                <div className="flex items-center gap-1.5">
                                                    <CalendarDays className="h-3.5 w-3.5 text-emerald-600" />
                                                    {format(new Date(booking.start_datetime), 'd MMM yyyy', { locale: th })}
                                                    {' - '}
                                                    {format(new Date(booking.end_datetime), 'd MMM yyyy', { locale: th })}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="h-3.5 w-3.5 text-emerald-600" />
                                                    {format(new Date(booking.start_datetime), 'HH:mm')} -{' '}
                                                    {format(new Date(booking.end_datetime), 'HH:mm')} น.
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                                                    {booking.destination}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2 pt-2">
                            <Link href={route('vehicles.bookings.index')}>
                                <Button variant="outline" className="rounded-xl">ดูรายการจองทั้งหมด</Button>
                            </Link>
                            <Link href={route('vehicles.calendar')}>
                                <Button variant="outline" className="rounded-xl">เปิดปฏิทินเต็มหน้าจอ</Button>
                            </Link>
                        </div>
                    </section>
                </div>
            </div>
        </AppLayout>
    );
}
