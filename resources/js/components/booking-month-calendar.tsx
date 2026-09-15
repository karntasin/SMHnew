import { useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Clock,
    MapPin,
    User,
    Users,
} from 'lucide-react';
import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    isToday,
    startOfMonth,
    startOfWeek,
    subMonths,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { formatThaiDateLong, formatThaiMonthYear } from '@/components/ui/thai-date-picker';

export type BookingCalendarResource = {
    name: string;
    location?: string | null;
    image_url?: string | null;
    color?: string | null;
};

export type BookingCalendarEvent = {
    id: number;
    title: string;
    calendar_title?: string;
    start: string;
    end: string;
    status: string;
    attendees_count?: number | null;
    description?: string | null;
    backgroundColor: string;
    url?: string;
    user: { name: string };
    resource?: BookingCalendarResource | null;
    room?: BookingCalendarResource | null;
};

type Tone = 'sky' | 'emerald';

const TONES: Record<Tone, {
    today: string;
    selectedRing: string;
    selectedBg: string;
    hover: string;
    count: string;
    btn: string;
    accent: string;
    emptyIcon: string;
}> = {
    sky: {
        today: 'bg-sky-600 text-white',
        selectedRing: 'ring-sky-500 bg-sky-50/80',
        selectedBg: 'bg-sky-100 text-sky-700',
        hover: 'hover:bg-sky-50',
        count: 'bg-sky-100 text-sky-700',
        btn: 'bg-sky-600 hover:bg-sky-700',
        accent: 'text-sky-600',
        emptyIcon: 'text-sky-300',
    },
    emerald: {
        today: 'bg-emerald-600 text-white',
        selectedRing: 'ring-emerald-500 bg-emerald-50/80',
        selectedBg: 'bg-emerald-100 text-emerald-700',
        hover: 'hover:bg-emerald-50',
        count: 'bg-emerald-100 text-emerald-700',
        btn: 'bg-emerald-600 hover:bg-emerald-700',
        accent: 'text-emerald-600',
        emptyIcon: 'text-emerald-300',
    },
};

const STATUS_BADGE: Record<string, string> = {
    approved: 'bg-emerald-500 text-white',
    pending: 'bg-amber-400 text-slate-900',
    rejected: 'bg-rose-500 text-white',
    cancelled: 'bg-slate-400 text-white',
    completed: 'bg-teal-500 text-white',
};

const STATUS_LABEL: Record<string, string> = {
    approved: 'อนุมัติแล้ว',
    pending: 'รออนุมัติ',
    rejected: 'ไม่อนุมัติ',
    cancelled: 'ยกเลิก',
    completed: 'เสร็จสิ้น',
};

const WEEK_DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

function eventResource(event: BookingCalendarEvent): BookingCalendarResource | null {
    return event.resource || event.room || null;
}

