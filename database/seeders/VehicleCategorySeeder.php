<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\VehicleCategory;

class VehicleCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            [
                'name' => 'รถเก๋ง (Sedan)',
                'icon' => 'car',
                'color' => '#3b82f6',
                'description' => 'รถยนต์นั่งส่วนบุคคล 4 ที่นั่ง',
                'order' => 1,
            ],
            [
                'name' => 'รถตู้ (Van)',
                'icon' => 'bus',
                'color' => '#f59e0b',
                'description' => 'รถตู้โดยสาร 10-13 ที่นั่ง',
                'order' => 2,
            ],
            [
                'name' => 'รถกระบะ (Pickup)',
                'icon' => 'truck',
                'color' => '#10b981',
                'description' => 'รถกระบะสำหรับขนของ',
                'order' => 3,
            ],
            [
                'name' => 'รถพยาบาล (Ambulance)',
                'icon' => 'ambulance',
                'color' => '#ef4444',
                'description' => 'รถพยาบาลฉุกเฉิน',
                'order' => 4,
            ],
        ];

        foreach ($categories as $category) {
            VehicleCategory::firstOrCreate(
                ['name' => $category['name']],
                $category
            );
        }
    }
}
