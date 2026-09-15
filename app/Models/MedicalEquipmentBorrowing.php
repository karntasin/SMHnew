<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class MedicalEquipmentBorrowing extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'borrowing_number',
        'user_id',
        'department_id',
        'equipment_id',
        'quantity',
        'purpose',
        'usage_detail',
        'patient_hn',
        'ward_location',
        'borrow_date',
        'borrow_time',
        'expected_return_date',
        'expected_return_time',
        'pickup_at',
        'actual_return_date',
        'status',
        'approved_by',
        'approved_at',
        'rejection_reason',
        'issued_by',
        'returned_to',
        'condition_on_borrow',
        'condition_on_return',
        'notes',
        'reminder_sent',
        'overdue_notified',
    ];

    protected $casts = [
        'borrow_date' => 'date',
        'expected_return_date' => 'date',
        'pickup_at' => 'datetime',
        'actual_return_date' => 'datetime',
        'approved_at' => 'datetime',
        'reminder_sent' => 'boolean',
        'overdue_notified' => 'boolean',
    ];

    protected $appends = [
        'borrow_scheduled_at',
        'expected_return_scheduled_at',
    ];

    public function getBorrowScheduledAtAttribute(): ?string
    {
        return $this->combineDateAndTime($this->borrow_date, $this->borrow_time)?->toIso8601String();
    }

    public function getExpectedReturnScheduledAtAttribute(): ?string
    {
        return $this->combineDateAndTime($this->expected_return_date, $this->expected_return_time)?->toIso8601String();
    }

    public function borrowScheduledCarbon(): ?Carbon
    {
        return $this->combineDateAndTime($this->borrow_date, $this->borrow_time);
    }

    public function expectedReturnScheduledCarbon(): ?Carbon
    {
        return $this->combineDateAndTime($this->expected_return_date, $this->expected_return_time);
    }

    public function formattedBorrowSchedule(): string
    {
        return $this->formatSchedule($this->borrow_date, $this->borrow_time);
    }

    public function formattedExpectedReturnSchedule(): string
    {
        return $this->formatSchedule($this->expected_return_date, $this->expected_return_time);
    }

    private function combineDateAndTime($date, ?string $time): ?Carbon
    {
        if (! $date) {
            return null;
        }

        $timePart = $time ? substr((string) $time, 0, 8) : '08:00:00';

        return Carbon::parse($date->format('Y-m-d').' '.$timePart, 'Asia/Bangkok');
    }

    private function formatSchedule($date, ?string $time): string
    {
        $dt = $this->combineDateAndTime($date, $time);

        return $dt ? $dt->format('d/m/Y H:i') : '-';
    }

    public function borrower()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function equipment()
    {
        return $this->belongsTo(MedicalEquipment::class, 'equipment_id');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function issuer()
    {
        return $this->belongsTo(User::class, 'issued_by');
    }

    public function returnReceiver()
    {
        return $this->belongsTo(User::class, 'returned_to');
    }

    public function logs()
    {
        return $this->hasMany(MedicalEquipmentBorrowingLog::class, 'borrowing_id')->latest();
    }
}
