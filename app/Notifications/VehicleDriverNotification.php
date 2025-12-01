<?php

namespace App\Notifications;

use App\Models\VehicleBooking;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class VehicleDriverNotification extends Notification
{

    protected VehicleBooking $booking;
    protected string $actionType; // assigned, confirmed, declined

    /**
     * Create a new notification instance.
     */
    public function __construct(VehicleBooking $booking, string $actionType)
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
        $booking = $this->booking->load(['user', 'vehicle', 'driver', 'approver']);
        
        $messages = [
            'assigned' => [
                'title' => 'คุณได้รับมอบหมายงานขับรถ',
                'message' => "งานขับรถ {$booking->booking_number} - {$booking->purpose} ไป {$booking->destination}",
                'action_text' => 'กดยืนยันรับงาน',
            ],
            'confirmed' => [
                'title' => 'คนขับรถยืนยันรับงานแล้ว',
                'message' => "คนขับ {$booking->driver?->name} ยืนยันรับงาน {$booking->booking_number}",
                'action_text' => 'ดูรายละเอียด',
            ],
            'declined' => [
                'title' => 'คนขับรถปฏิเสธงาน',
                'message' => "คนขับ {$booking->driver?->name} ปฏิเสธงาน {$booking->booking_number}",
                'action_text' => 'มอบหมายคนขับใหม่',
            ],
        ];

        $msg = $messages[$this->actionType] ?? $messages['assigned'];

        return [
            'type' => 'vehicle_driver',
            'action_type' => $this->actionType,
            'title' => $msg['title'],
            'message' => $msg['message'],
            'action_text' => $msg['action_text'],
            'action_url' => "/vehicles/bookings/{$booking->id}",
            'booking_id' => $booking->id,
            'booking_number' => $booking->booking_number,
            'ticket_number' => $booking->booking_number,
            'category' => 'ระบบจองรถ',
            'purpose' => $booking->purpose,
            'destination' => $booking->destination,
            'start_datetime' => $booking->start_datetime?->format('Y-m-d H:i'),
            'end_datetime' => $booking->end_datetime?->format('Y-m-d H:i'),
            'vehicle' => $booking->vehicle ? [
                'id' => $booking->vehicle->id,
                'license_plate' => $booking->vehicle->license_plate,
                'brand' => $booking->vehicle->brand,
                'model' => $booking->vehicle->model,
            ] : null,
            'driver' => $booking->driver ? [
                'id' => $booking->driver->id,
                'name' => $booking->driver->name,
            ] : null,
            'user' => [
                'id' => $booking->user->id,
                'name' => $booking->user->name,
            ],
            'approver' => $booking->approver ? [
                'id' => $booking->approver->id,
                'name' => $booking->approver->name,
            ] : null,
        ];
    }
}
