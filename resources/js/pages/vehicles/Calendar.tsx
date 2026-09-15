import React, { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Car, Plus } from 'lucide-react';
import VehicleSubNav from './VehicleSubNav';
import BookingMonthCalendar, { BookingCalendarEvent } from '@/components/booking-month-calendar';

export default function Calendar() {
    const [events, setEvents] = useState<BookingCalendarEvent[]>([]);

    useEffect(() => {
        fetch(route('vehicles.calendar.events'))
            .then((res) => res.json())
            .then((data) => setEvents(data));
    }, []);

    return (
        <AppLayout breadcrumbs={[
            { title: 'ระบบจองรถ', href: route('vehicles.index') },
            { title: 'ปฏิทินการใช้รถ', href: '#' },
        ]}>
            <Head title="ปฏิทินการใช้รถ" />

            <div className="relative min-h-screen overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.12),_transparent_55%)]" />

                <div className="relative container mx-auto space-y-6 px-4 py-6">
                    <VehicleSubNav active="vehicles.calendar" />

                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-800">ปฏิทินการใช้รถ</h1>
                            <p className="text-sm text-slate-500">คลิกวันที่เพื่อดูรายการจองเป็นการ์ด · แสดงปี พ.ศ.</p>
                        </div>
                        <Link href={route('vehicles.bookings.create')}>
                            <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
                                <Plus className="mr-2 h-4 w-4" />
                                จองรถใหม่
                            </Button>
                        </Link>
                    </div>

                    <BookingMonthCalendar events={events} tone="emerald" resourceFallback="รถราชการ" EmptyIcon={Car} />
                </div>
            </div>
        </AppLayout>
    );
}
