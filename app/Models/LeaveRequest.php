<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LeaveRequest extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'request_number',
        'user_id',
        'leave_type_id',
        'start_date',
        'end_date',
        'total_days',
        'reason',
        'contact_address',
        'contact_phone',
        'delegate_name',
        'written_at',
        'addressee',
        'destination',
        'return_date',
        'status',
        'attachment_path',
        'admin_note',
        'submitted_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'return_date' => 'date',
            'total_days' => 'decimal:1',
            'submitted_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public const STATUS_LABELS = [
        'draft' => 'แบบร่าง',
        'pending_supervisor' => 'รอหัวหน้าอนุมัติ',
        'pending_hr' => 'รอฝ่ายธุรการตรวจสอบ',
        'pending_director' => 'รอผู้อำนวยการลงนาม',
        'approved' => 'อนุมัติ',
        'rejected' => 'ไม่อนุมัติ',
        'cancelled' => 'ยกเลิก',
    ];

    public const STATUS_COLORS = [
        'draft' => 'gray',
        'pending_supervisor' => 'amber',
        'pending_hr' => 'blue',
        'pending_director' => 'purple',
        'approved' => 'green',
        'rejected' => 'red',
        'cancelled' => 'slate',
    ];

    public static function generateRequestNumber(): string
    {
        $year = now()->year + 543;
        $prefix = "LV{$year}";
        $last = static::query()
            ->where('request_number', 'like', "{$prefix}%")
            ->orderByDesc('request_number')
            ->value('request_number');

        $seq = $last ? ((int) substr($last, -4)) + 1 : 1;

        return $prefix . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function leaveType()
    {
        return $this->belongsTo(LeaveType::class);
    }

    public function approvals()
    {
        return $this->hasMany(LeaveApproval::class)->orderBy('step');
    }

    public function currentApproval()
    {
        return $this->hasOne(LeaveApproval::class)->where('action', 'pending')->orderBy('step');
    }

    public function getStatusLabelAttribute(): string
    {
        return self::STATUS_LABELS[$this->status] ?? $this->status;
    }

    public function getStatusColorAttribute(): string
    {
        return self::STATUS_COLORS[$this->status] ?? 'gray';
    }

    public function canBeCancelledBy(User $user): bool
    {
        return $this->user_id === $user->id
            && in_array($this->status, ['draft', 'pending_supervisor']);
    }
}
