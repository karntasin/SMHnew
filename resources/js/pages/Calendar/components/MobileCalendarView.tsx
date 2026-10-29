import React, { useState, useMemo } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Clock,
    MapPin,
    AlertCircle,
    Bell,
    Share2,
    Download,
    Edit3,
    Trash2,
    Plus,
    List,
    CalendarDays,
    CheckCircle2,
    User,
    Paperclip,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalendarFullEvent, CalendarScope } from '@/types/calendar';

interface MobileCalendarViewProps {
    currentDate: Date;
    onDateChange: (date: Date) => void;
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
    events: CalendarFullEvent[];
    activeScope: CalendarScope | 'all';
    canViewHospital?: boolean;
    onOpenCreateModal: (date?: Date) => void;
    onEditEvent: (event: CalendarFullEvent) => void;
    onDeleteEvent: (eventId: number) => void;
}

const THAI_DAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const THAI_DAYS_FULL = [
    'วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'
];
const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export default function MobileCalendarView({
    currentDate,
    onDateChange,
    selectedDate,
    onSelectDate,
    events,
    activeScope,
    canViewHospital = true,
    onOpenCreateModal,
    onEditEvent,
    onDeleteEvent,
}: MobileCalendarViewProps) {
    const [mobileView, setMobileView] = useState<'calendar' | 'agenda'>('calendar');

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const thaiMonth = THAI_MONTHS[month];
    const thaiYear = year + 543;

    // Month Navigation
    const handlePrevMonth = () => {
        onDateChange(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        onDateChange(new Date(year, month + 1, 1));
    };

    const handleToday = () => {
        const now = new Date();
        onDateChange(now);
        onSelectDate(now);
    };

    // Calculate calendar days matrix
    const { daysMatrix, eventsByDate } = useMemo(() => {
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        const matrix: { date: Date; isCurrentMonth: boolean }[] = [];

        // Previous month trailing days
        for (let i = firstDay - 1; i >= 0; i--) {
            matrix.push({
                date: new Date(year, month - 1, daysInPrevMonth - i),
                isCurrentMonth: false,
            });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            matrix.push({
                date: new Date(year, month, i),
                isCurrentMonth: true,
            });
        }

        // Next month leading days (to complete 35 or 42 cells)
        const remaining = (7 - (matrix.length % 7)) % 7;
        for (let i = 1; i <= remaining; i++) {
            matrix.push({
                date: new Date(year, month + 1, i),
                isCurrentMonth: false,
            });
        }

        // Map events by date YYYY-MM-DD
        const map: Record<string, CalendarFullEvent[]> = {};
        for (const ev of events) {
            const startD = ev.start.slice(0, 10);
            const endD = ev.end ? ev.end.slice(0, 10) : startD;

            // Simple range iteration (up to 30 days)
            let curr = new Date(startD);
            const stop = new Date(endD);
            while (curr <= stop) {
                const key = curr.toISOString().slice(0, 10);
                if (!map[key]) map[key] = [];
                map[key].push(ev);
                curr.setDate(curr.getDate() + 1);
            }
        }

        return { daysMatrix: matrix, eventsByDate: map };
    }, [year, month, events]);

    // Selected day events
    const selectedDateKey = selectedDate.toISOString().slice(0, 10);
    const selectedEvents = eventsByDate[selectedDateKey] || [];

    const todayKey = new Date().toISOString().slice(0, 10);

    // Continuous Agenda upcoming days
    const upcomingDays = useMemo(() => {
        const keys = Object.keys(eventsByDate)
            .filter((k) => k >= todayKey)
            .sort();
        return keys.map((k) => ({
            dateStr: k,
            date: new Date(k),
            items: eventsByDate[k],
        }));
    }, [eventsByDate, todayKey]);

    const isSameDate = (d1: Date, d2: Date) => {
        return (
            d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate()
        );
    };

    return (
        <div className="space-y-4 lg:hidden pb-20">
            {/* View Segmented Switcher & Month Chevrons */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                {/* Month Navigator */}
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={handlePrevMonth}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="px-1 text-sm font-bold text-slate-800 dark:text-white">
                        {thaiMonth} {thaiYear}
                    </span>
                    <button
                        type="button"
                        onClick={handleNextMonth}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={handleToday}
                        className="ml-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                        วันนี้
                    </button>
                </div>

                {/* Mode toggle (Calendar vs Agenda) */}
                <div className="flex items-center rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
                    <button
                        type="button"
                        onClick={() => setMobileView('calendar')}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                            mobileView === 'calendar'
                                ? 'bg-white text-sky-700 shadow-2xs dark:bg-slate-900 dark:text-sky-300'
                                : 'text-slate-500 dark:text-slate-400'
                        }`}
                        title="ปฏิทินย่อ + รายวัน"
                    >
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span className="hidden xs:inline">ปฏิทิน</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setMobileView('agenda')}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                            mobileView === 'agenda'
                                ? 'bg-white text-sky-700 shadow-2xs dark:bg-slate-900 dark:text-sky-300'
                                : 'text-slate-500 dark:text-slate-400'
                        }`}
                        title="กำหนดการต่อเนื่อง"
                    >
                        <List className="h-3.5 w-3.5" />
                        <span className="hidden xs:inline">กำหนดการ</span>
                    </button>
                </div>
            </div>

            {/* View 1: Compact Month Grid + Daily Feed */}
            {mobileView === 'calendar' && (
                <div className="space-y-4">
                    {/* Compact Month Grid */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                        {/* Day headers */}
                        <div className="grid grid-cols-7 text-center mb-1">
                            {THAI_DAYS_SHORT.map((day, idx) => (
                                <div
                                    key={day}
                                    className={`py-1 text-[11px] font-bold ${
                                        idx === 0
                                            ? 'text-rose-500'
                                            : idx === 6
                                            ? 'text-sky-600'
                                            : 'text-slate-400 dark:text-slate-500'
                                    }`}
                                >
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-y-1">
                            {daysMatrix.map(({ date, isCurrentMonth }, idx) => {
                                const dateKey = date.toISOString().slice(0, 10);
                                const dayEvents = eventsByDate[dateKey] || [];
                                const isSelected = isSameDate(date, selectedDate);
                                const isToday = dateKey === todayKey;

                                // Has events by scope
                                const hasPersonal = dayEvents.some(
                                    (e) => e.extendedProps.scope === 'personal'
                                );
                                const hasHospital = dayEvents.some(
                                    (e) => e.extendedProps.scope === 'hospital'
                                );
                                const hasHr = dayEvents.some(
                                    (e) => e.extendedProps.scope === 'hr'
                                );

                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            onSelectDate(date);
                                            if (!isCurrentMonth) {
                                                onDateChange(new Date(date.getFullYear(), date.getMonth(), 1));
                                            }
                                        }}
                                        className={`group relative flex flex-col items-center justify-center py-1.5 transition-all rounded-xl ${
                                            isSelected
                                                ? 'bg-sky-50 dark:bg-sky-950/40'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                        }`}
                                    >
                                        {/* Date Circle */}
                                        <div
                                            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                                                isSelected
                                                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                                                    : isToday
                                                    ? 'border-2 border-sky-600 text-sky-600 dark:text-sky-400 font-bold'
                                                    : isCurrentMonth
                                                    ? 'text-slate-700 dark:text-slate-200'
                                                    : 'text-slate-300 dark:text-slate-600'
                                            }`}
                                        >
                                            {date.getDate()}
                                        </div>

                                        {/* Scope Dots Indicator */}
                                        <div className="mt-1 flex h-1.5 items-center justify-center gap-0.5">
                                            {hasPersonal && (
                                                <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                                            )}
                                            {hasHospital && canViewHospital && (
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                            )}
                                            {hasHr && (
                                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Instant Daily Feed Section */}
                    <div className="space-y-3">
                        {/* Day Title Bar */}
                        <div className="flex items-center justify-between px-1">
                            <div>
                                <h2 className="text-base font-bold text-slate-800 dark:text-white">
                                    {THAI_DAYS_FULL[selectedDate.getDay()]}ที่ {selectedDate.getDate()} {THAI_MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear() + 543}
                                </h2>
                                <p className="text-[11px] text-slate-500">
                                    {selectedEvents.length} กิจกรรมในวันนี้
                                </p>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => onOpenCreateModal(selectedDate)}
                                className="rounded-xl border-sky-300 text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300 text-xs h-8"
                            >
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                เพิ่มงาน
                            </Button>
                        </div>

                        {/* Events Feed Cards */}
                        {selectedEvents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 p-8 text-center dark:border-slate-800 dark:bg-slate-900/40">
                                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-50 text-sky-600 dark:bg-slate-800 dark:text-sky-400">
                                    <CalendarIcon className="h-5 w-5" />
                                </div>
                                <h3 className="mt-2.5 text-sm font-bold text-slate-700 dark:text-slate-200">
                                    ไม่มีกิจกรรมในวันนี้
                                </h3>
                                <p className="mt-0.5 text-xs text-slate-400 max-w-xs">
                                    แตะปุ่มด้านล่างเพื่อบันทึกงานใหม่ หรือตั้งเตือนผ่านบอท S-Chat
                                </p>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => onOpenCreateModal(selectedDate)}
                                    className="mt-3.5 rounded-xl bg-sky-600 text-white shadow-xs hover:bg-sky-700 text-xs"
                                >
                                    <Plus className="mr-1 h-3.5 w-3.5" />
                                    สร้างกิจกรรมในวันนี้
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {selectedEvents.map((ev) => (
                                    <MobileEventCard
                                        key={ev.id}
                                        event={ev}
                                        onEdit={onEditEvent}
                                        onDelete={onDeleteEvent}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* View 2: Continuous Agenda List (Google Calendar Style) */}
            {mobileView === 'agenda' && (
                <div className="space-y-4">
                    <div className="px-1">
                        <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                            กำหนดการและกิจกรรมที่กำลังจะมาถึง
                        </h2>
                        <p className="text-[11px] text-slate-500">
                            เรียงลำดับตามวันที่เริ่มตั้งแต่วันนี้เป็นต้นไป
                        </p>
                    </div>

                    {upcomingDays.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 p-8 text-center dark:border-slate-800 dark:bg-slate-900/40">
                            <p className="text-xs text-slate-500">
                                ยังไม่มีกำหนดการในอนาคต
                            </p>
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => onOpenCreateModal(new Date())}
                                className="mt-3 rounded-xl bg-sky-600 text-white shadow-xs hover:bg-sky-700 text-xs"
                            >
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                สร้างกิจกรรมใหม่
                            </Button>
                        </div>
                    ) : (
                        upcomingDays.map(({ dateStr, date, items }) => (
                            <div key={dateStr} className="space-y-2">
                                <div className="sticky top-0 z-10 flex items-center justify-between bg-slate-50/90 py-1 backdrop-blur-xs dark:bg-slate-950/90">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        {THAI_DAYS_FULL[date.getDay()]}ที่ {date.getDate()} {THAI_MONTHS[date.getMonth()]} {date.getFullYear() + 543}
                                    </span>
                                    {dateStr === todayKey && (
                                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                                            วันนี้
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    {items.map((ev) => (
                                        <MobileEventCard
                                            key={ev.id}
                                            event={ev}
                                            onEdit={onEditEvent}
                                            onDelete={onDeleteEvent}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Floating Action Button (FAB) at Bottom-Right for Instant Thumb Action */}
            <button
                type="button"
                onClick={() => onOpenCreateModal(selectedDate)}
                className="fixed bottom-6 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg shadow-sky-600/35 transition-all hover:scale-105 active:scale-95 focus:outline-hidden"
                title="สร้างกิจกรรมใหม่"
                aria-label="สร้างกิจกรรมใหม่"
            >
                <Plus className="h-6 w-6 stroke-[2.5]" />
            </button>
        </div>
    );
}

// Mobile Event Card Subcomponent
function MobileEventCard({
    event,
    onEdit,
    onDelete,
}: {
    event: CalendarFullEvent;
    onEdit: (ev: CalendarFullEvent) => void;
    onDelete: (id: number) => void;
}) {
    const props = event.extendedProps;
    const isAllDay = event.allDay;

    const startTime = isAllDay
        ? 'ตลอดทั้งวัน'
        : new Date(event.start).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
    const endTime = isAllDay
        ? ''
        : ' - ' + new Date(event.end).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';

    const scopeBg =
        props.scope === 'personal'
            ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800'
            : props.scope === 'hospital'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';

    return (
        <div
            className="group relative rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs transition-all active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900"
            style={{ borderLeftWidth: '4px', borderLeftColor: event.backgroundColor || '#0284c7' }}
        >
            {/* Top row: Scope & Priority */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${scopeBg}`}>
                        {props.scope_label}
                    </span>

                    {props.priority === 'urgent' && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse">
                            <AlertCircle className="h-2.5 w-2.5" />
                            เร่งด่วน
                        </span>
                    )}

                    {props.category && (
                        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {props.category}
                        </span>
                    )}
                </div>

                {/* Edit & Delete actions */}
                {props.can_edit && (
                    <div className="flex items-center gap-0.5">
                        <button
                            type="button"
                            onClick={() => onEdit(event)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-sky-600 dark:hover:bg-slate-800"
                            title="แก้ไข"
                        >
                            <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onDelete(props.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
                            title="ลบ"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Title */}
            <h3 className="mt-2 text-sm font-bold text-slate-800 dark:text-white leading-snug">
                {event.title}
            </h3>

            {/* Time & Location */}
            <div className="mt-1.5 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>
                        {startTime}
                        {endTime}
                    </span>
                </div>

                {props.location && (
                    <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{props.location}</span>
                    </div>
                )}
            </div>

            {/* Description if present */}
            {props.description && (
                <p className="mt-2 rounded-xl bg-slate-50 p-2 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 line-clamp-2">
                    {props.description}
                </p>
            )}

            {/* Attachments list */}
            {props.attachments && props.attachments.length > 0 && (
                <div className="mt-2.5 space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                        <Paperclip className="h-3 w-3" />
                        ไฟล์แนบ ({props.attachments.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                        {props.attachments.map((att) => (
                            <a
                                key={att.id}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            >
                                <Paperclip className="h-2.5 w-2.5 text-sky-600" />
                                <span className="max-w-[120px] truncate">{att.file_name}</span>
                                <span className="text-[9px] text-slate-400">({att.file_size})</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Reminders / S-Chat indicator */}
            {props.reminders && props.reminders.length > 0 && (
                <div className="mt-2.5 flex items-center gap-1 text-[11px] text-sky-700 dark:text-sky-300">
                    <Bell className="h-3 w-3" />
                    <span>แจ้งเตือน S-Chat Bot {props.reminders.length} ระดับ</span>
                </div>
            )}

            {/* Quick Actions Footer */}
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800">
                <a
                    href={props.google_calendar_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 dark:bg-sky-950/50 dark:text-sky-300"
                >
                    <Share2 className="h-3 w-3" />
                    Google Cal
                </a>

                <a
                    href={`/calendar/events/${props.id}/export-ics`}
                    download
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                >
                    <Download className="h-3 w-3" />
                    .ics
                </a>
            </div>
        </div>
    );
}
