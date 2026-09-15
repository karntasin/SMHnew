<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Inertia\Inertia;

class NotificationController extends Controller
{
    /**
     * แสดงหน้ารายการแจ้งเตือนทั้งหมด (Inertia page)
     */
    public function page(Request $request)
    {
        $user = Auth::user();
        
        // Get unread notifications
        $unreadNotifications = $user->unreadNotifications()
            ->latest()
            ->take(50)
            ->get()
            ->map(function ($notification) {
                return [
                    'id' => $notification->id,
                    'data' => $notification->data,
                    'created_at' => $notification->created_at->diffForHumans(),
                    'created_at_raw' => $notification->created_at->toISOString(),
                    'read_at' => null,
                ];
            });

        // Get read notifications (last 50)
        $readNotifications = $user->readNotifications()
            ->latest()
            ->take(50)
            ->get()
            ->map(function ($notification) {
                return [
                    'id' => $notification->id,
                    'data' => $notification->data,
                    'created_at' => $notification->created_at->diffForHumans(),
                    'created_at_raw' => $notification->created_at->toISOString(),
                    'read_at' => $notification->read_at->diffForHumans(),
                ];
            });

        return Inertia::render('notifications/Index', [
            'unreadNotifications' => $unreadNotifications,
            'readNotifications' => $readNotifications,
            'unreadCount' => $user->unreadNotifications()->count(),
            'readCount' => $user->readNotifications()->count(),
        ]);
    }

    /**
     * API: ดึง notifications สำหรับ dropdown (unread + recent read)
     */
    public function index(Request $request)
    {
        try {
            $user = Auth::user();
            if (! $user) {
                return response()->json([
                    'unread_notifications' => [],
                    'read_notifications' => [],
                    'unread_count' => 0,
                    'total_count' => 0,
                ], 401);
            }

            // Get unread notifications
            $unreadNotifications = $user->unreadNotifications()
                ->latest()
                ->take(10)
                ->get()
                ->map(fn ($notification) => $this->serializeNotification($notification, false));

            // Get recent read notifications (last 10)
            $readNotifications = $user->readNotifications()
                ->latest()
                ->take(10)
                ->get()
                ->map(fn ($notification) => $this->serializeNotification($notification, true));

            return response()->json([
                'unread_notifications' => $unreadNotifications,
                'read_notifications' => $readNotifications,
                'unread_count' => $user->unreadNotifications()->count(),
                'total_count' => $user->notifications()->count(),
            ]);
        } catch (\Exception $e) {
            Log::error('Notification API Error: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return response()->json([
                'unread_notifications' => [],
                'read_notifications' => [],
                'unread_count' => 0,
                'total_count' => 0,
            ]);
        }
    }

    /**
     * ดึง notifications ที่ยังไม่ได้อ่านเกิน 1 ชั่วโมง (urgent)
     */
    public function urgent(Request $request)
    {
        try {
            $user = Auth::user();
            
            if (!$user) {
                return response()->json(['urgent_notifications' => [], 'urgent_count' => 0]);
            }

            $oneHourAgo = Carbon::now()->subHour();
            
            // Get unread notifications older than 1 hour
            // Filter in PHP to avoid database JSON compatibility issues
            $urgentNotifications = $user->unreadNotifications()
                ->where('created_at', '<=', $oneHourAgo)
                ->get()
                ->filter(function ($notification) {
                    // Check if data has type = maintenance OR document reminders
                    if (!is_array($notification->data) || !isset($notification->data['type'])) {
                        return false;
                    }
                    
                    // Include maintenance and document urgent notifications
                    if ($notification->data['type'] === 'maintenance') {
                        return true;
                    }
                    
                    // Include document reminders (3+ hours overdue)
                    if ($notification->data['type'] === 'document') {
                        $actionType = $notification->data['action_type'] ?? '';
                        return in_array($actionType, ['reminder_sender', 'reminder_receiver']);
                    }
                    
                    return false;
                })
                ->values() // Reset keys
                ->map(function ($notification) {
                    $createdAt = Carbon::parse($notification->created_at);
                    $minutesAgo = $createdAt->diffInMinutes(now());
                    $hoursAgo = floor($minutesAgo / 60);
                    $mins = $minutesAgo % 60;
                    
                    return [
                        'id' => $notification->id,
                        'data' => $notification->data,
                        'created_at' => $notification->created_at->diffForHumans(),
                        'created_at_raw' => $notification->created_at->toISOString(),
                        'time_overdue' => $hoursAgo > 0 
                            ? "{$hoursAgo} ชั่วโมง {$mins} นาที" 
                            : "{$mins} นาที",
                        'minutes_overdue' => $minutesAgo - 60, // นาทีที่เกินจาก 1 ชม.
                    ];
                });

            // Also check for NEW document reminders that are high priority (show immediately)
            $documentReminders = $user->unreadNotifications()
                ->get()
                ->filter(function ($notification) {
                    if (!is_array($notification->data)) return false;
                    $actionType = $notification->data['action_type'] ?? '';
                    return in_array($actionType, ['reminder_sender', 'reminder_receiver']);
                })
                ->map(function ($notification) {
                    return [
                        'id' => $notification->id,
                        'data' => $notification->data,
                        'created_at' => $notification->created_at->diffForHumans(),
                        'created_at_raw' => $notification->created_at->toISOString(),
                        'time_overdue' => 'รอรับทราบเกิน 3 ชั่วโมง',
                        'minutes_overdue' => 180,
                    ];
                });
            
            // Merge both collections using collect() to ensure proper collection type
            $allUrgent = collect($documentReminders)->merge(collect($urgentNotifications))
                ->unique('id')
                ->values();

            return response()->json([
                'urgent_notifications' => $allUrgent,
                'urgent_count' => $allUrgent->count(),
            ]);
        } catch (\Exception $e) {
            Log::error('Urgent Notification Error: ' . $e->getMessage());
            return response()->json(['urgent_notifications' => [], 'urgent_count' => 0]);
        }
    }

    private function serializeNotification($notification, bool $isRead): array
    {
        $data = $notification->data;
        if (is_string($data)) {
            $decoded = json_decode($data, true);
            $data = is_array($decoded) ? $decoded : [];
        } elseif (! is_array($data)) {
            $data = [];
        }

        $createdAt = $notification->created_at;
        $readAt = $notification->read_at;

        return [
            'id' => $notification->id,
            'data' => $data,
            'created_at' => $createdAt?->diffForHumans() ?? '',
            'created_at_raw' => $createdAt?->toIso8601String(),
            'read_at' => $isRead ? ($readAt?->diffForHumans()) : null,
            'is_read' => $isRead,
        ];
    }

    public function markAsRead(Request $request, $id)
    {
        $user = Auth::user();
        $notification = $user->notifications()->where('id', $id)->first();

        if ($notification) {
            $notification->markAsRead();
        }

        return response()->json(['success' => true]);
    }

    public function markAllAsRead(Request $request)
    {
        $user = Auth::user();
        $user->unreadNotifications->markAsRead();

        return response()->json(['success' => true]);
    }
}
