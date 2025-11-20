import React, { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import thLocale from '@fullcalendar/core/locales/th';

export default function Calendar() {
    const [events, setEvents] = useState([]);

    useEffect(() => {
        fetch(route('vehicles.calendar.events'))
            .then(res => res.json())
            .then(data => setEvents(data));
    }, []);

    return (
        <AppLayout breadcrumbs={[
            { title: 'รายการจองรถ', href: route('vehicles.bookings.index') },
            { title: 'ปฏิทินการใช้รถ', href: '#' }
        ]}>
            <Head title="ปฏิทินการใช้รถ" />
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href={route('vehicles.bookings.index')}>
                            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                        </Link>
                        <h1 className="text-2xl font-bold">ปฏิทินการใช้รถ</h1>
                    </div>
                    <Link href={route('vehicles.bookings.create')}>
                        <Button><Plus className="mr-2 h-4 w-4" /> จองรถใหม่</Button>
                    </Link>
                </div>

                <Card>
                    <CardContent className="p-6">
                        <FullCalendar
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            initialView="dayGridMonth"
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'dayGridMonth,timeGridWeek,timeGridDay'
                            }}
                            locale={thLocale}
                            events={events}
                            eventClick={(info) => {
                                window.location.href = route('vehicles.bookings.show', { booking: info.event.id });
                            }}
                            height="auto"
                            aspectRatio={1.8}
                        />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
