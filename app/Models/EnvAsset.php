<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class EnvAsset extends Model
{
    public const REGISTRY_STATUSES = [
        'normal' => 'ปกติ',
        'repair' => 'ส่งซ่อม',
        'pending_disposal' => 'รอจำหน่าย',
        'disposed' => 'จำหน่าย',
    ];

    /** ระดับความเสี่ยง */
    public const RISK_LEVELS = [
        'A' => 'A สูง',
        'B' => 'B กลาง',
        'C' => 'C ต่ำ',
        'N' => 'ไม่ระบุ',
    ];

    /** การสอบเทียบ */
    public const INSPECTION_STATUSES = [
        'inspect' => 'สอบเทียบ',
        'not_inspect' => 'ไม่สอบเทียบ',
    ];

    /** แท็บ/สถานะเก่าจากไฟล์ต้นทาง → สถานะหลัก 4 ค่า */
    public const LEGACY_REGISTRY_MAP = [
        'written_off' => 'disposed',
        'telephone' => 'normal',
        'proposed' => 'normal',
        'ตัดยอด' => 'disposed',
        'โทรศัพท์' => 'normal',
        'เสนอ 70' => 'normal',
        'เสนอ' => 'normal',
    ];

    /** ฟิลด์บังคับเมื่อเปลี่ยนสถานภาพบัญชีคุม */
    public const STATUS_CHANGE_REQUIREMENTS = [
        'normal' => ['event_date'],
        'repair' => ['event_date', 'repair_slip_no', 'repair_job_no'],
        'pending_disposal' => ['event_date', 'inspection_doc', 'disposal_doc'],
        'disposed' => ['event_date', 'disposal_doc'],
    ];

    protected $fillable = [
        'line_id',
        'registry_status',
        'sheet_name',
        'item_type',
        'name',
        'model',
        'serial_number',
        'price',
        'location',
        'owner',
        'risk_level',
        'inspection_status',
        'status',
        'purchase_date',
        'warranty_expiry',
        'stock_number',
        'condition_code',
        'brand',
        'company',
        'fiscal_year',
        'budget_type',
        'control_number',
        'reference_doc',
        'delivery_date',
        'fan_coil',
        'condensing_unit',
        'issue_location',
        'status_note',
        'image_ref',
        'image_path',
        'inspection_doc',
        'repair_slip_no',
        'repair_job_no',
        'sent_at',
        'status_changed_at',
        'status_change_note',
        'disposal_doc',
        'writeoff_doc',
        'scrap_return_doc',
        'source_file',
        'source_row',
        'import_key',
        'raw_attributes',
    ];

    protected $casts = [
        'purchase_date' => 'date',
        'warranty_expiry' => 'date',
        'sent_at' => 'date',
        'status_changed_at' => 'date',
        'price' => 'float',
        'raw_attributes' => 'array',
    ];

    public function line(): BelongsTo
    {
        return $this->belongsTo(EnvAssetLine::class, 'line_id');
    }

    public function schedule(): HasOne
    {
        return $this->hasOne(EnvPmSchedule::class, 'asset_id');
    }

    public function records(): HasMany
    {
        return $this->hasMany(EnvPmRecord::class, 'asset_id');
    }

    public function statusLogs(): HasMany
    {
        return $this->hasMany(EnvAssetStatusLog::class, 'asset_id')->latest('id');
    }

    public function inspectionItems(): HasMany
    {
        return $this->hasMany(EnvAssetInspectionItem::class, 'asset_id');
    }

    public function getRegistryStatusLabelAttribute(): string
    {
        $key = self::normalizeRegistryStatus((string) $this->registry_status);

        return self::REGISTRY_STATUSES[$key] ?? $this->registry_status;
    }

    public static function normalizeRegistryStatus(string $registryStatus): string
    {
        if (isset(self::REGISTRY_STATUSES[$registryStatus])) {
            return $registryStatus;
        }

        return self::LEGACY_REGISTRY_MAP[$registryStatus] ?? 'normal';
    }

    public static function operationalStatusForRegistry(string $registryStatus): string
    {
        return match (self::normalizeRegistryStatus($registryStatus)) {
            'normal' => 'ปกติ',
            'repair' => 'ส่งซ่อม',
            'pending_disposal' => 'รอจำหน่าย',
            'disposed' => 'จำหน่าย',
            default => 'ปกติ',
        };
    }
}
