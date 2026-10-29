import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import axios from 'axios';
import {
    CalendarFullEvent,
    CalendarScope,
} from '@/types/calendar';
import CalendarHeader from './components/CalendarHeader';
import MobileHeader from './components/MobileHeader';
import MobileCalendarView from './components/MobileCalendarView';
import DayDetailDrawer from './components/DayDetailDrawer';
import EventModal from './components/EventModal';
import GoogleSyncModal from './components/GoogleSyncModal';
import PwaInstallModal from './components/PwaInstallModal';
import { playChimeSound } from '@/lib/notification-sound';
import { updateAppBadge } from '@/lib/app-badge';

interface CalendarIndexProps {
    auth_user: {
        id: number;
        name: string;
        is_admin_or_hr: boolean;
        can_view_hospital?: boolean;
        department_id?: number | null;
    };
    departments: { id: number; name: string }[];
    feed_url: string;
}

export default function CalendarIndex({
    auth_user,
    departments,
    feed_url,
}: CalendarIndexProps) {
    const calendarRef = useRef<FullCalendar>(null);

    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [viewMode, setViewMode] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('dayGridMonth');
    const [activeScope, setActiveScope] = useState<CalendarScope | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [events, setEvents] = useState<CalendarFullEvent[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Modals & Drawer state
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [editEvent, setEditEvent] = useState<CalendarFullEvent | null>(null);
    const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
    const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);

    const canViewHospital = auth_user.can_view_hospital ?? false;

    // Fetch events from server
    const fetchEvents = useCallback(async () => {
        setIsLoading(true);
        try {
            const params: Record<string, string> = {};
            if (activeScope !== 'all') {
                params.scope = activeScope;
            }

            const response = await axios.get('/calendar/events', { params });
            const data: CalendarFullEvent[] = response.data;
            setEvents(data);

            // Update App Icon badge with count of today's events
            const todayStr = new Date().toISOString().slice(0, 10);
            const todayEventsCount = data.filter((ev) => {
                const s = ev.start.slice(0, 10);
                const e = ev.end ? ev.end.slice(0, 10) : s;
                return todayStr >= s && todayStr <= e;
            }).length;

            updateAppBadge(todayEventsCount);
        } catch (error) {
            console.error('Failed to load calendar events', error);
        } finally {
            setIsLoading(false);
        }
    }, [activeScope]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    // Real-time Search filtering
    const filteredEvents = useMemo(() => {
        if (!searchQuery.trim()) return events;
        const q = searchQuery.toLowerCase().trim();
        return events.filter((e) => {
            const titleMatch = e.title.toLowerCase().includes(q);
            const descMatch = e.extendedProps.description?.toLowerCase().includes(q);
            const locMatch = e.extendedProps.location?.toLowerCase().includes(q);
            const catMatch = e.extendedProps.category?.toLowerCase().includes(q);
            return titleMatch || descMatch || locMatch || catMatch;
        });
    }, [events, searchQuery]);

    // Calendar Navigation Handlers
    const handlePrev = () => {
        const api = calendarRef.current?.getApi();
        if (api) {
            api.prev();
            setCurrentDate(api.getDate());
        }
    };

    const handleNext = () => {
        const api = calendarRef.current?.getApi();
        if (api) {
            api.next();
            setCurrentDate(api.getDate());
        }
    };

    const handleToday = () => {
        const api = calendarRef.current?.getApi();
        if (api) {
            api.today();
            setCurrentDate(api.getDate());
        }
    };

    const handleViewChange = (newView: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay') => {
        setViewMode(newView);
        const api = calendarRef.current?.getApi();
        if (api) {
            api.changeView(newView);
        }
    };

    // Date Cell Click Handler (open day drawer)
    const handleDateClick = (arg: { date: Date }) => {
        setSelectedDate(arg.date);
        setIsDrawerOpen(true);
    };

    // Event Click Handler
    const handleEventClick = (info: { event: { id: string } }) => {
        const clicked = filteredEvents.find((e) => e.id === info.event.id);
        if (clicked) {
            const startD = new Date(clicked.start);
            setSelectedDate(startD);
            setIsDrawerOpen(true);
        }
    };

    // Event Create/Edit/Delete Handlers
    const handleOpenCreateModal = (date?: Date) => {
        setEditEvent(null);
        if (date) setSelectedDate(date);
        setIsEventModalOpen(true);
    };

    const handleEditEvent = (event: CalendarFullEvent) => {
        setEditEvent(event);
        setIsEventModalOpen(true);
    };

    const handleSaveEvent = async (payload: any, isEdit: boolean, eventId?: number) => {
        if (isEdit && eventId) {
            // For Laravel multipart PUT requests, pass _method=PUT with POST
            if (payload instanceof FormData) {
                payload.append('_method', 'PUT');
                await axios.post(`/calendar/events/${eventId}`, payload, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                await axios.put(`/calendar/events/${eventId}`, payload);
            }
        } else {
            await axios.post('/calendar/events', payload, {
                headers: payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
            });
            playChimeSound(); // Play sound chime on successful event creation
        }
        await fetchEvents();
    };

    const handleDeleteEvent = async (eventId: number) => {
        if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบกิจกรรมนี้?')) return;

        try {
            await axios.delete(`/calendar/events/${eventId}`);
            await fetchEvents();
        } catch (err) {
            console.error('Failed to delete event', err);
            alert('เกิดข้อผิดพลาดในการลบกิจกรรม');
        }
    };

    // Event counts calculation
    const eventCounts = {
        all: filteredEvents.length,
        personal: filteredEvents.filter((e) => e.extendedProps.scope === 'personal').length,
        hospital: filteredEvents.filter((e) => e.extendedProps.scope === 'hospital').length,
        hr: filteredEvents.filter((e) => e.extendedProps.scope === 'hr').length,
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'หน้าหลัก', href: '/dashboard' },
                { title: 'ปฏิทินงานและกิจกรรม', href: '/calendar' },
            ]}
        >
            <Head title="ปฏิทิน SMH - ปฏิทินงานและกิจกรรม" />

            <div className="container mx-auto space-y-4 p-3 sm:p-6 max-w-7xl">
                {/* Mobile-Only Header (< lg) */}
                <MobileHeader
                    activeScope={activeScope}
                    onScopeChange={setActiveScope}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    canViewHospital={canViewHospital}
                    onOpenGoogleSyncModal={() => setIsGoogleModalOpen(true)}
                    onOpenPwaModal={() => setIsPwaModalOpen(true)}
                    eventCounts={eventCounts}
                />

                {/* Mobile-Only Calendar View (< lg) */}
                <MobileCalendarView
                    currentDate={currentDate}
                    onDateChange={(d) => {
                        setCurrentDate(d);
                        calendarRef.current?.getApi()?.gotoDate(d);
                    }}
                    selectedDate={selectedDate || new Date()}
                    onSelectDate={(d) => setSelectedDate(d)}
                    events={filteredEvents}
                    activeScope={activeScope}
                    canViewHospital={canViewHospital}
                    onOpenCreateModal={(d) => handleOpenCreateModal(d || selectedDate || new Date())}
                    onEditEvent={handleEditEvent}
                    onDeleteEvent={handleDeleteEvent}
                />

                {/* Desktop-Only Header (>= lg) */}
                <div className="hidden lg:block">
                    <CalendarHeader
                        currentDate={currentDate}
                        viewMode={viewMode}
                        activeScope={activeScope}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        canViewHospital={canViewHospital}
                        onPrev={handlePrev}
                        onNext={handleNext}
                        onToday={handleToday}
                        onViewChange={handleViewChange}
                        onScopeChange={setActiveScope}
                        onOpenCreateModal={() => handleOpenCreateModal(selectedDate || new Date())}
                        onOpenGoogleSyncModal={() => setIsGoogleModalOpen(true)}
                        onOpenPwaModal={() => setIsPwaModalOpen(true)}
                        eventCounts={eventCounts}
                    />
                </div>

                {/* Desktop-Only Calendar View Container (>= lg) */}
                <div className="relative hidden lg:block rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                    {isLoading && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/60 backdrop-blur-2xs dark:bg-slate-900/60">
                            <div className="h-8 w-8 animate-spin rounded-full border-3 border-sky-600 border-t-transparent" />
                        </div>
                    )}

                    <div className="calendar-styled-container">
                        <FullCalendar
                            ref={calendarRef}
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            initialView={viewMode}
                            headerToolbar={false}
                            events={filteredEvents}
                            editable={false}
                            selectable={true}
                            selectMirror={true}
                            dayMaxEvents={3}
                            weekends={true}
                            locale="th"
                            dateClick={handleDateClick}
                            eventClick={handleEventClick}
                            eventContent={(eventInfo) => {
                                const isUrgent = eventInfo.event.extendedProps?.priority === 'urgent';
                                const dotColor = eventInfo.event.backgroundColor || '#0284c7';
                                const hasAttachments = eventInfo.event.extendedProps?.attachments?.length > 0;

                                return (
                                    <div className="flex w-full items-center gap-1 overflow-hidden px-1 py-0.5 text-[11px] leading-tight">
                                        <span
                                            className="h-2 w-2 shrink-0 rounded-full"
                                            style={{ backgroundColor: dotColor }}
                                        />
                                        {!eventInfo.event.allDay && (
                                            <span className="shrink-0 text-[10px] font-semibold opacity-75">
                                                {eventInfo.timeText}
                                            </span>
                                        )}
                                        <span className="truncate font-medium">
                                            {eventInfo.event.title}
                                        </span>
                                        {hasAttachments && (
                                            <span className="text-[10px] text-slate-400">📎</span>
                                        )}
                                        {isUrgent && (
                                            <span className="ml-auto shrink-0 rounded bg-rose-500 px-1 text-[9px] text-white">
                                                ด่วน
                                            </span>
                                        )}
                                    </div>
                                );
                            }}
                            height="auto"
                        />
                    </div>
                </div>

                {/* Desktop Day Detail Slide-over Drawer (>= lg) */}
                <div className="hidden lg:block">
                    <DayDetailDrawer
                        isOpen={isDrawerOpen}
                        onClose={() => setIsDrawerOpen(false)}
                        selectedDate={selectedDate}
                        events={filteredEvents}
                        onOpenCreateModal={handleOpenCreateModal}
                        onEditEvent={handleEditEvent}
                        onDeleteEvent={handleDeleteEvent}
                    />
                </div>

                {/* Create/Edit Event Modal */}
                <EventModal
                    isOpen={isEventModalOpen}
                    onClose={() => setIsEventModalOpen(false)}
                    onSave={handleSaveEvent}
                    editEvent={editEvent}
                    initialDate={selectedDate}
                    departments={departments}
                    isAdminOrHr={auth_user.is_admin_or_hr}
                    canViewHospital={canViewHospital}
                />

                {/* Google & Apple Calendar Sync & Import Modal */}
                <GoogleSyncModal
                    isOpen={isGoogleModalOpen}
                    onClose={() => setIsGoogleModalOpen(false)}
                    feedUrl={feed_url}
                    onImportSuccess={fetchEvents}
                />

                {/* PWA Mobile App Install Modal */}
                <PwaInstallModal
                    isOpen={isPwaModalOpen}
                    onClose={() => setIsPwaModalOpen(false)}
                />
            </div>
        </AppLayout>
    );
}
