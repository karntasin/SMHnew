<?php

namespace App\Notifications;

use App\Models\RoomBooking;
use Illuminate\Notifications\Notification;

class RoomBookingNotification extends Notification
{
    protected RoomBooking $booking;
    protected string $actionType; // new_booking, approved, rejected, cancelled

    /**
     * Create a new notification instance.
     */
    public function __construct(RoomBooking $booking, string $actionType)
    {
        $this->booking = $booking;
        $this->actionType = $actionType;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $booking = $this->booking->load(['room', 'user']);
        
        $roomName = $booking->room?->name ?? 'ไม่ระบุ';
        $userName = $booking->user?->name ?? 'ไม่ระบุ';
        $startTime = $booking->start_time?->format('d/m/Y H:i');
        $endTime = $booking->end_time?->format('H:i');

        $messages = [
            'new_booking' => [
                'title' => '📅 มีคำขอจองห้องประชุมใหม่',
                'message' => "{$userName} ขอจองห้อง {$roomName}\nหัวข้อ: {$booking->title}\nวันที่: {$startTime} - {$endTime}",
                'action_text' => 'ตรวจสอบและอนุมัติ',
            ],
            'booking_created' => [
                'title' => '✅ ส่งคำขอจองห้องประชุมสำเร็จ',
                'message' => "คำขอจองห้อง {$roomName} ถูกส่งเรียบร้อยแล้ว\nหัวข้อ: {$booking->title}\nวันที่: {$startTime} - {$endTime}\nกรุณารอการอนุมัติ",
                'action_text' => 'ดูรายละเอียด',
            ],
            'approved' => [
                'title' => '✅ คำขอจองห้องประชุมได้รับการอนุมัติ',
                'message' => "คำขอจองห้อง {$roomName} ได้รับการอนุมัติแล้ว\nหัวข้อ: {$booking->title}\nวันที่: {$startTime} - {$endTime}",
                'action_text' => 'ดูรายละเอียด',
            ],
            'rejected' => [
                'title' => '❌ คำขอจองห้องประชุมไม่ได้รับการอนุมัติ',
                'message' => "คำขอจองห้อง {$roomName} ไม่ได้รับการอนุมัติ\nหัวข้อ: {$booking->title}\nวันที่: {$startTime} - {$endTime}",
                'action_text' => 'ดูรายละเอียด',
            ],
            'cancelled' => [
                'title' => '🚫 การจองห้องประชุมถูกยกเลิก',
                'message' => "การจองห้อง {$roomName} ถูกยกเลิก\nหัวข้อ: {$booking->title}\nวันที่: {$startTime} - {$endTime}",
                'action_text' => 'ดูรายละเอียด',
            ],
        ];

        $msg = $messages[$this->actionType] ?? $messages['new_booking'];

        return [
            'type' => 'room_booking',
            'action_type' => $this->actionType,
            'title' => $msg['title'],
            'message' => $msg['message'],
            'action_text' => $msg['action_text'],
            'action_url' => "/administration/rooms/bookings/{$booking->id}",
            'booking_id' => $booking->id,
            'category' => 'ระบบจองห้องประชุม',
            'room' => $booking->room ? [
                'id' => $booking->room->id,
                'name' => $booking->room->name,
            ] : null,
            'booker' => $booking->user ? [
                'id' => $booking->user->id,
                'name' => $booking->user->name,
            ] : null,
            'title' => $msg['title'],
            'booking_title' => $booking->title,
            'start_time' => $booking->start_time?->format('Y-m-d H:i'),
            'end_time' => $booking->end_time?->format('Y-m-d H:i'),
        ];
    }
}
