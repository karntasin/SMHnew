import React from 'react';
import {
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
    X,
    Building2,
    User,
    CheckCircle2,
    Paperclip,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalendarFullEvent } from '@/types/calendar';

interface DayDetailDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate: Date | null;
    events: CalendarFullEvent[];
    onOpenCreateModal: (date?: Date) => void;
    onEditEvent: (event: CalendarFullEvent) => void;
    onDeleteEvent: (eventId: number) => void;
}

const THAI_DAYS = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export default function DayDetailDrawer({
    isOpen,
    onClose,
    selectedDate,
    events,
    onOpenCreateModal,
    onEditEvent,
    onDeleteEvent,
}: DayDetailDrawerProps) {
    if (!isOpen || !selectedDate) return null;

    const thaiDayName = THAI_DAYS[selectedDate.getDay()];
    const dateNum = selectedDate.getDate();
    const thaiMonth = THAI_MONTHS[selectedDate.getMonth()];
    const thaiYear = selectedDate.getFullYear() + 543;

    // Filter events that occur on this selected date
    const dateStr = selectedDate.toISOString().slice(0, 10);
    const dayEvents = events.filter((ev) => {
        const startStr = ev.start.slice(0, 10);
        const endStr = ev.end ? ev.end.slice(0, 10) : startStr;
        return dateStr >= startStr && dateStr <= endStr;
    });

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
            {/* Backdrop click */}
            <div className="flex-1" onClick={onClose} />

            {/* Slide-over Drawer Panel */}
            <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl dark:bg-slate-900 sm:border-l sm:border-slate-200 dark:sm:border-slate-800">
                {/* Header */}
                <div className="border-b border-slate-200/80 p-5 dark:border-slate-800">
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                                <CalendarIcon className="h-3.5 w-3.5" />
                                รายละเอียดประจำวัน
                            </span>
                            <h2 className="mt-2 text-xl font-bold text-slate-800 dark:text-white">
                                {thaiDayName}ที่ {dateNum} {thaiMonth} {thaiYear}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                มีทั้งหมด {dayEvents.length} กิจกรรม/งานในวันนี้
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Event List Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {dayEvents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-12 text-center dark:border-slate-800">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                                <CalendarIcon className="h-6 w-6" />
                            </div>
                            <h3 className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                ไม่มีกิจกรรมในวันนี้
                            </h3>
                            <p className="mt-1 text-xs text-slate-400">
                                คุณสามารถเริ่มสร้างกิจกรรมหรือตารางงานใหม่ได้ทันที
                            </p>
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => onOpenCreateModal(selectedDate)}
                                className="mt-4 rounded-xl bg-sky-600 text-white shadow-xs hover:bg-sky-700"
                            >
                                <Plus className="mr-1.5 h-4 w-4" />
                                สร้างกิจกรรมในวันนี้
                            </Button>
                        </div>
                    ) : (
                        dayEvents.map((ev) => {
                            const props = ev.extendedProps;
                            const isAllDay = ev.allDay;
                            const startTime = isAllDay ? 'ตลอดวัน' : new Date(ev.start).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
                            const endTime = isAllDay ? '' : ' - ' + new Date(ev.end).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';

                            const scopeBg =
                                props.scope === 'personal'
                                    ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800'
                                    : props.scope === 'hospital'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                    : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';

                            return (
                                <div
                                    key={ev.id}
                                    className="group relative rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80"
                                    style={{ borderLeftWidth: '5px', borderLeftColor: ev.backgroundColor || '#0284c7' }}
                                >
                                    {/* Top row: Scope Badge & Priority */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-semibold ${scopeBg}`}>
                                                {props.scope_label}
                                            </span>
                                            {props.priority === 'urgent' && (
                                                <span className="inline-flex items-center gap-1 rounded-lg bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 animate-pulse">
                                                    <AlertCircle className="h-3 w-3" />
                                                    เร่งด่วน
                                                </span>
                                            )}
                                            {props.category && (
                                                <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                                    {props.category}
                                                </span>
                                            )}
                                        </div>

                                        {/* Edit/Delete Actions */}
                                        {props.can_edit && (
                                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                                                <button
                                                    type="button"
                                                    onClick={() => onEditEvent(ev)}
                                                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-sky-600 dark:hover:bg-slate-800"
                                                    title="แก้ไขกิจกรรม"
                                                >
                                                    <Edit3 className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => onDeleteEvent(props.id)}
                                                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
                                                    title="ลบกิจกรรม"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Title */}
                                    <h3 className="mt-2 text-base font-bold text-slate-800 dark:text-white">
                                        {ev.title}
                                    </h3>

                                    {/* Time & Location */}
                                    <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                                            <span>
                                                {startTime}
                                                {endTime}
                                            </span>
                                        </div>
                                        {props.location && (
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                                <span>{props.location}</span>
                                            </div>
                                        )}
                                        {props.user && (
                                            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                                                <User className="h-3 w-3" />
                                                <span>ผู้บันทึก: {props.user.name}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Description */}
                                    {props.description && (
                                        <p className="mt-2.5 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                                            {props.description}
                                        </p>
                                    )}

                                    {/* Reminders section */}
                                    {props.reminders && props.reminders.length > 0 && (
                                        <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50/50 p-2 text-xs text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-300">
                                            <div className="flex items-center gap-1.5 font-semibold">
                                                <Bell className="h-3.5 w-3.5 text-sky-600" />
                                                <span>การแจ้งเตือน S-Chat Bot:</span>
                                            </div>
                                            <div className="mt-1 space-y-0.5 text-[11px]">
                                                {props.reminders.map((r, idx) => (
                                                    <div key={idx} className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                                        <span>
                                                            {r.reminder_type === 'before_1d' && 'เตือนล่วงหน้า 1 วัน'}
                                                            {r.reminder_type === 'before_3h' && 'เตือนล่วงหน้า 3 ชม.'}
                                                            {r.reminder_type === 'before_1h' && 'เตือนล่วงหน้า 1 ชม.'}
                                                            {r.reminder_type === 'before_30m' && 'เตือนล่วงหน้า 30 นาที'}
                                                            {r.reminder_type === 'on_time' && 'เตือนเมื่อถึงเวลา'}
                                                            {r.reminder_type === 'custom' && 'กำหนดเอง'}
                                                            {r.max_repeats > 1 && ` (เตือนซ้ำ ${r.max_repeats} ครั้ง)`}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Attachments section */}
                                    {props.attachments && props.attachments.length > 0 && (
                                        <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-2.5 dark:border-slate-800 dark:bg-slate-800/40">
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                <Paperclip className="h-3.5 w-3.5 text-sky-600" />
                                                <span>ไฟล์แนบ ({props.attachments.length}):</span>
                                            </div>
                                            <div className="mt-2 space-y-1.5">
                                                {props.attachments.map((att) => (
                                                    <div
                                                        key={att.id}
                                                        className="flex items-center justify-between rounded-lg bg-white p-2 text-xs border border-slate-100 dark:bg-slate-900 dark:border-slate-800"
                                                    >
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <Paperclip className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                            <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                                                                {att.file_name}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 shrink-0">
                                                                ({att.file_size})
                                                            </span>
                                                        </div>
                                                        <a
                                                            href={att.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:text-sky-700 hover:underline shrink-0"
                                                        >
                                                            <Download className="h-3 w-3" />
                                                            ดาวน์โหลด
                                                        </a>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Links: Google Calendar + Export .ics */}
                                    <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                                        <a
                                            href={props.google_calendar_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100 dark:bg-sky-950/50 dark:text-sky-300"
                                        >
                                            <Share2 className="h-3 w-3" />
                                            เพิ่มลง Google Calendar
                                        </a>

                                        <a
                                            href={`/calendar/events/${props.id}/export-ics`}
                                            download
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                                        >
                                            <Download className="h-3 w-3" />
                                            ดาวน์โหลด .ics
                                        </a>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer Quick Action */}
                <div className="border-t border-slate-200/80 p-4 dark:border-slate-800">
                    <Button
                        type="button"
                        onClick={() => onOpenCreateModal(selectedDate)}
                        className="w-full rounded-xl bg-sky-600 text-white shadow-md shadow-sky-600/20 hover:bg-sky-700"
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        เพิ่มกิจกรรมในวันนี้
                    </Button>
                </div>
            </div>
        </div>
    );
}
