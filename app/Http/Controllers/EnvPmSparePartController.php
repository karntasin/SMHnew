<?php

namespace App\Http\Controllers;

use App\Models\EnvPmWorkOrderPart;
use App\Models\EnvSparePart;
use App\Models\EnvSparePartMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class EnvPmSparePartController extends Controller
{
    public function index()
    {
        $parts = EnvSparePart::query()->orderBy('name')->get()->map(function (EnvSparePart $part) {
            return [
                'id' => $part->id,
                'code' => $part->code,
                'name' => $part->name,
                'unit' => $part->unit,
                'min_stock' => $part->min_stock,
                'on_hand' => $part->on_hand,
                'unit_cost' => $part->unit_cost,
                'location' => $part->location,
                'is_active' => $part->is_active,
                'below_min' => $part->isBelowMinimum(),
            ];
        });

        return Inertia::render('Env/PM/Parts', [
            'parts' => $parts,
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validatePart($request);
        EnvSparePart::create($data + ['on_hand' => $data['on_hand'] ?? 0]);

        return back()->with('success', 'บันทึกอะไหล่แล้ว');
    }

    public function update(Request $request, EnvSparePart $part)
    {
        $data = $this->validatePart($request, $part);
        $part->update([
            'code' => $data['code'],
            'name' => $data['name'],
            'unit' => $data['unit'],
            'min_stock' => $data['min_stock'],
            'unit_cost' => $data['unit_cost'],
            'location' => $data['location'] ?? null,
            'is_active' => (bool) ($data['is_active'] ?? true),
        ]);

        return back()->with('success', 'อัปเดตอะไหล่แล้ว');
    }

    public function receive(Request $request, EnvSparePart $part)
    {
        $data = $request->validate([
            'qty' => 'required|numeric|min:0.001',
            'note' => 'nullable|string|max:500',
        ]);

        DB::transaction(function () use ($part, $data) {
            $locked = EnvSparePart::query()->lockForUpdate()->findOrFail($part->id);
            $locked->on_hand = round((float) $locked->on_hand + (float) $data['qty'], 3);
            $locked->save();
            EnvSparePartMovement::create([
                'spare_part_id' => $locked->id,
                'type' => 'in',
                'qty' => $data['qty'],
                'balance_after' => $locked->on_hand,
                'note' => $data['note'] ?? 'รับเข้า',
                'user_id' => Auth::id(),
            ]);
        });

        return back()->with('success', 'รับอะไหล่เข้าคลังแล้ว');
    }

    public function adjust(Request $request, EnvSparePart $part)
    {
        $data = $request->validate([
            'on_hand' => 'required|numeric|min:0',
            'note' => 'nullable|string|max:500',
        ]);

        DB::transaction(function () use ($part, $data) {
            $locked = EnvSparePart::query()->lockForUpdate()->findOrFail($part->id);
            $delta = round((float) $data['on_hand'] - (float) $locked->on_hand, 3);
            $locked->on_hand = $data['on_hand'];
            $locked->save();
            EnvSparePartMovement::create([
                'spare_part_id' => $locked->id,
                'type' => 'adjust',
                'qty' => $delta,
                'balance_after' => $locked->on_hand,
                'note' => $data['note'] ?? 'ปรับยอด',
                'user_id' => Auth::id(),
            ]);
        });

        return back()->with('success', 'ปรับยอดอะไหล่แล้ว');
    }

    public function destroy(EnvSparePart $part)
    {
        if ($part->movements()->exists() || EnvPmWorkOrderPart::query()->where('spare_part_id', $part->id)->exists()) {
            return back()->with('error', 'อะไหล่นี้มีการเคลื่อนไหวสต็อกแล้ว ปิดการใช้งานแทนการลบ');
        }

        $part->delete();

        return back()->with('success', 'ลบอะไหล่แล้ว');
    }

    /**
     * @return array<string, mixed>
     */
    private function validatePart(Request $request, ?EnvSparePart $part = null): array
    {
        $data = $request->validate([
            'code' => 'required|string|max:64|unique:env_spare_parts,code'.($part ? ','.$part->id : ''),
            'name' => 'required|string|max:255',
            'unit' => 'required|string|max:40',
            'min_stock' => 'required|numeric|min:0',
            'on_hand' => 'nullable|numeric|min:0',
            'unit_cost' => 'required|numeric|min:0',
            'location' => 'nullable|string|max:255',
            'is_active' => 'nullable|boolean',
        ]);

        $data['is_active'] = (bool) ($data['is_active'] ?? true);

        return $data;
    }
}
