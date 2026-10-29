export type CalendarScope = 'personal' | 'hospital' | 'hr';

export type CalendarPriority = 'low' | 'normal' | 'high' | 'urgent';

export type CalendarStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export type CalendarVisibility = 'private' | 'department' | 'public';

export type CalendarReminderType =
    | 'before_1d'
    | 'before_3h'
    | 'before_1h'
    | 'before_30m'
    | 'before_15m'
    | 'on_time'
    | 'custom';

export interface CalendarReminderItem {
    id?: number;
    reminder_type: CalendarReminderType | string;
    offset_minutes: number;
    remind_at?: string;
    max_repeats: number;
    sent_count?: number;
    channel: 'schat' | 'system' | 'both';
    status?: 'pending' | 'sent' | 'cancelled';
}

export interface CalendarAttachment {
    id: number;
    file_name: string;
    file_size: string;
    mime_type: string;
    url: string;
}

export interface CalendarEventProps {
    id: number;
    scope: CalendarScope;
    scope_label: string;
    description?: string | null;
    location?: string | null;
    priority: CalendarPriority;
    category: string;
    status: CalendarStatus;
    visibility: CalendarVisibility;
    department?: { id: number; name: string } | null;
    user?: { id: number; name: string } | null;
    can_edit: boolean;
    google_calendar_url: string;
    reminders: CalendarReminderItem[];
    attachments: CalendarAttachment[];
}

export interface CalendarFullEvent {
    id: string;
    title: string;
    start: string;
    end: string;
    allDay: boolean;
    backgroundColor: string;
    borderColor: string;
    textColor: string;
    extendedProps: CalendarEventProps;
}
