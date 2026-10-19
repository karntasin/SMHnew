<?php

namespace App\Http\Controllers\Pharmacy;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Pharmacy\Concerns\ResolvesPharmacyCatalog;
use App\Models\Pharmacy\PharmacyItem;
use App\Models\Pharmacy\PharmacyItemBarcode;
use App\Models\Pharmacy\PharmacyItemUnit;
use App\Models\Pharmacy\PharmacyLocation;
use App\Models\Pharmacy\PharmacyLot;
use App\Services\Pharmacy\PharmacyInventoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class PharmacyBarcodeController extends Controller
{
    use ResolvesPharmacyCatalog;

    public function index(): Response
    {
        return Inertia::render('Pharmacy/Inventory/Scanner', [
            'locations' => $this->catalogLocations()->get(),
        ]);
    }

    public function resolve(Request $request, PharmacyInventoryService $inventory)
    {
        $code = trim((string) $request->query('code', ''));
        abort_if($code === '', 422, 'กรุณาระบุบาร์โค้ด');

        $catalog = $this->catalog();
        $lotToken = str_starts_with($code, 'PHARMLOT:') ? substr($code, 9) : $code;
        $lot = PharmacyLot::query()->with(['item.units', 'location', 'receivedUnit'])
            ->where('qr_token', $lotToken)->first();
        if ($lot && $lot->item && ($lot->item->isNondrug() ? 'nondrug' : 'drug') === $catalog) {
            return response()->json(['data' => $this->payload($lot->item, $lot->receivedUnit, $code, $lot)]);
        }

        $barcode = PharmacyItemBarcode::query()->with(['item.units', 'unit.parentUnit', 'unit.packagingType'])
            ->where('barcode', $code)->where('is_active', true)->first();
        if ($barcode && $this->itemMatchesCatalog($barcode->item, $catalog)) {
            return response()->json(['data' => $this->payload($barcode->item, $barcode->unit, $code)]);
        }

        $unit = PharmacyItemUnit::query()->with(['item.units', 'parentUnit', 'packagingType'])
            ->where('barcode', $code)->where('is_active', true)->first();
        if ($unit && $this->itemMatchesCatalog($unit->item, $catalog)) {
            return response()->json(['data' => $this->payload($unit->item, $unit, $code)]);
        }

        $item = PharmacyItem::query()->with('units')->ofCatalog($catalog)
            ->where(function ($query) use ($code) {
                $query->where('barcode', $code)->orWhere('icode', $code);
            })
            ->first();

        if (! $item) {
            try {
                if ($catalog === 'drug') {
                    $hosxpRow = DB::connection('hosxp')->table('drugitems')
                        ->where(function ($q) use ($code) {
                            $q->where('icode', $code)->orWhere('barcode', $code);
                        })
                        ->first(['icode', 'barcode']);
                    if ($hosxpRow && ! empty($hosxpRow->icode)) {
                        $item = $inventory->resolveItemFromHosxp((string) $hosxpRow->icode, $catalog);
                        if ($item && empty($item->barcode) && $code !== (string) $hosxpRow->icode) {
                            $item->update(['barcode' => $code]);
                        }
                        $item->load('units');
                    }
                } else {
                    $nondrugRow = $inventory->constrainHosxpSupplyNondrug(
                        DB::connection('hosxp')->table('nondrugitems')->where('icode', $code)
                    )->first(['icode']);
                    if ($nondrugRow && ! empty($nondrugRow->icode)) {
                        $item = $inventory->resolveItemFromHosxp((string) $nondrugRow->icode, $catalog);
                        $item->load('units');
                    } else {
                        $drugRow = DB::connection('hosxp')->table('drugitems')
                            ->where(function ($q) use ($code) {
                                $q->where('icode', $code)->orWhere('barcode', $code);
                            })
                            ->first(['icode', 'name', 'income', 'barcode']);
                        $isSupply = $drugRow && (
                            $inventory->nameStartsWithSupplyMark($drugRow->name ?? null)
                            || $inventory->isSupplyIncome($drugRow->income ?? null)
                        );
                        if ($isSupply && ! empty($drugRow->icode)) {
                            $item = $inventory->resolveItemFromHosxp((string) $drugRow->icode, $catalog);
                            if ($item && empty($item->barcode) && $code !== (string) $drugRow->icode && filled($drugRow->barcode ?? null)) {
                                $item->update(['barcode' => $code]);
                            }
                            $item?->load('units');
                        }
                    }
                }
            } catch (Throwable) {
                $item = null;
            }
        }

        abort_unless($item && $this->itemMatchesCatalog($item, $catalog), 404, 'ไม่พบบาร์โค้ดนี้ในคลังนี้หรือ HOSxP');

        return response()->json(['data' => $this->payload($item, null, $code)]);
    }

    private function itemMatchesCatalog(?PharmacyItem $item, string $catalog): bool
    {
        if (! $item) {
            return false;
        }

        return ($item->isNondrug() ? 'nondrug' : 'drug') === $catalog;
    }

    private function payload(PharmacyItem $item, ?PharmacyItemUnit $unit, string $code, ?PharmacyLot $lot = null): array
    {
        $unit ??= $item->units->firstWhere('is_default_receive', true)
            ?? $item->units->firstWhere('factor_to_base', '1.0000')
            ?? $item->units->first();

        return [
            'code' => $code,
            'item' => [
                'id' => $item->id, 'icode' => $item->icode, 'name' => $item->name,
                'item_type' => $item->item_type ?? 'drug',
                'item_type_label' => $item->itemTypeLabel(),
                'strength' => $item->strength, 'base_unit' => $item->baseUnitName(),
            ],
            'unit' => $unit ? [
                'id' => $unit->id, 'name' => $unit->name,
                'contains_qty' => (float) $unit->contains_qty,
                'factor_to_base' => (float) $unit->factor_to_base,
                'hierarchy_label' => $unit->loadMissing('parentUnit')->hierarchyLabel(),
                'packaging_type' => $unit->packagingType?->name,
            ] : null,
            'lot' => $lot ? [
                'id' => $lot->id, 'lot_no' => $lot->lot_no,
                'location' => $lot->location?->name,
                'location_id' => $lot->location_id,
                'qty_remaining' => (float) $lot->qty_remaining,
                'expires_at' => $lot->expires_at?->toDateString(),
            ] : null,
        ];
    }
}
