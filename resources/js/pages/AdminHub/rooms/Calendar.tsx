import React, { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ArrowLeft } from 'lucide-react';
import { 
    format, 
    addMonths, 
    subMonths, 
    startOfMonth, 
    endOfMonth, 
    startOfWeek, 
    endOfWeek, 
    eachDayOfInterval, 
    isSameMonth, 
    isSameDay,
    isToday
} from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Event {
    id: number;
    title: string;
    start: string;
    end: string;
    backgroundColor: string;
}

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<Event[]>([]);

    useEffect(() => {
        // Fetch events
        fetch(route('rooms.calendar.events'))
            .then(res => res.json())
            .then(data => setEvents(data));
    }, []);

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const today = () => setCurrentDate(new Date());

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const weekDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

    const getEventsForDay = (day: Date) => {
        return events.filter(event => isSameDay(new Date(event.start), day));
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'ระบบจองห้องประชุม', href: '/administration/rooms' },
            { title: 'ปฏิทินการจอง', href: '/administration/rooms/calendar' }
        ]}>
            <Head title="ปฏิทินการจองห้องประชุม" />
            
            <div className="container mx-auto py-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href={route('rooms.index')}>
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <h1 className="text-2xl font-bold">ปฏิทินการจองห้องประชุม</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={today}>วันนี้</Button>
                        <div className="flex items-center border rounded-md bg-white dark:bg-gray-950">
                            <Button variant="ghost" size="icon" onClick={prevMonth}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="w-32 text-center font-medium">
                                {format(currentDate, 'MMMM yyyy', { locale: th })}
                            </span>
                            <Button variant="ghost" size="icon" onClick={nextMonth}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                <Card className="overflow-hidden">
                    <div className="grid grid-cols-7 border-b bg-muted/40">
                        {weekDays.map(day => (
                            <div key={day} className="p-4 text-center font-medium text-sm text-muted-foreground">
                                {day}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 auto-rows-fr bg-muted/20 gap-px border-b">
                        {calendarDays.map((day, dayIdx) => {
                            const dayEvents = getEventsForDay(day);
                            return (
                                <div 
                                    key={day.toString()} 
                                    className={cn(
                                        "min-h-[120px] bg-white dark:bg-gray-950 p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900",
                                        !isSameMonth(day, monthStart) && "bg-gray-50/50 text-muted-foreground dark:bg-gray-900/50"
                                    )}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className={cn(
                                            "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                                            isToday(day) && "bg-blue-600 text-white"
                                        )}>
                                            {format(day, 'd')}
                                        </span>
                                    </div>
                                    <div className="mt-2 space-y-1">
                                        {dayEvents.map(event => (
                                            <div 
                                                key={event.id} 
                                                className="text-xs p-1 rounded truncate text-white cursor-pointer hover:opacity-90"
                                                style={{ backgroundColor: event.backgroundColor }}
                                                title={`${event.title} (${format(new Date(event.start), 'HH:mm')} - ${format(new Date(event.end), 'HH:mm')})`}
                                            >
                                                {format(new Date(event.start), 'HH:mm')} {event.title}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>
        </AppLayout>
    );
}
