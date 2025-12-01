<?php

namespace App\Notifications;

use App\Models\VehicleBooking;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class VehicleBookingApprovedNotification extends Notification
{

    protected VehicleBooking $booking;
    protected string $actionType; // approved, rejected, driver_confirmed, driver_declined

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
        
        $driverName = $booking->driver?->name ?? 'ไม่ระบุ';
        $vehicleInfo = $booking->vehicle 
            ? "{$booking->vehicle->license_plate} ({$booking->vehicle->brand} {$booking->vehicle->model})"
            : 'รอจัดรถ';

        $messages = [
            'approved' => [
                'title' => '✅ คำขอใช้รถได้รับการอนุมัติ',
                'message' => "คำขอ {$booking->booking_number} ได้รับการอนุมัติแล้ว\nรถ: {$vehicleInfo}\nคนขับ: {$driverName}",
                'action_text' => 'ดูรายละเอียด',
            ],
            'rejected' => [
                'title' => '❌ คำขอใช้รถไม่ได้รับการอนุมัติ',
                'message' => "คำขอ {$booking->booking_number} ไม่ได้รับการอนุมัติ\nเหตุผล: " . ($booking->rejection_reason ?? '-'),
                'action_text' => 'ดูรายละเอียด',
            ],
            'driver_confirmed' => [
                'title' => '🚗 คนขับยืนยันรับงานแล้ว',
                'message' => "คนขับ {$driverName} ยืนยันรับงานขับรถ {$booking->booking_number}\nรถ: {$vehicleInfo}\nพร้อมให้บริการ!",
                'action_text' => 'ดูรายละเอียด',
            ],
            'driver_declined' => [
                'title' => '⚠️ คนขับปฏิเสธงาน',
                'message' => "คนขับ {$driverName} ปฏิเสธงาน {$booking->booking_number}\nกรุณารอเจ้าหน้าที่มอบหมายคนขับใหม่",
                'action_text' => 'ดูรายละเอียด',
            ],
            'driver_changed' => [
                'title' => '🔄 เปลี่ยนคนขับ',
                'message' => "คนขับสำหรับงาน {$booking->booking_number} ถูกเปลี่ยนเป็น {$driverName}",
                'action_text' => 'ดูรายละเอียด',
            ],
            'approval_revoked' => [
                'title' => '⏪ ยกเลิกการอนุมัติ',
                'message' => "การอนุมัติคำขอ {$booking->booking_number} ถูกยกเลิก กรุณารอการอนุมัติใหม่",
                'action_text' => 'ดูรายละเอียด',
            ],
            'completed' => [
                'title' => '✅ การเดินทางเสร็จสิ้น',
                'message' => "งาน {$booking->booking_number} เสร็จสิ้นแล้ว\nรถ: {$vehicleInfo}\nคนขับ: {$driverName}",
                'action_text' => 'ดูรายละเอียด',
            ],
        ];

        $msg = $messages[$this->actionType] ?? $messages['approved'];

        return [
            'type' => 'vehicle_booking_status',
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
            'approver' => $booking->approver ? [
                'id' => $booking->approver->id,
                'name' => $booking->approver->name,
            ] : null,
        ];
    }
}
