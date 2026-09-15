import React, { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    CalendarDays,
    Clock,
    DoorOpen,
    MapPin,
    Monitor,
    Plus,
    Search,
    Users,
    Wifi,
    Mic2,
    Presentation,
    Tv,
    Wind,
} from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import RoomSubNav from './RoomSubNav';
import CreateModal from './CreateModal';

interface Room {
    id: number;
    name: string;
    capacity: number;
    location?: string | null;
    description?: string | null;
    status: string;
    color: string;
    facilities: string[];
    requires_approval?: boolean;
    image_url?: string | null;
}

interface Booking {
    id: number;
    title: string;
    description?: string | null;
    start_time: string;
    end_time: string;
    status: string;
    room: Room | null;
    user: { name: string };
    attendees_count?: number | null;
}

interface Props {
    rooms: Room[];
    upcoming: Booking[];
    todayBookings: Booking[];
    stats: {
        total_bookings: number;
        pending_approval: number;
        today_bookings: number;
        active_rooms: number;
    };
    facilityOptions: Record<string, string>;
    preselectRoomId?: number | null;
    openCreate?: boolean;
}

const FACILITY_ICONS: Record<string, typeof Wifi> = {
    projector: Presentation,
    whiteboard: Monitor,
    video_conference: Monitor,
    wifi: Wifi,
    sound_system: Mic2,
    microphone: Mic2,
    tv: Tv,
    air_conditioner: Wind,
};

const STATUS_BADGE: Record<string, string> = {
    approved: 'bg-emerald-500 text-white',
    pending: 'bg-amber-400 text-slate-900',
    rejected: 'bg-rose-500 text-white',
    cancelled: 'bg-slate-400 text-white',
};

