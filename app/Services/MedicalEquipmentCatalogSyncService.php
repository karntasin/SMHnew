<?php

namespace App\Services;

use App\Data\MedicalEquipmentCatalog;
use App\Models\MedicalEquipment;
use App\Models\MedicalEquipmentCategory;
use App\Support\TlsCaBundle;
use Illuminate\Support\Facades\Http;

class MedicalEquipmentCatalogSyncService
{
    public function sync(bool $refreshImages = false): array
    {
        $this->ensureCategories();

        $stats = ['created' => 0, 'updated' => 0, 'images' => 0, 'image_failed' => []];

        foreach (MedicalEquipmentCatalog::items() as $item) {
            $category = MedicalEquipmentCategory::query()->where('name', $item['category'])->first();
            $equipment = MedicalEquipment::withTrashed()->where('catalog_key', $item['key'])->first();

            $payload = [
                'catalog_key' => $item['key'],
                'asset_code' => $item['code'],
                'name' => $item['name'],
                'unit' => $item['unit'],
                'category_id' => $category?->id,
                'location' => $item['location'],
                'notes' => $item['notes'],
                'sort_order' => $item['sort'],
                'status' => 'available',
                'is_active' => true,
                'deleted_at' => null,
            ];

            if (! $equipment) {
                $equipment = MedicalEquipment::create([
                    ...$payload,
                    'quantity_total' => MedicalEquipmentCatalog::INITIAL_QTY,
                    'quantity_available' => MedicalEquipmentCatalog::INITIAL_QTY,
                ]);
                $stats['created']++;
            } else {
                if ($equipment->trashed()) {
                    $equipment->restore();
                }
                $equipment->fill($payload);
                if ((int) $equipment->quantity_total < 1) {
                    $equipment->quantity_total = MedicalEquipmentCatalog::INITIAL_QTY;
                    $equipment->quantity_available = MedicalEquipmentCatalog::INITIAL_QTY;
                }
                $equipment->save();
                $stats['updated']++;
            }

            $needsImage = $refreshImages || ! $equipment->image_path || ! $this->imageExists($equipment->image_path);
            if ($needsImage) {
                $path = $this->downloadFirstAvailable($item['key'], $item['images']);
                if ($path) {
                    $equipment->update(['image_path' => $path]);
                    $stats['images']++;
                } else {
                    $stats['image_failed'][] = $item['name'];
                }
            }
        }

        return $stats;
    }

    private function ensureCategories(): void
    {
        foreach (MedicalEquipmentCatalog::categories() as $cat) {
            MedicalEquipmentCategory::firstOrCreate(
                ['name' => $cat['name']],
                [
                    'icon' => $cat['icon'],
                    'color' => $cat['color'],
                    'sort_order' => $cat['sort'],
                    'is_active' => true,
                ]
            );
        }
    }

    private function imageExists(string $path): bool
    {
        $absolute = public_path($path);
        if (is_file($absolute)) {
            return true;
        }

        return is_file(storage_path('app/public/'.$path));
    }

    /**
     * @param  list<string>  $urls
     */
    private function downloadFirstAvailable(string $key, array $urls): ?string
    {
        $dir = public_path('images/medical-equipment');
        if (! is_dir($dir) && ! mkdir($dir, 0775, true) && ! is_dir($dir)) {
            return null;
        }

        $ca = TlsCaBundle::path();
        foreach ($urls as $url) {
            if (! str_starts_with($url, 'http://') && ! str_starts_with($url, 'https://')) {
                $relative = ltrim($url, '/');
                if (is_file(public_path($relative))) {
                    return $relative;
                }

                continue;
            }
            try {
                $http = Http::timeout(25)
                    ->withHeaders(['User-Agent' => 'FSHH-MedicalEquipmentCatalog/1.0 (hospital inventory; Wikimedia reuse)'])
                    ->withOptions(['allow_redirects' => true]);
                if ($ca) {
                    $http = $http->withOptions(['verify' => $ca]);
                }
                $response = $http->get($url);
                if (! $response->successful()) {
                    continue;
                }
                $body = $response->body();
                if (strlen($body) < 2000) {
                    continue;
                }
                $mime = strtolower((string) $response->header('Content-Type'));
                if (str_contains($mime, 'html') || str_contains($mime, 'json') || str_contains($mime, 'xml')) {
                    continue;
                }
                if (! str_contains($mime, 'image/') && ! $this->looksLikeImage($body)) {
                    continue;
                }
                $ext = str_contains($mime, 'png') || str_starts_with($body, "\x89PNG") ? 'png' : 'jpg';
                $relative = 'images/medical-equipment/'.$key.'.'.$ext;
                file_put_contents(public_path($relative), $body);

                return $relative;
            } catch (\Throwable) {
                continue;
            }
        }

        return null;
    }

    private function looksLikeImage(string $body): bool
    {
        return str_starts_with($body, "\xFF\xD8\xFF")
            || str_starts_with($body, "\x89PNG")
            || str_starts_with($body, 'GIF8')
            || str_starts_with($body, 'RIFF');
    }
}
