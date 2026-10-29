<?php

namespace App\Services\Calendar;

use App\Models\CalendarEvent;
use App\Models\CalendarReminder;
use App\Models\User;
use App\Notifications\CalendarReminderNotification;
use App\Services\FshhChat\FshhChatSyncService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class CalendarNotificationService
{
    public function __construct(
        protected readonly FshhChatSyncService $chatSync
    ) {}

    /**
     * Process due reminders and send notifications
     */
    public function processDueReminders(): int
    {
        $now = Carbon::now();

        $reminders = CalendarReminder::query()
            ->with(['event.user', 'event.department', 'user'])
            ->where('status', 'pending')
            ->where('remind_at', '<=', $now)
            ->whereColumn('sent_count', '<', 'max_repeats')
            ->limit(50)
            ->get();

        $processed = 0;

        foreach ($reminders as $reminder) {
            $event = $reminder->event;
            if (!$event || $event->status === 'cancelled') {
                $reminder->update(['status' => 'cancelled']);
                continue;
            }

            try {
                $this->dispatchReminder($reminder);

                $newSentCount = $reminder->sent_count + 1;
                $isCompleted = $newSentCount >= $reminder->max_repeats;

                $updateData = [
                    'sent_count' => $newSentCount,
                    'last_sent_at' => $now,
                    'status' => $isCompleted ? 'sent' : 'pending',
                ];

                // If repeats remain and repeat interval > 0, calculate next remind_at
                if (!$isCompleted && $reminder->repeat_interval_minutes > 0) {
                    $updateData['remind_at'] = $now->copy()->addMinutes($reminder->repeat_interval_minutes);
                }

                $reminder->update($updateData);
                $processed++;
            } catch (\Throwable $e) {
                Log::error('Failed to send calendar reminder: ' . $e->getMessage(), [
                    'reminder_id' => $reminder->id,
                    'event_id' => $event->id,
                ]);
            }
        }

        return $processed;
    }

    /**
     * Dispatch reminder through appropriate channels
     */
    public function dispatchReminder(CalendarReminder $reminder): void
    {
        $event = $reminder->event;
        $user = $reminder->user;

        if (!$event || !$user) {
            return;
        }

        // 1. In-app Bell Notification (if channel is 'system' or 'both')
        if (in_array($reminder->channel, ['system', 'both'], true)) {
            try {
                $user->notify(new CalendarReminderNotification($event, $reminder));
            } catch (\Throwable $e) {
                Log::warning('In-app calendar notification failed: ' . $e->getMessage());
            }
        }

        // 2. S-Chat Bot Notification (if channel is 'schat' or 'both')
        if (in_array($reminder->channel, ['schat', 'both'], true)) {
            $this->sendSchatBotNotification($event, $user, $reminder);
        }
    }

    /**
     * Send formatted card to S-Chat
     */
    public function sendSchatBotNotification(CalendarEvent $event, User $targetUser, CalendarReminder $reminder): void
    {
        $scopeBadge = match ($event->scope) {
            'personal' => '👤 ส่วนตัว',
            'hospital' => '🏥 ภาพรวม รพ.',
            'hr' => '👥 งาน HR / กำลังพล',
            default => '📅 ปฏิทิน',
        };

        $priorityLabel = match ($event->priority) {
            'urgent' => '🔴 เร่งด่วนมาก',
            'high' => '🟠 สำคัญ',
            'low' => '🟢 ปกติ',
            default => '🔵 ทั่วไป',
        };

        $thaiYear = $event->start_time->year + 543;
        $timeStr = $event->is_all_day
            ? $event->start_time->format('d/m/') . $thaiYear . ' (ตลอดทั้งวัน)'
            : $event->start_time->format('d/m/') . $thaiYear . ' เวลา ' . $event->start_time->format('H:i') . ' - ' . $event->end_time->format('H:i') . ' น.';

        $title = "⏰ แจ้งเตือน: " . $event->title;
        $attemptInfo = $reminder->max_repeats > 1
            ? " (เตือนครั้งที่ " . ($reminder->sent_count + 1) . "/{$reminder->max_repeats})"
            : "";

        $fields = [
            'ขอบเขต' => $scopeBadge,
            'วันและเวลา' => $timeStr,
            'สถานที่' => $event->location ?: 'โรงพยาบาลค่ายสุรสิงหนาท',
            'ระดับความสำคัญ' => $priorityLabel . $attemptInfo,
        ];

        if ($event->description) {
            $fields['รายละเอียด'] = mb_strimwidth($event->description, 0, 100, '...');
        }

        $fields['ลิงก์ปฏิทิน'] = url('/calendar');

        $color = $event->color ?: match ($event->scope) {
            'personal' => '#0284C7',
            'hospital' => '#059669',
            'hr' => '#E11D48',
            default => '#64748B',
        };

        // Notify user directly in S-Chat
        $lines = [];
        foreach ($fields as $label => $value) {
            $lines[] = "• {$label}: {$value}";
        }

        $message = "📅 แจ้งเตือนกำหนดการงานโรงพยาบาล\n" . implode("\n", $lines);

        $this->chatSync->notifyUser($targetUser, [
            'title' => $title,
            'message' => $message,
            'fields' => $fields,
            'color' => $color,
            'priority' => $event->priority === 'urgent' ? 'เร่งด่วน' : '',
        ]);

        // If it is an HR department event, optionally notify the HR department chat as well
        if ($event->scope === 'hr' && $reminder->sent_count === 0) {
            $hrDept = $this->chatSync->adminDepartment();
            if ($hrDept && $hrDept->id !== $targetUser->department_id) {
                $this->chatSync->notifyCard($hrDept, $title, $fields, $color, $event->priority === 'urgent' ? 'เร่งด่วน' : '');
            }
        }
    }
}
