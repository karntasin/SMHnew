import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Plus,
    Calendar,
    Clock,
    MapPin,
    User,
    Car,
    Search,
    CalendarDays,
} from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import VehicleSubNav from '../VehicleSubNav';

interface Booking {
    id: number;
    booking_number: string;
    status: string;
    purpose: string;
    destination: string;
    start_datetime: string;
    end_datetime: string;
    vehicle_id?: number | null;
    vehicle?: {
        license_plate: string;
        brand: string;
        model: string;
        image_url?: string | null;
    } | null;
    user?: { name: string };
}

interface Props {
    bookings: {
        data: Booking[];
        links: any[];
    };
    stats: {
        total: number;
        pending: number;
        today: number;
        approved: number;
    };
    filters: {
        filter?: string;
    };
}

const STATUS_BADGE: Record<string, string> = {
    approved: 'bg-emerald-500 text-white',
    pending: 'bg-amber-400 text-slate-900',
    rejected: 'bg-rose-500 text-white',
    cancelled: 'bg-slate-400 text-white',
    completed: 'bg-sky-500 text-white',
};

export default function List({ bookings, stats, filters }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const currentFilter = filters?.filter || 'all';

    const handleFilter = (filter: string) => {
        router.get(route('vehicles.bookings.index'), { filter }, { preserveState: true });
    };

    const getStatusBadge = (booking: Booking) => {
        if (booking.status === 'pending' && !booking.vehicle_id) {
            return <Badge className="bg-orange-500 text-white">รอจัดรถ</Badge>;
        }
        switch (booking.status) {
            case 'approved':
                return <Badge className={STATUS_BADGE.approved}>อนุมัติแล้ว</Badge>;
            case 'pending':
                return <Badge className={STATUS_BADGE.pending}>รออนุมัติ</Badge>;
            case 'rejected':
                return <Badge className={STATUS_BADGE.rejected}>ไม่อนุมัติ</Badge>;
            case 'cancelled':
                return <Badge className={STATUS_BADGE.cancelled}>ยกเลิก</Badge>;
            case 'completed':
                return <Badge className={STATUS_BADGE.completed}>เสร็จสิ้น</Badge>;
            default:
                return <Badge>{booking.status}</Badge>;
        }
    };

    const filteredBookings = (bookings?.data || []).filter((booking) => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return true;
        return (
            booking.booking_number?.toLowerCase().includes(q) ||
            booking.user?.name?.toLowerCase().includes(q) ||
            booking.destination?.toLowerCase().includes(q) ||
            booking.vehicle?.license_plate?.toLowerCase().includes(q)
        );
    });

    return (
        <AppLayout breadcrumbs={[
            { title: 'ระบบจองรถ', href: route('vehicles.index') },
            { title: 'รายการจอง', href: route('vehicles.bookings.index') },
        ]}>
            <Head title="รายการขอใช้รถ" />

            <div className="relative min-h-screen overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.12),_transparent_55%)]" />

                <div className="relative container mx-auto space-y-6 px-4 py-6">
                    <VehicleSubNav active="vehicles.bookings.index" />

                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-800">รายการขอใช้รถ</h1>
                            <p className="text-sm text-slate-500">จัดการการจองรถและตรวจสอบสถานะ</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Link href={route('vehicles.calendar')}>
                                <Button variant="outline" className="rounded-xl">
                                    <Calendar className="mr-2 h-4 w-4" />
                                    ปฏิทิน
                                </Button>
                            </Link>
                            <Link href={route('vehicles.bookings.create')}>
                                <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
                                    <Plus className="mr-2 h-4 w-4" />
                                    ขอใช้รถใหม่
                                </Button>
                            </Link>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card
                            className={cn('cursor-pointer transition-all hover:shadow-md', currentFilter === 'all' && 'ring-2 ring-emerald-500')}
                            onClick={() => handleFilter('all')}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">ทั้งหมด</CardTitle>
                                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.total}</div>
                            </CardContent>
                        </Card>
                        <Card
                            className={cn('cursor-pointer transition-all hover:shadow-md', currentFilter === 'pending' && 'ring-2 ring-amber-500')}
                            onClick={() => handleFilter('pending')}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-amber-600">รออนุมัติ</CardTitle>
                                <Clock className="h-4 w-4 text-amber-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
                            </CardContent>
                        </Card>
                        <Card
                            className={cn('cursor-pointer transition-all hover:shadow-md', currentFilter === 'today' && 'ring-2 ring-sky-500')}
                            onClick={() => handleFilter('today')}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-sky-600">วันนี้</CardTitle>
                                <Calendar className="h-4 w-4 text-sky-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-sky-600">{stats.today}</div>
                            </CardContent>
                        </Card>
                        <Card className="cursor-pointer transition-all hover:shadow-md" onClick={() => handleFilter('approved')}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-emerald-600">อนุมัติแล้ว</CardTitle>
                                <Car className="h-4 w-4 text-emerald-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-emerald-600">{stats.approved}</div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="rounded-[1.5rem] border-slate-200/80 shadow-sm">
                        <CardHeader>
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <CardTitle>รายการจองล่าสุด</CardTitle>
                                <div className="relative w-full md:w-72">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="ค้นหาเลขที่ / ผู้จอง / จุดหมาย..."
                                        className="rounded-xl pl-9"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {filteredBookings.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-400">
                                    ไม่พบข้อมูลการจอง
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {filteredBookings.map((booking) => (
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
                                                        <div className="text-xs font-medium text-slate-400">{booking.booking_number}</div>
                                                        <h3 className="line-clamp-1 font-semibold text-slate-800 group-hover:text-emerald-700">
                                                            {booking.destination}
                                                        </h3>
                                                    </div>
                                                    {getStatusBadge(booking)}
                                                </div>
                                                <p className="line-clamp-2 text-sm text-slate-600">{booking.purpose}</p>
                                                <div className="space-y-1 text-xs text-slate-500">
                                                    <div className="flex items-center gap-1.5">
                                                        <User className="h-3.5 w-3.5 text-emerald-600" />
                                                        {booking.user?.name}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <CalendarDays className="h-3.5 w-3.5 text-emerald-600" />
                                                        {format(new Date(booking.start_datetime), 'd MMM yyyy', { locale: th })}
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
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