export default function BookingMonthCalendar({
    events,
    tone = 'sky',
    resourceFallback = 'รายการ',
    EmptyIcon = CalendarDays,
}: {
    events: BookingCalendarEvent[];
    tone?: Tone;
    resourceFallback?: string;
    EmptyIcon?: typeof CalendarDays;
}) {
    const colors = TONES[tone];
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const calendarDays = eachDayOfInterval({
        start: startOfWeek(monthStart),
        end: endOfWeek(monthEnd),
    });

    const getEventsForDay = (day: Date) =>
        events.filter((event) => isSameDay(new Date(event.start), day));

    const selectedDayEvents = useMemo(
        () =>
            events
                .filter((event) => isSameDay(new Date(event.start), selectedDate))
                .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
        [events, selectedDate],
    );

    const goToday = () => {
        const now = new Date();
        setCurrentDate(now);
        setSelectedDate(now);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-end gap-2">
                <Button variant="outline" className="rounded-xl" onClick={goToday}>
                    วันนี้
                </Button>
                <div className="flex items-center rounded-xl border bg-white">
                    <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="min-w-36 px-2 text-center text-sm font-semibold text-slate-700">
                        {formatThaiMonthYear(currentDate)}
                    </span>
                    <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Card className="overflow-hidden rounded-[1.5rem] border-slate-200/80 shadow-sm">
                <div className="grid grid-cols-7 border-b bg-muted/40">
                    {WEEK_DAYS.map((day) => (
                        <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground md:p-4">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid auto-rows-fr grid-cols-7 gap-px bg-muted/20">
                    {calendarDays.map((day) => {
                        const dayEvents = getEventsForDay(day);
                        const selected = isSameDay(day, selectedDate);

                        return (
                            <button
                                type="button"
                                key={day.toString()}
                                onClick={() => setSelectedDate(day)}
                                className={cn(
                                    'min-h-[96px] bg-white p-2 text-left transition-colors md:min-h-[120px]',
                                    colors.hover,
                                    !isSameMonth(day, monthStart) && 'bg-slate-50/70 text-muted-foreground',
                                    selected && `ring-2 ring-inset ${colors.selectedRing}`,
                                )}
                            >
                                <div className="flex items-start justify-between">
                                    <span
                                        className={cn(
                                            'flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium',
                                            isToday(day) && colors.today,
                                            selected && !isToday(day) && colors.selectedBg,
                                        )}
                                    >
                                        {format(day, 'd')}
                                    </span>
                                    {dayEvents.length > 0 && (
                                        <span className={cn('rounded-full px-1.5 text-[10px] font-semibold', colors.count)}>
                                            {dayEvents.length}
                                        </span>
                                    )}
                                </div>
                                <div className="mt-2 hidden space-y-1 sm:block">
                                    {dayEvents.slice(0, 3).map((event) => {
                                        const resource = eventResource(event);
                                        return (
                                            <div
                                                key={event.id}
                                                className="truncate rounded px-1 py-0.5 text-[10px] text-white"
                                                style={{ backgroundColor: event.backgroundColor }}
                                                title={`${event.calendar_title || event.title} (${format(new Date(event.start), 'HH:mm')} - ${format(new Date(event.end), 'HH:mm')})`}
                                            >
                                                {format(new Date(event.start), 'HH:mm')} {resource?.name || event.title}
                                            </div>
                                        );
                                    })}
                                    {dayEvents.length > 3 && (
                                        <div className="text-[10px] text-slate-400">+{dayEvents.length - 3} รายการ</div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </Card>

            <section className="space-y-4 rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-xl shadow-slate-900/5 md:p-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">รายการในวันที่เลือก</h2>
                        <p className="text-sm text-slate-500">
                            {formatThaiDateLong(selectedDate)} · {selectedDayEvents.length} รายการ
                        </p>
                    </div>
                    {isToday(selectedDate) && (
                        <Badge className={cn('w-fit border-0', colors.btn)}>วันนี้</Badge>
                    )}
                </div>

                {selectedDayEvents.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
                        ไม่มีรายการในวันที่เลือก
                    </div>
                ) : (
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {selectedDayEvents.map((booking) => {
                            const resource = eventResource(booking);
                            const color = resource?.color || booking.backgroundColor;

                            return (
                                <article
                                    key={booking.id}
                                    className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                                >
                                    <div className="relative p-3 pb-0">
                                        <div
                                            className="relative overflow-hidden rounded-2xl p-[3px]"
                                            style={{
                                                background: `linear-gradient(135deg, ${color} 0%, #67e8f9 55%, ${color}88 100%)`,
                                            }}
                                        >
                                            <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] bg-slate-100">
                                                {resource?.image_url ? (
                                                    <img
                                                        src={resource.image_url}
                                                        alt={resource.name}
                                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <div className={cn('flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-50 to-slate-100', colors.emptyIcon)}>
                                                        <EmptyIcon className="h-12 w-12" />
                                                        <span className="text-xs text-slate-400">{resource?.name || resourceFallback}</span>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                                <div className="absolute left-3 top-3">
                                                    <Badge className={cn('border-0', STATUS_BADGE[booking.status] || 'bg-slate-500 text-white')}>
                                                        {STATUS_LABEL[booking.status] || booking.status}
                                                    </Badge>
                                                </div>
                                                <div className="absolute bottom-3 left-3 right-3">
                                                    <h3 className="truncate text-lg font-bold text-white drop-shadow">
                                                        {resource?.name || resourceFallback}
                                                    </h3>
                                                    {resource?.location && (
                                                        <p className="flex items-center gap-1 truncate text-xs text-white/85">
                                                            <MapPin className="h-3 w-3" />
                                                            {resource.location}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 p-4">
                                        <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-slate-700">
                                            {booking.title}
                                        </p>
                                        <div className="space-y-2 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                                            <div className="flex items-center gap-2">
                                                <CalendarDays className={cn('h-4 w-4', colors.accent)} />
                                                <span>{formatThaiDateLong(new Date(booking.start))}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className={cn('h-4 w-4', colors.accent)} />
                                                <span>
                                                    {format(new Date(booking.start), 'HH:mm')} - {format(new Date(booking.end), 'HH:mm')} น.
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <User className={cn('h-4 w-4', colors.accent)} />
                                                <span>จองโดย {booking.user?.name || '-'}</span>
                                            </div>
                                            {booking.attendees_count ? (
                                                <div className="flex items-center gap-2">
                                                    <Users className={cn('h-4 w-4', colors.accent)} />
                                                    <span>{booking.attendees_count} คน</span>
                                                </div>
                                            ) : null}
                                        </div>
                                        {booking.url ? (
                                            <Button asChild className={cn('w-full rounded-xl', colors.btn)}>
                                                <Link href={booking.url}>ดูรายละเอียด</Link>
                                            </Button>
                                        ) : null}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
