import React, { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { DoorOpen, Plus } from 'lucide-react';
import RoomSubNav from './RoomSubNav';
import BookingMonthCalendar, { BookingCalendarEvent } from '@/components/booking-month-calendar';

export default function CalendarPage() {
    const [events, setEvents] = useState<BookingCalendarEvent[]>([]);

    useEffect(() => {
        fetch(route('rooms.calendar.events'))
            .then((res) => res.json())
            .then((data) => setEvents(data));
    }, []);

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'ระบบจองห้องประชุม', href: '/administration/rooms' },
                { title: 'ปฏิทินการจอง', href: '/administration/rooms/calendar' },
            ]}
        >
            <Head title="ปฏิทินการจองห้องประชุม" />

            <div className="container mx-auto space-y-6 py-6">
                <RoomSubNav active="rooms.calendar" />

                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">ปฏิทินการจองห้องประชุม</h1>
                        <p className="text-sm text-slate-500">คลิกวันที่เพื่อดูรายการจองเป็นการ์ด · แสดงปี พ.ศ.</p>
                    </div>
                    <Link href={route('rooms.index')}>
                        <Button className="rounded-xl bg-sky-600 hover:bg-sky-700">
                            <Plus className="mr-2 h-4 w-4" />
                            จองห้องใหม่
                        </Button>
                    </Link>
                </div>

                <BookingMonthCalendar events={events} tone="sky" resourceFallback="ห้องประชุม" EmptyIcon={DoorOpen} />
            </div>
        </AppLayout>
    );
}