export default function RoomIndex({
    rooms = [],
    upcoming = [],
    todayBookings = [],
    stats,
    facilityOptions = {},
    preselectRoomId = null,
    openCreate = false,
}: Props) {
    const [search, setSearch] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(preselectRoomId);
    const [scheduleTab, setScheduleTab] = useState<'today' | 'upcoming'>('upcoming');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (openCreate || params.get('action') === 'create') {
            const roomId = params.get('room_id');
            if (roomId) setSelectedRoomId(Number(roomId));
            setCreateOpen(true);
            params.delete('action');
            const next = params.toString()
                ? `${window.location.pathname}?${params.toString()}`
                : window.location.pathname;
            window.history.replaceState({}, '', next);
        }
    }, [openCreate]);

    const filteredRooms = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rooms;
        return rooms.filter((room) =>
            [room.name, room.location, room.description]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q)),
        );
    }, [rooms, search]);

    const openBook = (roomId?: number) => {
        setSelectedRoomId(roomId ?? null);
        setCreateOpen(true);
    };

    const scheduleItems = scheduleTab === 'today' ? todayBookings : upcoming;

    return (
        <AppLayout breadcrumbs={[{ title: 'ระบบจองห้องประชุม', href: '/administration/rooms' }]}>
            <Head title="จองห้องประชุม" />

            <div className="relative min-h-screen overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(14,165,233,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(20,184,166,0.12),_transparent_45%)]" />
                <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl" />
                <div className="pointer-events-none absolute -right-16 top-80 h-80 w-80 rounded-full bg-teal-300/20 blur-3xl" />

                <div className="relative container mx-auto space-y-6 px-4 py-6">
                    <RoomSubNav active="rooms.index" />

                    <section className="overflow-hidden rounded-[2rem] border border-sky-100 bg-gradient-to-br from-slate-900 via-sky-950 to-teal-900 p-6 text-white shadow-2xl shadow-sky-900/20 md:p-8">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                            <div className="max-w-2xl space-y-3">
                                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-sky-100 backdrop-blur">
                                    <DoorOpen className="h-3.5 w-3.5" />
                                    การจองและใช้ห้องประชุม
                                </div>
                                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">เลือกห้อง ดูตาราง แล้วจองได้ทันที</h1>
                                <p className="text-sm text-sky-100/80 md:text-base">
                                    ดูรูปห้อง ความจุ และอุปกรณ์ก่อนจอง แล้วตรวจสอบตารางการใช้ห้องในหน้าเดียว
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Link href={route('rooms.calendar')}>
                                    <Button variant="secondary" className="bg-white/15 text-white hover:bg-white/25">
                                        <CalendarDays className="mr-2 h-4 w-4" />
                                        ดูปฏิทิน
                                    </Button>
                                </Link>
                                <Button onClick={() => openBook()} className="bg-emerald-400 text-slate-900 hover:bg-emerald-300">
                                    <Plus className="mr-2 h-4 w-4" />
                                    จองห้องประชุม
                                </Button>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {[
                                { label: 'ห้องพร้อมใช้', value: stats?.active_rooms ?? 0 },
                                { label: 'จองวันนี้', value: stats?.today_bookings ?? 0 },
                                { label: 'รออนุมัติ', value: stats?.pending_approval ?? 0 },
                                { label: 'การจองทั้งหมด', value: stats?.total_bookings ?? 0 },
                            ].map((item) => (
                                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                                    <div className="text-2xl font-bold">{item.value}</div>
                                    <div className="text-xs text-sky-100/70">{item.label}</div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">ห้องประชุมทั้งหมด</h2>
                                <p className="text-sm text-slate-500">เลือกห้องจากรูปแล้วกดจองได้เลย</p>
                            </div>
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="ค้นหาชื่อห้อง / สถานที่..."
                                    className="rounded-xl border-sky-100 bg-white/90 pl-9 shadow-sm"
                                />
                            </div>
                        </div>

                        {filteredRooms.length === 0 ? (
                            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 p-12 text-center text-slate-500">
                                ยังไม่มีห้องประชุม — ไปที่เมนูตั้งค่าห้องเพื่อเพิ่มห้องและอัปโหลดรูป
                                <div className="mt-4">
                                    <Link href={route('rooms.settings')}>
                                        <Button>ไปตั้งค่าห้อง</Button>
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                                {filteredRooms.map((room) => (
                                    <article
                                        key={room.id}
                                        className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl hover:shadow-sky-900/10"
                                    >
                                        <div className="relative p-3 pb-0">
                                            <div
                                                className="relative overflow-hidden rounded-2xl p-[3px]"
                                                style={{
                                                    background: `linear-gradient(135deg, ${room.color} 0%, #67e8f9 55%, ${room.color}88 100%)`,
                                                }}
                                            >
                                                <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] bg-slate-100">
                                                    {room.image_url ? (
                                                        <img
                                                            src={room.image_url}
                                                            alt={room.name}
                                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-sky-50 to-teal-50 text-sky-300">
                                                            <DoorOpen className="h-12 w-12" />
                                                            <span className="text-xs text-slate-400">ยังไม่มีรูปห้อง</span>
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                                                    <div className="absolute left-3 top-3">
                                                        <Badge className="bg-white/90 text-slate-800 hover:bg-white">
                                                            <Users className="mr-1 h-3 w-3" />
                                                            {room.capacity} ที่นั่ง
                                                        </Badge>
                                                    </div>
                                                    <div className="absolute bottom-3 left-3 right-3">
                                                        <h3 className="truncate text-lg font-bold text-white drop-shadow">{room.name}</h3>
                                                        {room.location && (
                                                            <p className="flex items-center gap-1 truncate text-xs text-white/85">
                                                                <MapPin className="h-3 w-3" />
                                                                {room.location}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 p-4">
                                            <p className="line-clamp-2 min-h-[2.5rem] text-sm text-slate-500">
                                                {room.description || 'ห้องประชุมพร้อมใช้งาน'}
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {(room.facilities || []).slice(0, 4).map((key) => {
                                                    const Icon = FACILITY_ICONS[key] || Monitor;
                                                    return (
                                                        <span
                                                            key={key}
                                                            className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-700"
                                                        >
                                                            <Icon className="h-3 w-3" />
                                                            {facilityOptions[key] || key}
                                                        </span>
                                                    );
                                                })}
                                                {(room.facilities || []).length > 4 && (
                                                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-500">
                                                        +{room.facilities.length - 4}
                                                    </span>
                                                )}
                                            </div>
                                            <Button
                                                className="w-full rounded-xl bg-sky-600 hover:bg-sky-700"
                                                onClick={() => openBook(room.id)}
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                จองห้องนี้
                                            </Button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="space-y-4 rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-xl shadow-slate-900/5 backdrop-blur md:p-6">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">ตารางการจอง / ใช้ห้องประชุม</h2>
                                <p className="text-sm text-slate-500">ดูรายการใช้ห้องที่กำลังจะถึงและของวันนี้</p>
                            </div>
                            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                                <button
                                    type="button"
                                    onClick={() => setScheduleTab('upcoming')}
                                    className={cn(
                                        'rounded-xl px-4 py-2 text-sm font-medium transition',
                                        scheduleTab === 'upcoming' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500',
                                    )}
                                >
                                    การจองถัดไป
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setScheduleTab('today')}
                                    className={cn(
                                        'rounded-xl px-4 py-2 text-sm font-medium transition',
                                        scheduleTab === 'today' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500',
                                    )}
                                >
                                    วันนี้
                                </button>
                            </div>
                        </div>

                        {scheduleItems.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-400">
                                ยังไม่มีรายการในช่วงนี้
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                {scheduleItems.map((booking) => (
                                    <Link
                                        key={booking.id}
                                        href={route('rooms.bookings.show', booking.id)}
                                        className="group overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-lg"
                                    >
                                        <div
                                            className="h-1.5 w-full"
                                            style={{ backgroundColor: booking.room?.color || '#0ea5e9' }}
                                        />
                                        <div className="space-y-3 p-4">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <div className="text-xs font-medium text-slate-400">{booking.user.name}</div>
                                                    <h3 className="line-clamp-1 font-semibold text-slate-800 group-hover:text-sky-700">
                                                        {booking.room?.name || 'ห้องประชุม'}
                                                    </h3>
                                                </div>
                                                <Badge className={cn('shrink-0', STATUS_BADGE[booking.status] || 'bg-slate-200')}>
                                                    {booking.status === 'approved'
                                                        ? 'อนุมัติ'
                                                        : booking.status === 'pending'
                                                          ? 'รออนุมัติ'
                                                          : booking.status}
                                                </Badge>
                                            </div>
                                            <p className="line-clamp-2 text-sm text-slate-600">{booking.title}</p>
                                            <div className="space-y-1 text-xs text-slate-500">
                                                <div className="flex items-center gap-1.5">
                                                    <CalendarDays className="h-3.5 w-3.5 text-sky-600" />
                                                    {format(new Date(booking.start_time), 'd MMM yyyy', { locale: th })}
                                                    {' - '}
                                                    {format(new Date(booking.end_time), 'd MMM yyyy', { locale: th })}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="h-3.5 w-3.5 text-sky-600" />
                                                    {format(new Date(booking.start_time), 'HH:mm')} -{' '}
                                                    {format(new Date(booking.end_time), 'HH:mm')} น.
                                                </div>
                                                {booking.attendees_count ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <Users className="h-3.5 w-3.5 text-sky-600" />
                                                        {booking.attendees_count} คน
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2 pt-2">
                            <Link href={route('rooms.bookings')}>
                                <Button variant="outline" className="rounded-xl">ดูรายการจองทั้งหมด</Button>
                            </Link>
                            <Link href={route('rooms.calendar')}>
                                <Button variant="outline" className="rounded-xl">เปิดปฏิทินเต็มหน้าจอ</Button>
                            </Link>
                        </div>
                    </section>
                </div>
            </div>

            <CreateModal
                open={createOpen}
                onOpenChange={setCreateOpen}
                rooms={rooms}
                defaultRoomId={selectedRoomId}
            />
        </AppLayout>
    );
}
