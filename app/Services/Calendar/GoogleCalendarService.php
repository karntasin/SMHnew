<?php

namespace App\Services\Calendar;

use App\Models\CalendarEvent;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class GoogleCalendarService
{
    /**
     * Generate an RFC 5545 compliant iCalendar string (.ics)
     */
    public function generateIcs(Collection $events, string $calendarName = 'FSHH Hospital Calendar'): string
    {
        $lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Fort Surasinghanat Hospital//Hospital Calendar System//TH',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:' . $this->escapeIcsText($calendarName),
            'X-WR-TIMEZONE:Asia/Bangkok',
            'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
            'X-PUBLISHED-TTL:PT1H',
        ];

        foreach ($events as $event) {
            $lines[] = 'BEGIN:VEVENT';
            $lines[] = 'UID:' . ($event->ical_uid ?: $event->id . '@fshh.app');
            $lines[] = 'DTSTAMP:' . Carbon::now()->setTimezone('UTC')->format('Ymd\THis\Z');

            if ($event->is_all_day) {
                $lines[] = 'DTSTART;VALUE=DATE:' . $event->start_time->format('Ymd');
                $lines[] = 'DTEND;VALUE=DATE:' . $event->end_time->copy()->addDay()->format('Ymd');
            } else {
                $lines[] = 'DTSTART:' . $event->start_time->copy()->setTimezone('UTC')->format('Ymd\THis\Z');
                $lines[] = 'DTEND:' . $event->end_time->copy()->setTimezone('UTC')->format('Ymd\THis\Z');
            }

            $lines[] = 'SUMMARY:' . $this->escapeIcsText($event->title);

            $desc = $event->description ? $event->description . "\n\n" : '';
            $desc .= "ขอบเขต: " . $event->scope_label . "\n";
            $desc .= "ระบบปฏิทิน รพ.ค่ายสุรสิงหนาท\n" . url('/calendar');
            $lines[] = 'DESCRIPTION:' . $this->escapeIcsText($desc);

            if ($event->location) {
                $lines[] = 'LOCATION:' . $this->escapeIcsText($event->location);
            }

            $lines[] = 'STATUS:' . ($event->status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED');
            $lines[] = 'END:VEVENT';
        }

        $lines[] = 'END:VCALENDAR';

        return implode("\r\n", $lines) . "\r\n";
    }

    /**
     * Escape special characters in iCalendar format
     */
    private function escapeIcsText(string $text): string
    {
        $text = str_replace('\\', '\\\\', $text);
        $text = str_replace(';', '\;', $text);
        $text = str_replace(',', '\,', $text);
        $text = str_replace(["\r\n", "\n", "\r"], '\n', $text);
        return $text;
    }
}
