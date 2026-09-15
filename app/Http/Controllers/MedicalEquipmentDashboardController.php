<?php

namespace App\Http\Controllers;

use App\Models\MedicalEquipment;
use App\Models\MedicalEquipmentBorrowing;
use Inertia\Inertia;

class MedicalEquipmentDashboardController extends Controller
{
    public function index()
    {
        $stats = [
            'equipment_total' => MedicalEquipment::where('is_active', true)->count(),
            'equipment_units_total' => (int) MedicalEquipment::where('is_active', true)->sum('quantity_total'),
            'equipment_available' => (int) MedicalEquipment::where('is_active', true)->sum('quantity_available'),
            'equipment_borrowed' => (int) MedicalEquipment::where('is_active', true)
                ->selectRaw('COALESCE(SUM(quantity_total - quantity_available), 0) as borrowed')
                ->value('borrowed'),
            'borrowings_total' => MedicalEquipmentBorrowing::count(),
            'pending' => MedicalEquipmentBorrowing::where('status', 'pending')->count(),
            'borrowed' => MedicalEquipmentBorrowing::whereIn('status', ['borrowed', 'overdue'])->count(),
            'overdue' => MedicalEquipmentBorrowing::where('status', 'overdue')->count(),
            'returned' => MedicalEquipmentBorrowing::where('status', 'returned')->count(),
        ];

        $recentBorrowings = MedicalEquipmentBorrowing::with(['borrower', 'equipment.category'])
            ->latest()
            ->take(8)
            ->get();

        $pendingBorrowings = MedicalEquipmentBorrowing::with(['borrower', 'equipment.category'])
            ->where('status', 'pending')
            ->latest()
            ->take(8)
            ->get();

        $equipmentCatalog = MedicalEquipment::with('category')
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(function (MedicalEquipment $eq) {
                $borrowed = max(0, (int) $eq->quantity_total - (int) $eq->quantity_available);
                $total = (int) $eq->quantity_total;
                $available = (int) $eq->quantity_available;

                return [
                    'id' => $eq->id,
                    'name' => $eq->name,
                    'asset_code' => $eq->asset_code,
                    'brand' => $eq->brand,
                    'location' => $eq->location,
                    'image_url' => $eq->image_url,
                    'unit' => $eq->unit ?: 'ชิ้น',
                    'category' => $eq->category ? [
                        'name' => $eq->category->name,
                        'color' => $eq->category->color,
                    ] : null,
                    'status' => $eq->status,
                    'quantity_total' => $total,
                    'quantity_borrowed' => $borrowed,
                    'quantity_available' => $available,
                    'borrowed_percent' => $total > 0 ? round($borrowed / $total * 100) : 0,
                    'stock_label' => $available === 0
                        ? 'หมดสต็อก'
                        : ($available <= 2 ? 'ใกล้หมด' : 'พร้อมใช้'),
                ];
            })
            ->values();

        return Inertia::render('equipment-borrowing/Dashboard', [
            'stats' => $stats,
            'recentBorrowings' => $recentBorrowings,
            'pendingBorrowings' => $pendingBorrowings,
            'equipmentCatalog' => $equipmentCatalog,
        ]);
    }
}
