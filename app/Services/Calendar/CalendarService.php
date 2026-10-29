<?php

namespace App\Services\Calendar;

use App\Models\CalendarEvent;
use App\Models\CalendarEventAttachment;
use App\Models\CalendarReminder;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CalendarService
{
    public function __construct(
        protected readonly CalendarNotificationService $notificationService
    ) {}

    /**
     * Get events for a user within a date range and optional scope/category filter
     */
    public function getEvents(
        User $user,
        ?string $start = null,
        ?string $end = null,
        ?string $scope = null,
        ?string $search = null
    ): Collection {
        $query = CalendarEvent::query()
            ->with(['user:id,name', 'department:id,name', 'reminders', 'attachments'])
            ->accessibleBy($user);

        if ($start) {
            $startDate = Carbon::parse($start)->startOfDay();
            $query->where('end_time', '>=', $startDate);
        }

        if ($end) {
            $endDate = Carbon::parse($end)->endOfDay();
            $query->where('start_time', '<=', $endDate);
        }

        if ($scope && in_array($scope, ['personal', 'hospital', 'hr'], true)) {
            $query->where('scope', $scope);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%");
            });
        }

        return $query->orderBy('start_time')->get();
    }

    /**
     * Create event with reminders
     */
    public function createEvent(User $user, array $data): CalendarEvent
    {
        return DB::connection('mysql')->transaction(function () use ($user, $data) {
            $scope = $data['scope'] ?? 'personal';
            $visibility = $data['visibility'] ?? ($scope === 'personal' ? 'private' : 'public');

            $startTime = Carbon::parse($data['start_time']);
            $endTime = isset($data['end_time']) ? Carbon::parse($data['end_time']) : $startTime->copy()->addHour();

            if ($endTime->lt($startTime)) {
                $endTime = $startTime->copy()->addHour();
            }

            $color = $data['color'] ?? match ($scope) {
                'personal' => '#0284c7', // Sky
                'hospital' => '#059669', // Emerald
                'hr' => '#e11d48',       // Rose
                default => '#64748b',
            };

            $event = CalendarEvent::create([
                'user_id' => $user->id,
                'scope' => $scope,
                'title' => trim($data['title']),
                'description' => $data['description'] ?? null,
                'location' => $data['location'] ?? null,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'is_all_day' => (bool) ($data['is_all_day'] ?? false),
                'color' => $color,
                'category' => $data['category'] ?? 'general',
                'priority' => $data['priority'] ?? 'normal',
                'department_id' => $data['department_id'] ?? null,
                'visibility' => $visibility,
                'status' => 'scheduled',
                'metadata' => $data['metadata'] ?? null,
            ]);

            // Save reminders
            if (!empty($data['reminders']) && is_array($data['reminders'])) {
                $this->saveReminders($event, $user, $data['reminders']);
            }

            // Save uploaded attachments if provided
            if (!empty($data['attachments']) && is_array($data['attachments'])) {
                foreach ($data['attachments'] as $file) {
                    if ($file instanceof UploadedFile) {
                        $this->addAttachment($event, $user, $file);
                    }
                }
            }

            return $event->load(['user', 'department', 'reminders', 'attachments']);
        });
    }

    /**
     * Update existing event
     */
    public function updateEvent(CalendarEvent $event, User $user, array $data): CalendarEvent
    {
        return DB::connection('mysql')->transaction(function () use ($event, $user, $data) {
            $startTime = isset($data['start_time']) ? Carbon::parse($data['start_time']) : $event->start_time;
            $endTime = isset($data['end_time']) ? Carbon::parse($data['end_time']) : $event->end_time;

            if ($endTime->lt($startTime)) {
                $endTime = $startTime->copy()->addHour();
            }

            $event->update([
                'scope' => $data['scope'] ?? $event->scope,
                'title' => trim($data['title'] ?? $event->title),
                'description' => $data['description'] ?? $event->description,
                'location' => $data['location'] ?? $event->location,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'is_all_day' => isset($data['is_all_day']) ? (bool) $data['is_all_day'] : $event->is_all_day,
                'color' => $data['color'] ?? $event->color,
                'category' => $data['category'] ?? $event->category,
                'priority' => $data['priority'] ?? $event->priority,
                'department_id' => $data['department_id'] ?? $event->department_id,
                'visibility' => $data['visibility'] ?? $event->visibility,
                'status' => $data['status'] ?? $event->status,
                'metadata' => $data['metadata'] ?? $event->metadata,
            ]);

            if (isset($data['reminders']) && is_array($data['reminders'])) {
                $event->reminders()->delete();
                $this->saveReminders($event, $user, $data['reminders']);
            }

            return $event->fresh(['user', 'department', 'reminders']);
        });
    }

    /**
     * Delete event
     */
    public function deleteEvent(CalendarEvent $event): bool
    {
        // Delete all physical attachment files
        foreach ($event->attachments as $att) {
            $this->deleteAttachment($att);
        }

        return (bool) $event->delete();
    }

    /**
     * Upload and attach a file to an event
     */
    public function addAttachment(CalendarEvent $event, User $user, UploadedFile $file): CalendarEventAttachment
    {
        $path = $file->store('calendar_attachments', 'public');

        return CalendarEventAttachment::create([
            'event_id' => $event->id,
            'user_id' => $user->id,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'file_size' => $file->getSize(),
            'mime_type' => $file->getClientMimeType(),
        ]);
    }

    /**
     * Delete an attachment
     */
    public function deleteAttachment(CalendarEventAttachment $attachment): bool
    {
        if ($attachment->file_path && Storage::disk('public')->exists($attachment->file_path)) {
            Storage::disk('public')->delete($attachment->file_path);
        }

        return (bool) $attachment->delete();
    }

    /**
     * Import events from iCalendar string (.ics)
     */
    public function importIcs(User $user, string $icsContent): int
    {
        // Split content into VEVENT blocks
        preg_match_all('/BEGIN:VEVENT[\s\S]*?END:VEVENT/i', $icsContent, $matches);
        if (empty($matches[0])) {
            return 0;
        }

        $imported = 0;

        foreach ($matches[0] as $vevent) {
            $summary = $this->parseIcsField($vevent, 'SUMMARY') ?: 'กิจกรรมนำเข้า';
            $description = $this->parseIcsField($vevent, 'DESCRIPTION');
            $location = $this->parseIcsField($vevent, 'LOCATION');
            $uid = $this->parseIcsField($vevent, 'UID') ?: (string) Str::uuid();

            $dtStartRaw = $this->parseIcsField($vevent, 'DTSTART');
            $dtEndRaw = $this->parseIcsField($vevent, 'DTEND');

            if (!$dtStartRaw) {
                continue;
            }

            $isAllDay = strlen($dtStartRaw) === 8 && ctype_digit($dtStartRaw);

            try {
                $start = $isAllDay
                    ? Carbon::createFromFormat('Ymd', $dtStartRaw)->startOfDay()
                    : Carbon::parse($dtStartRaw)->setTimezone('Asia/Bangkok');

                $end = $dtEndRaw
                    ? ($isAllDay ? Carbon::createFromFormat('Ymd', $dtEndRaw)->subDay()->endOfDay() : Carbon::parse($dtEndRaw)->setTimezone('Asia/Bangkok'))
                    : $start->copy()->addHour();
            } catch (\Throwable $e) {
                continue;
            }

            CalendarEvent::updateOrCreate(
                ['ical_uid' => $uid],
                [
                    'user_id' => $user->id,
                    'scope' => 'personal',
                    'title' => $summary,
                    'description' => $description,
                    'location' => $location,
                    'start_time' => $start,
                    'end_time' => $end,
                    'is_all_day' => $isAllDay,
                    'color' => '#0284c7', // Sky
                    'category' => 'external_sync',
                    'priority' => 'normal',
                    'visibility' => 'private',
                    'status' => 'scheduled',
                ]
            );

            $imported++;
        }

        return $imported;
    }

    /**
     * Helper to extract field value from VEVENT string
     */
    private function parseIcsField(string $block, string $field): ?string
    {
        if (preg_match('/' . $field . '(?:;[^:]*)?:(.*?)(\r\n|\n)(?![ \t])/is', $block, $m)) {
            $val = trim($m[1]);
            // Unescape iCalendar text
            $val = str_replace(['\\n', '\\N'], "\n", $val);
            $val = str_replace(['\\,', '\\;'], [',', ';'], $val);
            $val = str_replace('\\\\', '\\', $val);
            return trim($val);
        }
        return null;
    }

    /**
     * Seed tomorrow's events
     */
    public function seedTomorrowEvents(User $user): int
    {
        $tomorrow = Carbon::tomorrow('Asia/Bangkok');
        $dateStr = $tomorrow->format('Y-m-d');

        $eventsData = [
            [
                'scope' => 'hospital',
                'title' => 'ประชุมคณะกรรมการบริหาร รพ. (Executive Board Meeting)',
                'description' => 'การประชุมติดตามผลการดำเนินงานประจำสัปดาห์ และแนวทางการบริหารจัดการทรัพยากร รพ.',
                'location' => 'ห้องประชุม 1 อาคารอำนวยการ',
                'start_time' => "{$dateStr} 09:00:00",
                'end_time' => "{$dateStr} 11:30:00",
                'is_all_day' => false,
                'color' => '#059669', // Emerald
                'category' => 'meeting',
                'priority' => 'urgent',
                'visibility' => 'public',
                'reminders' => [
                    ['reminder_type' => 'before_1d', 'max_repeats' => 1, 'channel' => 'both'],
                    ['reminder_type' => 'before_30m', 'max_repeats' => 1, 'channel' => 'schat'],
                ],
            ],
            [
                'scope' => 'hospital',
                'title' => 'ตรวจประเมินมาตรฐานสิ่งแวดล้อมและความปลอดภัย (ENV Walkround)',
                'description' => 'ทีมคณะกรรมการ ENV และ IC ลงตรวจเยี่ยมพื้นที่อาคารผู้ป่วยในและแผนกสนับสนุน',
                'location' => 'อาคารผู้ป่วยในและหน่วยสนับสนุน',
                'start_time' => "{$dateStr} 13:30:00",
                'end_time' => "{$dateStr} 15:00:00",
                'is_all_day' => false,
                'color' => '#059669', // Emerald
                'category' => 'quality_env',
                'priority' => 'high',
                'visibility' => 'public',
                'reminders' => [
                    ['reminder_type' => 'before_1h', 'max_repeats' => 1, 'channel' => 'both'],
                ],
            ],
            [
                'scope' => 'personal',
                'title' => 'ส่งสรุปรายงานตัวชี้วัดคุณภาพประจำเดือน (Quality KPI Due)',
                'description' => 'จัดทำเอกสารและส่งผลรายงานตัวชี้วัดความเสี่ยงทางคลินิก (Clinical Risk) และสถิติงาน',
                'location' => 'ระบบบริหารจัดการคุณภาพ FSHH',
                'start_time' => "{$dateStr} 16:30:00",
                'end_time' => "{$dateStr} 17:30:00",
                'is_all_day' => false,
                'color' => '#0284c7', // Sky
                'category' => 'deadline',
                'priority' => 'high',
                'visibility' => 'private',
                'reminders' => [
                    ['reminder_type' => 'before_3h', 'max_repeats' => 1, 'channel' => 'schat'],
                ],
            ],
        ];

        $count = 0;
        foreach ($eventsData as $data) {
            $this->createEvent($user, $data);
            $count++;
        }

        return $count;
    }

    /**
     * Helper to save reminders for an event
     */
    private function saveReminders(CalendarEvent $event, User $user, array $reminders): void
    {
        $startTime = $event->start_time;

        foreach ($reminders as $reminder) {
            $type = $reminder['reminder_type'] ?? 'before_1d';
            $offsetMinutes = match ($type) {
                'before_1d' => -1440,
                'before_3h' => -180,
                'before_1h' => -60,
                'before_30m' => -30,
                'before_15m' => -15,
                'on_time' => 0,
                'custom' => (int) ($reminder['offset_minutes'] ?? -60),
                default => -1440,
            };

            $remindAt = isset($reminder['remind_at'])
                ? Carbon::parse($reminder['remind_at'])
                : $startTime->copy()->addMinutes($offsetMinutes);

            CalendarReminder::create([
                'event_id' => $event->id,
                'user_id' => $user->id,
                'remind_at' => $remindAt,
                'reminder_type' => $type,
                'offset_minutes' => $offsetMinutes,
                'max_repeats' => max(1, (int) ($reminder['max_repeats'] ?? 1)),
                'repeat_interval_minutes' => (int) ($reminder['repeat_interval_minutes'] ?? 0),
                'sent_count' => 0,
                'channel' => $reminder['channel'] ?? 'both',
                'status' => 'pending',
            ]);
        }
    }
}
