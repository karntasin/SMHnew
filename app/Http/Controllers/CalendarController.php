<?php

namespace App\Http\Controllers;

use App\Models\CalendarEvent;
use App\Models\Department;
use App\Models\User;
use App\Services\Calendar\CalendarService;
use App\Services\Calendar\GoogleCalendarService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class CalendarController extends Controller
{
    public function __construct(
        protected readonly CalendarService $calendarService,
        protected readonly GoogleCalendarService $googleCalendarService
    ) {}

    /**
     * Render the main Calendar page
     */
    public function index(Request $request): InertiaResponse
    {
        /** @var User $user */
        $user = Auth::user();

        $departments = Department::select('id', 'name')->orderBy('name')->get();
        $isHrOrAdmin = $user->hasRole(['Super Admin', 'Admin', 'HR', 'ผู้ดูแลระบบ'])
            || in_array($user->department_id, [1, 2]);

        $canViewHospital = $user->hasAnyRole(['admin', 'Admin', 'superUser', 'superuser', 'Super Admin', 'header', 'Header'])
            || (method_exists($user, 'departmentLeaders') && $user->departmentLeaders()->exists());

        // Generate a deterministic user token for iCal feed subscription
        $feedToken = hash_hmac('sha256', (string) $user->id, config('app.key'));
        $feedUrl = url("/calendar/feed/{$user->id}/{$feedToken}.ics");

        return Inertia::render('Calendar/Index', [
            'auth_user' => [
                'id' => $user->id,
                'name' => $user->name,
                'is_admin_or_hr' => $isHrOrAdmin,
                'can_view_hospital' => $canViewHospital,
                'department_id' => $user->department_id,
            ],
            'departments' => $departments,
            'feed_url' => $feedUrl,
        ]);
    }

    /**
     * JSON events feed for FullCalendar and day view
     */
    public function events(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = Auth::user();

        $start = $request->query('start');
        $end = $request->query('end');
        $scope = $request->query('scope');
        $search = $request->query('search');

        $events = $this->calendarService->getEvents($user, $start, $end, $scope, $search);

        $formatted = $events->map(function (CalendarEvent $event) use ($user) {
            $canEdit = $event->user_id === $user->id || $user->hasRole(['Super Admin', 'Admin']);

            return [
                'id' => (string) $event->id,
                'title' => $event->title,
                'start' => $event->is_all_day ? $event->start_time->format('Y-m-d') : $event->start_time->toIso8601String(),
                'end' => $event->is_all_day ? $event->end_time->copy()->addDay()->format('Y-m-d') : $event->end_time->toIso8601String(),
                'allDay' => $event->is_all_day,
                'backgroundColor' => $event->color,
                'borderColor' => $event->color,
                'textColor' => '#ffffff',
                'extendedProps' => [
                    'id' => $event->id,
                    'scope' => $event->scope,
                    'scope_label' => $event->scope_label,
                    'description' => $event->description,
                    'location' => $event->location,
                    'priority' => $event->priority,
                    'category' => $event->category,
                    'status' => $event->status,
                    'visibility' => $event->visibility,
                    'department' => $event->department ? ['id' => $event->department->id, 'name' => $event->department->name] : null,
                    'user' => ['id' => $event->user?->id, 'name' => $event->user?->name],
                    'can_edit' => $canEdit,
                    'google_calendar_url' => $event->google_calendar_url,
                    'reminders' => $event->reminders->map(fn ($r) => [
                        'id' => $r->id,
                        'reminder_type' => $r->reminder_type,
                        'offset_minutes' => $r->offset_minutes,
                        'remind_at' => $r->remind_at?->toIso8601String(),
                        'max_repeats' => $r->max_repeats,
                        'sent_count' => $r->sent_count,
                        'channel' => $r->channel,
                        'status' => $r->status,
                    ]),
                    'attachments' => $event->attachments->map(fn ($att) => [
                        'id' => $att->id,
                        'file_name' => $att->file_name,
                        'file_size' => $att->formatted_size,
                        'mime_type' => $att->mime_type,
                        'url' => $att->url,
                    ]),
                ],
            ];
        });

        return response()->json($formatted);
    }

    /**
     * Store new event
     */
    public function store(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = Auth::user();

        $validated = $request->validate([
            'scope' => 'required|in:personal,hospital,hr',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after_or_equal:start_time',
            'is_all_day' => 'boolean',
            'color' => 'nullable|string|max:32',
            'category' => 'nullable|string|max:64',
            'priority' => 'nullable|in:low,normal,high,urgent',
            'department_id' => 'nullable|exists:departments,id',
            'visibility' => 'nullable|in:private,department,public',
            'reminders' => 'nullable|array',
            'reminders.*.reminder_type' => 'nullable|string',
            'reminders.*.offset_minutes' => 'nullable|integer',
            'reminders.*.max_repeats' => 'nullable|integer|min:1|max:10',
            'reminders.*.repeat_interval_minutes' => 'nullable|integer|min:0',
            'reminders.*.channel' => 'nullable|in:schat,system,both',
        ]);

        // Authorization check for hospital and hr scopes
        if ($validated['scope'] === 'hospital' || $validated['scope'] === 'hr') {
            $isHrOrAdmin = $user->hasRole(['Super Admin', 'Admin', 'HR', 'ผู้ดูแลระบบ'])
                || in_array($user->department_id, [1, 2]);

            if (!$isHrOrAdmin) {
                return response()->json(['error' => 'ไม่มีสิทธิ์สร้างกิจกรรมสำหรับส่วนรวม รพ. หรือ HR'], 403);
            }
        }

        $event = $this->calendarService->createEvent($user, $validated);

        // Upload any attached files
        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                if ($file->isValid()) {
                    $this->calendarService->addAttachment($event, $user, $file);
                }
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'บันทึกกิจกรรมเรียบร้อยแล้ว',
            'event' => $event->fresh(['user', 'department', 'reminders', 'attachments']),
        ]);
    }

    /**
     * Update event
     */
    public function update(Request $request, CalendarEvent $event): JsonResponse
    {
        /** @var User $user */
        $user = Auth::user();

        $canEdit = $event->user_id === $user->id || $user->hasRole(['Super Admin', 'Admin']);
        if (!$canEdit) {
            return response()->json(['error' => 'ไม่มีสิทธิ์แก้ไขกิจกรรมนี้'], 403);
        }

        $validated = $request->validate([
            'scope' => 'sometimes|in:personal,hospital,hr',
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'start_time' => 'sometimes|date',
            'end_time' => 'sometimes|date|after_or_equal:start_time',
            'is_all_day' => 'boolean',
            'color' => 'nullable|string|max:32',
            'category' => 'nullable|string|max:64',
            'priority' => 'nullable|in:low,normal,high,urgent',
            'department_id' => 'nullable|exists:departments,id',
            'visibility' => 'nullable|in:private,department,public',
            'status' => 'nullable|in:scheduled,in_progress,completed,cancelled',
            'reminders' => 'nullable|array',
        ]);

        $updated = $this->calendarService->updateEvent($event, $user, $validated);

        return response()->json([
            'success' => true,
            'message' => 'อัปเดตกิจกรรมเรียบร้อยแล้ว',
            'event' => $updated,
        ]);
    }

    /**
     * Delete event
     */
    public function destroy(CalendarEvent $event): JsonResponse
    {
        /** @var User $user */
        $user = Auth::user();

        $canDelete = $event->user_id === $user->id || $user->hasRole(['Super Admin', 'Admin']);
        if (!$canDelete) {
            return response()->json(['error' => 'ไม่มีสิทธิ์ลบกิจกรรมนี้'], 403);
        }

        $this->calendarService->deleteEvent($event);

        return response()->json([
            'success' => true,
            'message' => 'ลบกิจกรรมเรียบร้อยแล้ว',
        ]);
    }

    /**
     * Upload an attachment to an existing event
     */
    public function uploadAttachment(Request $request, CalendarEvent $event): JsonResponse
    {
        /** @var User $user */
        $user = Auth::user();

        $canEdit = $event->user_id === $user->id || $user->hasRole(['Super Admin', 'Admin']);
        if (!$canEdit) {
            return response()->json(['error' => 'ไม่มีสิทธิ์อัปโหลดไฟล์ในกิจกรรมนี้'], 403);
        }

        $request->validate([
            'file' => 'required|file|max:20480', // max 20MB
        ]);

        $attachment = $this->calendarService->addAttachment($event, $user, $request->file('file'));

        return response()->json([
            'success' => true,
            'message' => 'อัปโหลดไฟล์แนบเรียบร้อยแล้ว',
            'attachment' => [
                'id' => $attachment->id,
                'file_name' => $attachment->file_name,
                'file_size' => $attachment->formatted_size,
                'mime_type' => $attachment->mime_type,
                'url' => $attachment->url,
            ],
        ]);
    }

    /**
     * Delete an attachment
     */
    public function deleteAttachment(Request $request, \App\Models\CalendarEventAttachment $attachment): JsonResponse
    {
        /** @var User $user */
        $user = Auth::user();

        $event = $attachment->event;
        $canDelete = $attachment->user_id === $user->id
            || ($event && $event->user_id === $user->id)
            || $user->hasRole(['Super Admin', 'Admin']);

        if (!$canDelete) {
            return response()->json(['error' => 'ไม่มีสิทธิ์ลบไฟล์แนบนี้'], 403);
        }

        $this->calendarService->deleteAttachment($attachment);

        return response()->json([
            'success' => true,
            'message' => 'ลบไฟล์แนบเรียบร้อยแล้ว',
        ]);
    }

    /**
     * Import events from iCalendar (.ics file or URL)
     */
    public function importIcs(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = Auth::user();

        $content = '';

        if ($request->hasFile('ics_file')) {
            $request->validate([
                'ics_file' => 'required|file|max:10240', // max 10MB
            ]);
            $content = file_get_contents($request->file('ics_file')->getRealPath());
        } elseif ($request->filled('ics_url')) {
            $url = $request->input('ics_url');
            // convert webcal:// to https://
            if (str_starts_with($url, 'webcal://')) {
                $url = 'https://' . substr($url, 9);
            }
            try {
                $response = \Illuminate\Support\Facades\Http::timeout(15)->get($url);
                if ($response->successful()) {
                    $content = $response->body();
                } else {
                    return response()->json(['error' => 'ไม่สามารถดึงข้อมูลจาก URL ปฏิทินที่ระบุได้'], 422);
                }
            } catch (\Throwable $e) {
                return response()->json(['error' => 'เกิดข้อผิดพลาดในการเชื่อมต่อ URL ปฏิทิน: ' . $e->getMessage()], 422);
            }
        } else {
            return response()->json(['error' => 'กรุณาอัปโหลดไฟล์ .ics หรือระบุ URL ปฏิทิน'], 422);
        }

        $imported = $this->calendarService->importIcs($user, $content);

        return response()->json([
            'success' => true,
            'message' => "นำเข้ากิจกรรมเรียบร้อยแล้ว {$imported} รายการ",
            'imported_count' => $imported,
        ]);
    }

    /**
     * Export single event as .ics
     */
    public function exportEventIcs(CalendarEvent $event): Response
    {
        $icsContent = $this->googleCalendarService->generateIcs(collect([$event]), $event->title);

        $filename = 'event_' . $event->id . '.ics';

        return response($icsContent)
            ->header('Content-Type', 'text/calendar; charset=utf-8')
            ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
    }

    /**
     * Public iCal Subscription Feed (WebCal sync for Google Calendar)
     */
    public function feed(int $userId, string $token): Response
    {
        $expected = hash_hmac('sha256', (string) $userId, config('app.key'));
        if (!hash_equals($expected, $token)) {
            abort(403, 'Invalid calendar token');
        }

        $user = User::findOrFail($userId);

        // Fetch events from 1 month ago to 6 months in the future
        $start = Carbon::now()->subMonth()->toDateString();
        $end = Carbon::now()->addMonths(6)->toDateString();

        $events = $this->calendarService->getEvents($user, $start, $end);
        $icsContent = $this->googleCalendarService->generateIcs($events, "FSHH Calendar - {$user->name}");

        return response($icsContent)
            ->header('Content-Type', 'text/calendar; charset=utf-8')
            ->header('Content-Disposition', 'inline; filename="fshh_calendar.ics"');
    }
}
