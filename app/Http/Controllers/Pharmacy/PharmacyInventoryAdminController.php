<?php

namespace App\Http\Controllers\Pharmacy;

use App\Http\Controllers\Controller;
use App\Models\Pharmacy\PharmacyItem;
use App\Models\Pharmacy\PharmacyItemBarcode;
use App\Models\Pharmacy\PharmacyItemUnit;
use App\Models\Pharmacy\PharmacyLocation;
use App\Models\Pharmacy\PharmacyPackagingType;
use App\Models\Pharmacy\PharmacySetting;
use App\Models\Pharmacy\PharmacyStockCount;
use App\Models\User;
use App\Services\Pharmacy\PharmacyInventoryService;
use App\Services\Pharmacy\PharmacyStockExcelService;
use App\Services\Pharmacy\PharmacyUnitService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PharmacyInventoryAdminController extends Controller
{
    public function settings(): Response
    {
        $this->ensureDefaultSettings();

        $locations = PharmacyLocation::query()
            ->withCount('balances')
            ->orderBy('sort_order')
            ->get();

        return Inertia::render('Pharmacy/Inventory/Settings', [
            'locations' => $locations,
            'settings' => PharmacySetting::query()->orderBy('group')->orderBy('id')->get(),
            'packagingTypes' => PharmacyPackagingType::query()->orderBy('sort_order')->orderBy('name')->get(),
        ]);
    }

    public function downloadStockTemplate(Request $request, PharmacyStockExcelService $excelService): StreamedResponse
    {
        $locationId = $request->integer('location_id') ?: null;
        $scope = $request->input('scope', 'all');

        return $excelService->exportTemplate($locationId, $scope);
    }

    public function previewStockImport(Request $request, PharmacyStockExcelService $excelService)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls|max:20480',
            'fallback_location_id' => 'nullable|integer|exists:pharmacy_locations,id',
        ]);

        try {
            $result = $excelService->previewImport(
                $request->file('file'),
                $request->integer('fallback_location_id') ?: null
            );

            return response()->json($result);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function commitStockImport(Request $request, PharmacyStockExcelService $excelService)
    {
        $data = $request->validate([
            'token' => 'required|string',
            'mode' => 'required|in:replace,add',
        ]);

        try {
            $result = $excelService->commitImport(
                $data['token'],
                $data['mode'],
                auth()->id()
            );

            $msg = "นำเข้าสต็อกเรียบร้อยแล้ว {$result['imported_count']} รายการ (ยอดรวม {$result['total_qty']} หน่วย)";

            if ($request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => $msg,
                    'data' => $result,
                ]);
            }

            return back()->with('success', $msg);
        } catch (\Throwable $e) {
            if ($request->wantsJson()) {
                return response()->json(['message' => $e->getMessage()], 422);
            }

            return back()->with('error', 'เกิดข้อผิดพลาดในการนำเข้าสต็อก: ' . $e->getMessage());
        }
    }

    public function storePackagingType(Request $request)
    {
        $data = $request->validate([
            'code' => 'required|string|max:40|unique:pharmacy_packaging_types,code|alpha_dash',
            'name' => 'required|string|max:100',
            'sort_order' => 'nullable|integer|min:0',
        ]);
        PharmacyPackagingType::query()->create($data + ['is_active' => true, 'sort_order' => $data['sort_order'] ?? 200]);

        return back()->with('success', 'เพิ่มประเภทบรรจุภัณฑ์แล้ว');
    }

    public function updatePackagingType(Request $request, PharmacyPackagingType $type)
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'code' => ['required', 'string', 'max:40', Rule::unique('pharmacy_packaging_types')->ignore($type->id)],
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'required|boolean',
        ]);
        $type->update($data);

        return back()->with('success', 'แก้ไขประเภทบรรจุภัณฑ์แล้ว');
    }

    public function destroyPackagingType(PharmacyPackagingType $type)
    {
        $type->delete();

        return back()->with('success', 'ลบประเภทบรรจุภัณฑ์แล้ว');
    }

    public function storeLocation(Request $request)
    {
        $data = $request->validate([
            'code' => 'required|string|max:40|unique:pharmacy_locations,code',
            'name' => 'required|string|max:255',
            'type' => 'required|in:warehouse,pharmacy',
            'sort_order' => 'nullable|integer|min:0',
            'notes' => 'nullable|string|max:2000',
        ]);
        PharmacyLocation::query()->create($data + ['is_active' => true]);

        return back()->with('success', 'เพิ่มสถานที่จัดเก็บแล้ว');
    }

    public function updateLocation(Request $request, PharmacyLocation $location)
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:40', Rule::unique('pharmacy_locations')->ignore($location->id)],
            'name' => 'required|string|max:255',
            'type' => 'required|in:warehouse,pharmacy',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'required|boolean',
            'notes' => 'nullable|string|max:2000',
        ]);
        $location->update($data);

        return back()->with('success', 'แก้ไขสถานที่จัดเก็บแล้ว');
    }

    public function destroyLocation(PharmacyLocation $location)
    {
        $location->delete();

        return back()->with('success', 'ลบสถานที่จัดเก็บแล้ว');
    }

    public function upsertSetting(Request $request)
    {
        $data = $request->validate([
            'key' => 'required|string|max:255', 'value' => 'nullable|string|max:5000',
            'type' => 'required|in:string,integer,decimal,boolean,json',
            'label' => 'required|string|max:255', 'group' => 'required|string|max:50',
            'description' => 'nullable|string|max:1000',
        ]);
        PharmacySetting::query()->updateOrCreate(['key' => $data['key']], $data);

        return back()->with('success', 'บันทึกค่าระบบแล้ว');
    }

    public function saveBatchSettings(Request $request)
    {
        $settingsData = $request->input('settings', []);
        foreach ($settingsData as $key => $val) {
            $valStr = is_bool($val) ? ($val ? '1' : '0') : (is_null($val) ? '' : (string) $val);
            PharmacySetting::query()->where('key', $key)->update(['value' => $valStr]);
        }

        return back()->with('success', 'บันทึกการตั้งค่าระบบเรียบร้อยแล้ว');
    }

    private function ensureDefaultSettings(): void
    {
        $defaults = [
            // alerts & thresholds
            ['key' => 'expiry_alert_critical_days', 'value' => '30', 'type' => 'integer', 'label' => 'เตือนยาใกล้หมดอายุ (วิกฤต/สีแดง)', 'group' => 'alerts', 'description' => 'จำนวนวันก่อนหมดอายุที่ต้องขึ้นเตือนระดับวิกฤต (วัน)'],
            ['key' => 'expiry_alert_warning_days', 'value' => '90', 'type' => 'integer', 'label' => 'เตือนยาใกล้หมดอายุ (เฝ้าระวัง/สีส้ม)', 'group' => 'alerts', 'description' => 'จำนวนวันก่อนหมดอายุที่ต้องเฝ้าระวัง (วัน)'],
            ['key' => 'expiry_alert_notice_days', 'value' => '180', 'type' => 'integer', 'label' => 'เตือนยาใกล้หมดอายุ (วางแผน/สีเหลือง)', 'group' => 'alerts', 'description' => 'จำนวนวันก่อนหมดอายุที่ต้องวางแผนหมุนเวียนยา (วัน)'],
            ['key' => 'dos_critical_days', 'value' => '7', 'type' => 'integer', 'label' => 'เกณฑ์สต็อกวิกฤต (วันคงเหลือ < วันที่กำหนด)', 'group' => 'alerts', 'description' => 'เกณฑ์ Days of Supply ที่ถือว่าวิกฤตเสี่ยงยาขาด (วัน)'],
            ['key' => 'dos_reorder_days', 'value' => '15', 'type' => 'integer', 'label' => 'เกณฑ์จุดสั่งซื้อ (วันคงเหลือ < วันที่กำหนด)', 'group' => 'alerts', 'description' => 'เกณฑ์ Days of Supply ที่ต้องเริ่มทำใบสั่งซื้อเติมคลัง (วัน)'],
            ['key' => 'dos_overstock_days', 'value' => '180', 'type' => 'integer', 'label' => 'เกณฑ์สต็อกเกิน (วันคงเหลือ > วันที่กำหนด)', 'group' => 'alerts', 'description' => 'เกณฑ์ Days of Supply ที่ถือว่าสต็อกค้างเกินไป (วัน)'],
            ['key' => 'dead_stock_days', 'value' => '90', 'type' => 'integer', 'label' => 'ระยะประเมินยาไม่เคลื่อนไหว (Dead Stock)', 'group' => 'alerts', 'description' => 'จำนวนวันย้อนหลังที่ไม่มีการจ่ายยาเลย แต่ยังมียอดคงเหลือ (วัน)'],
            ['key' => 'telegram_stock_alerts_enabled', 'value' => '0', 'type' => 'boolean', 'label' => 'เปิดแจ้งเตือนสต็อกผ่าน Telegram', 'group' => 'alerts', 'description' => 'ส่งสรุปสต็อกเหลือน้อยและยาใกล้หมดอายุไปยัง Telegram'],
            ['key' => 'telegram_bot_token', 'value' => '', 'type' => 'string', 'label' => 'Telegram Bot Token', 'group' => 'alerts', 'description' => 'Token ของ Telegram Bot สำหรับส่งการแจ้งเตือน'],
            ['key' => 'telegram_chat_id', 'value' => '', 'type' => 'string', 'label' => 'Telegram Chat ID / Group ID', 'group' => 'alerts', 'description' => 'ID กลุ่มหรือแชท Telegram ที่รับข้อความเตือน'],
            
            // ha standards
            ['key' => 'had_default_warning', 'value' => 'High Alert Drug: ยาความเสี่ยงสูง ต้องตรวจสอบซ้ำ (Double Check)', 'type' => 'string', 'label' => 'ข้อความเตือนมาตรฐานยา HAD', 'group' => 'ha', 'description' => 'ข้อความเตือนที่แสดงบนหน้าจอและบัตรคุมยา'],
            ['key' => 'had_double_check_required', 'value' => '1', 'type' => 'boolean', 'label' => 'บังคับยืนยันตรวจสอบซ้ำสำหรับยา HAD', 'group' => 'ha', 'description' => 'ต้องมีการระบุผู้ตรวจสอบซ้ำเมื่อรับเข้าหรือจ่ายยา HAD'],
            ['key' => 'cold_chain_default_temp', 'value' => '2-8°C', 'type' => 'string', 'label' => 'อุณหภูมิตู้เย็นยาแช่เย็นมาตรฐาน', 'group' => 'ha', 'description' => 'ช่วงอุณหภูมิควบคุมสำหรับยา Cold Chain ทั่วไป'],
            ['key' => 'cold_chain_freezer_temp', 'value' => '-20°C', 'type' => 'string', 'label' => 'อุณหภูมิตู้แช่แข็งยามาตรฐาน', 'group' => 'ha', 'description' => 'ช่วงอุณหภูมิควบคุมสำหรับยาที่ต้องแช่แข็ง'],
            ['key' => 'narcotic_shift_count_required', 'value' => '1', 'type' => 'boolean', 'label' => 'บังคับตรวจนับยาเสพติดทุกสิ้นกะ', 'group' => 'ha', 'description' => 'แจ้งเตือนให้ตรวจนับยอดคงเหลือยาเสพติดและวัตถุออกฤทธิ์ทุกผลัด'],

            // hosxp dispense
            ['key' => 'default_dispense_location_id', 'value' => '2', 'type' => 'integer', 'label' => 'ห้องยาหลักที่ใช้ตัดสต็อกจ่ายยา', 'group' => 'hosxp', 'description' => 'สถานที่ตั้งต้นที่ระบบจะตัดสต็อกตามใบสั่งยา HOSxP (ID สถานที่)'],
            ['key' => 'auto_dispense_sync_enabled', 'value' => '1', 'type' => 'boolean', 'label' => 'เปิดระบบซิงก์ตัดจ่ายอัตโนมัติ (Cron Job)', 'group' => 'hosxp', 'description' => 'ทำงานตาม Schedule ทุก 5 นาทีในระบบ'],
            ['key' => 'dispense_scope_opd', 'value' => '1', 'type' => 'boolean', 'label' => 'ตัดจ่ายผู้ป่วยนอก (OPD)', 'group' => 'hosxp', 'description' => 'ดึงใบสั่งยา OPD มาตัดสต็อก'],
            ['key' => 'dispense_scope_ipd', 'value' => '1', 'type' => 'boolean', 'label' => 'ตัดจ่ายผู้ป่วยใน (IPD)', 'group' => 'hosxp', 'description' => 'ดึงใบสั่งยา IPD มาตัดสต็อก'],
            ['key' => 'dispense_insufficient_policy', 'value' => 'queue', 'type' => 'string', 'label' => 'นโยบายเมื่อสต็อกไม่พอตัด', 'group' => 'hosxp', 'description' => 'queue = เข้าคิวรอ Retry, block = บล็อก, negative = ยอมให้สต็อกติดลบ'],
            ['key' => 'hosxp_query_limit', 'value' => '3000', 'type' => 'integer', 'label' => 'จำนวนดึงใบสั่งยาสูงสุดต่อรอบ', 'group' => 'hosxp', 'description' => 'จำกัดจำนวนใบสั่งยาที่อ่านจาก opitemrece ในแต่ละรอบ'],

            // labels
            ['key' => 'hospital_label_header', 'value' => 'โรงพยาบาลค่ายสุรสิงหนาท', 'type' => 'string', 'label' => 'ข้อความหัวฉลากยา / สติ๊กเกอร์', 'group' => 'labels', 'description' => 'ชื่อโรงพยาบาลหรือหน่วยงานที่พิมพ์บนหัวสติ๊กเกอร์'],
            ['key' => 'default_label_format', 'value' => 'thermal', 'type' => 'string', 'label' => 'รูปแบบสติ๊กเกอร์เริ่มต้น', 'group' => 'labels', 'description' => 'thermal = ม้วนความร้อน 50x30mm, a4 = สติ๊กเกอร์แผ่น A4'],
            ['key' => 'show_had_on_label', 'value' => '1', 'type' => 'boolean', 'label' => 'แสดงป้ายเตือน HAD บนสติ๊กเกอร์', 'group' => 'labels', 'description' => 'พิมพ์ป้าย HAD บนฉลากยาความเสี่ยงสูง'],
            ['key' => 'show_cold_chain_on_label', 'value' => '1', 'type' => 'boolean', 'label' => 'แสดงอุณหภูมิแช่เย็นบนสติ๊กเกอร์', 'group' => 'labels', 'description' => 'พิมพ์ช่วงอุณหภูมิควบคุมบนฉลากยาแช่เย็น'],
            ['key' => 'barcode_qr_prefix', 'value' => 'PHARMLOT:', 'type' => 'string', 'label' => 'คำนำหน้า QR Token ประจำ Lot', 'group' => 'labels', 'description' => 'Prefix สำหรับสร้าง QR Payload'],
        ];

        foreach ($defaults as $d) {
            PharmacySetting::query()->firstOrCreate(['key' => $d['key']], $d);
        }
    }


    public function items(Request $request): Response
    {
        $q = trim((string) $request->query('q', ''));
        $itemType = trim((string) $request->query('item_type', 'all'));

        $query = PharmacyItem::query()
            ->with(['units.parentUnit', 'units.packagingType', 'units.barcodes'])
            ->orderBy('name');

        if ($itemType === 'drug') {
            $query->where(fn ($b) => $b->where('item_type', 'drug')->orWhereNull('item_type'));
        } elseif ($itemType === 'nondrug') {
            $query->where('item_type', 'nondrug');
        }

        if ($q !== '') {
            $query->where(fn ($b) => $b->where('icode', 'like', "%{$q}%")
                ->orWhere('name', 'like', "%{$q}%")
                ->orWhere('barcode', $q)
                ->orWhereHas('units', fn ($unit) => $unit->where('barcode', $q))
                ->orWhereHas('barcodes', fn ($barcode) => $barcode->where('barcode', $q)));
        }

        $stats = [
            'total' => PharmacyItem::count(),
            'drugs' => PharmacyItem::where(fn ($b) => $b->where('item_type', 'drug')->orWhereNull('item_type'))->count(),
            'nondrugs' => PharmacyItem::where('item_type', 'nondrug')->count(),
        ];

        return Inertia::render('Pharmacy/Inventory/Items', [
            'items' => $query->paginate(100)->withQueryString(),
            'packagingTypes' => PharmacyPackagingType::query()->where('is_active', true)->orderBy('sort_order')->get(),
            'filters' => ['q' => $q, 'item_type' => $itemType],
            'stats' => $stats,
        ]);
    }

    public function importItems(Request $request, PharmacyInventoryService $inventory)
    {
        $type = $request->input('type', 'drug');
        $limit = $request->integer('limit');

        if ($type === 'nondrug') {
            $result = $inventory->importHosxpNondrugItems($limit);
            $msg = "นำเข้าเวชภัณฑ์มิใช่ยา {$result['imported']} · อัปเดต {$result['updated']} รายการ";
        } elseif ($type === 'all') {
            $r1 = $inventory->importHosxpDrugItems($limit);
            $r2 = $inventory->importHosxpNondrugItems($limit);
            $msg = "นำเข้ายา {$r1['imported']} (อัปเดต {$r1['updated']}) · เวชภัณฑ์ {$r2['imported']} (อัปเดต {$r2['updated']}) รวมทั้งสิ้น " . ($r1['total'] + $r2['total']) . " รายการ";
        } else {
            $result = $inventory->importHosxpDrugItems($limit);
            $msg = "นำเข้ายา {$result['imported']} · อัปเดต {$result['updated']} รายการ";
        }

        return back()->with('success', $msg);
    }

    public function updateItem(Request $request, PharmacyItem $item)
    {
        $data = $request->validate([
            'base_unit' => 'required|string|max:50', 'dispense_unit' => 'nullable|string|max:50',
            'barcode' => ['nullable', 'string', 'max:100', Rule::unique('pharmacy_items')->ignore($item->id)],
            'is_active' => 'required|boolean',
        ]);
        $item->update($data);

        return back()->with('success', 'บันทึกข้อมูลยาแล้ว');
    }

    public function storeUnit(Request $request, PharmacyItem $item, PharmacyUnitService $units)
    {
        $data = $this->validateUnit($request, $item->id);
        DB::transaction(function () use ($item, $data, $units) {
            $this->clearUnitDefaults($item->id, $data);
            $units->save($item, $data + ['is_active' => true]);
        });

        return back()->with('success', 'เพิ่มหน่วยบรรจุแล้ว');
    }

    public function updateUnit(Request $request, PharmacyItemUnit $unit, PharmacyUnitService $units)
    {
        $data = $this->validateUnit($request, $unit->item_id, $unit->id);
        DB::transaction(function () use ($unit, $data, $units) {
            $this->clearUnitDefaults($unit->item_id, $data, $unit->id);
            $units->save($unit->item, $data, $unit);
        });

        return back()->with('success', 'แก้ไขหน่วยบรรจุแล้ว');
    }

    public function storeBarcode(Request $request, PharmacyItem $item)
    {
        $data = $request->validate([
            'unit_id' => ['required', Rule::exists('pharmacy_item_units', 'id')->where('item_id', $item->id)],
            'barcode' => 'required|string|max:150|unique:pharmacy_item_barcodes,barcode',
            'symbology' => 'nullable|string|max:30',
            'label' => 'nullable|string|max:255',
            'is_primary' => 'nullable|boolean',
        ]);
        DB::transaction(function () use ($item, $data) {
            if ($data['is_primary'] ?? false) {
                PharmacyItemBarcode::query()->where('unit_id', $data['unit_id'])->update(['is_primary' => false]);
            }
            $data['symbology'] = $data['symbology'] ?: 'AUTO';
            $item->barcodes()->create($data + ['is_active' => true]);
        });

        return back()->with('success', 'เพิ่มบาร์โค้ดบรรจุภัณฑ์แล้ว');
    }

    public function destroyBarcode(PharmacyItemBarcode $barcode)
    {
        $barcode->delete();

        return back()->with('success', 'ลบบาร์โค้ดแล้ว');
    }

    public function counts(): Response
    {
        return Inertia::render('Pharmacy/Inventory/Counts', [
            'counts' => PharmacyStockCount::query()->with(['location', 'creator'])
                ->withCount(['items', 'members', 'photos'])->latest()->limit(100)->get(),
            'locations' => PharmacyLocation::query()->where('is_active', true)->orderBy('sort_order')->get(),
            'users' => User::query()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    private function validateUnit(Request $request, int $itemId, ?int $ignoreId = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:50', Rule::unique('pharmacy_item_units')->where('item_id', $itemId)->ignore($ignoreId)],
            'parent_unit_id' => ['nullable', Rule::exists('pharmacy_item_units', 'id')->where('item_id', $itemId)],
            'packaging_type_id' => 'nullable|exists:pharmacy_packaging_types,id',
            'contains_qty' => 'nullable|numeric|min:0.0001',
            'barcode' => ['nullable', 'string', 'max:100', Rule::unique('pharmacy_item_units')->ignore($ignoreId)],
            'usage_context' => 'required|in:receive,transfer,dispense,all',
            'description' => 'nullable|string|max:255',
            'is_active' => 'nullable|boolean', 'is_default_receive' => 'nullable|boolean',
            'is_default_transfer' => 'nullable|boolean', 'is_default_dispense' => 'nullable|boolean',
        ]);
    }

    private function clearUnitDefaults(int $itemId, array $data, ?int $except = null): void
    {
        foreach (['receive', 'transfer', 'dispense'] as $context) {
            if ($data['is_default_'.$context] ?? false) {
                PharmacyItemUnit::query()->where('item_id', $itemId)
                    ->when($except, fn ($q) => $q->whereKeyNot($except))
                    ->update(['is_default_'.$context => false]);
            }
        }
    }
}
