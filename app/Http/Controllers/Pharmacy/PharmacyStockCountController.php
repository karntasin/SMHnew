<?php

namespace App\Http\Controllers\Pharmacy;

use App\Http\Controllers\Controller;
use App\Models\Pharmacy\PharmacyLot;
use App\Models\Pharmacy\PharmacyStockBalance;
use App\Models\Pharmacy\PharmacyStockCount;
use App\Models\Pharmacy\PharmacyStockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PharmacyStockCountController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'location_id' => 'required|exists:pharmacy_locations,id', 'count_date' => 'required|date',
            'notes' => 'nullable|string|max:2000', 'members' => 'required|array|min:1',
            'members.*.user_id' => 'nullable|exists:users,id', 'members.*.name' => 'required|string|max:255',
            'members.*.role' => 'nullable|string|max:100', 'photos' => 'nullable|array|max:10',
            'photos.*' => 'image|max:5120',
        ]);
        $count = DB::transaction(function () use ($request, $data) {
            $count = PharmacyStockCount::query()->create([
                'count_no' => 'PC-'.now()->format('Ymd-His-u'), 'location_id' => $data['location_id'],
                'count_date' => $data['count_date'], 'status' => 'counting',
                'notes' => $data['notes'] ?? null, 'created_by' => Auth::id(),
            ]);
            $count->members()->createMany($data['members']);
            foreach (PharmacyLot::query()->where('location_id', $data['location_id'])
                ->where('qty_remaining', '>', 0)->whereIn('status', ['active', 'quarantined'])->get() as $lot) {
                $count->items()->create(['item_id' => $lot->item_id, 'lot_id' => $lot->id, 'system_qty' => $lot->qty_remaining]);
            }
            $this->storePhotos($request, $count);

            return $count;
        });

        return redirect()->route('pharmacy.inventory.counts.show', $count)->with('success', 'เปิดรอบตรวจนับแล้ว');
    }

    public function show(PharmacyStockCount $count): Response
    {
        $count->load(['location', 'members.user', 'items.item', 'items.lot', 'photos']);
        $count->photos->each->append('url');

        return Inertia::render('Pharmacy/Inventory/CountShow', [
            'count' => $count,
        ]);
    }

    public function complete(Request $request, PharmacyStockCount $count)
    {
        abort_unless(in_array($count->status, ['draft', 'counting'], true), 422, 'รอบตรวจนับนี้ปิดแล้ว');
        $data = $request->validate([
            'items' => 'required|array|min:1', 'items.*.id' => 'required|integer',
            'items.*.counted_qty' => 'required|numeric|min:0', 'items.*.note' => 'nullable|string|max:1000',
            'photos' => 'nullable|array|max:10', 'photos.*' => 'image|max:5120',
        ]);
        DB::transaction(function () use ($request, $count, $data) {
            foreach ($data['items'] as $input) {
                $line = $count->items()->whereKey($input['id'])->lockForUpdate()->firstOrFail();
                $counted = round((float) $input['counted_qty'], 2);
                $variance = round($counted - (float) $line->system_qty, 2);
                $line->update(['counted_qty' => $counted, 'variance_qty' => $variance, 'note' => $input['note'] ?? null]);
                $lot = $line->lot()->lockForUpdate()->first();
                if ($lot) {
                    $lot->update(['qty_remaining' => $counted, 'status' => $counted > 0 ? 'active' : 'depleted']);
                }
                if (abs($variance) > 0.0001) {
                    PharmacyStockMovement::query()->create([
                        'type' => 'adjust', 'item_id' => $line->item_id, 'lot_id' => $line->lot_id,
                        'from_location_id' => $variance < 0 ? $count->location_id : null,
                        'to_location_id' => $variance > 0 ? $count->location_id : null,
                        'qty' => abs($variance), 'reference_type' => 'stock_count',
                        'reference_id' => (string) $count->id, 'user_id' => Auth::id(),
                        'note' => 'ปรับยอดจากการตรวจนับ '.$count->count_no,
                    ]);
                }
            }
            foreach ($count->items()->pluck('item_id')->unique() as $itemId) {
                $total = PharmacyLot::query()->where('location_id', $count->location_id)
                    ->where('item_id', $itemId)->where('qty_remaining', '>', 0)->sum('qty_remaining');
                PharmacyStockBalance::query()->updateOrCreate(
                    ['location_id' => $count->location_id, 'item_id' => $itemId], ['qty_on_hand' => $total]
                );
            }
            $this->storePhotos($request, $count);
            $count->update(['status' => 'completed', 'completed_by' => Auth::id(), 'completed_at' => now()]);
        });

        return back()->with('success', 'ปิดรอบตรวจนับและปรับยอดสต็อกแล้ว');
    }

    private function storePhotos(Request $request, PharmacyStockCount $count): void
    {
        foreach ($request->file('photos', []) as $photo) {
            $count->photos()->create([
                'path' => $photo->store('pharmacy/stock-counts/'.$count->id, 'public'),
                'original_name' => $photo->getClientOriginalName(), 'mime_type' => $photo->getMimeType(),
                'size' => $photo->getSize(), 'uploaded_by' => Auth::id(),
            ]);
        }
    }
}
