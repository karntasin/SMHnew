<?php

namespace App\Services\Im;

use App\Models\Im\Asset;
use Illuminate\Support\Facades\Cache;

class AssetMacLookup
{
    /**
     * Normalize any MAC-ish string to lowercase colon form (aa:bb:cc:dd:ee:ff).
     * Returns null when the value is not a usable 48-bit MAC.
     */
    public static function normalize(?string $mac): ?string
    {
        if ($mac === null) {
            return null;
        }

        $hex = strtolower(preg_replace('/[^a-f0-9]/', '', $mac) ?? '');
        if (strlen($hex) !== 12) {
            return null;
        }

        // Ignore placeholder / broadcast-ish junk often pasted from adapters.
        if ($hex === '000000000000' || $hex === 'ffffffffffff') {
            return null;
        }

        return implode(':', str_split($hex, 2));
    }

    /**
     * @param  list<string|null>  $macs
     * @return array<string, array{
     *   id: int,
     *   asset_code: ?string,
     *   name: ?string,
     *   assigned_user: ?string,
     *   department: ?string,
     *   location: ?string,
     *   status: ?string,
     *   device_type: ?string,
     *   url: string
     * }>
     */
    public function mapByMacs(array $macs): array
    {
        $wanted = [];
        foreach ($macs as $mac) {
            $n = self::normalize(is_string($mac) ? $mac : null);
            if ($n !== null) {
                $wanted[$n] = true;
            }
        }

        if ($wanted === []) {
            return [];
        }

        $index = $this->assetIndex();
        $out = [];
        foreach (array_keys($wanted) as $mac) {
            if (isset($index[$mac])) {
                $out[$mac] = $index[$mac];
            }
        }

        return $out;
    }

    /**
     * @return array{
     *   id: int,
     *   asset_code: ?string,
     *   name: ?string,
     *   assigned_user: ?string,
     *   department: ?string,
     *   location: ?string,
     *   status: ?string,
     *   device_type: ?string,
     *   url: string
     * }|null
     */
    public function findByMac(?string $mac): ?array
    {
        $n = self::normalize($mac);
        if ($n === null) {
            return null;
        }

        return $this->assetIndex()[$n] ?? null;
    }

    public function forgetCache(): void
    {
        Cache::forget('im.asset_mac_index');
    }

    /**
     * @return array<string, array{
     *   id: int,
     *   asset_code: ?string,
     *   name: ?string,
     *   assigned_user: ?string,
     *   department: ?string,
     *   location: ?string,
     *   status: ?string,
     *   device_type: ?string,
     *   url: string
     * }>
     */
    private function assetIndex(): array
    {
        return Cache::remember('im.asset_mac_index', 120, function () {
            $index = [];
            Asset::query()
                ->whereNotNull('mac_address')
                ->where('mac_address', '!=', '')
                ->orderByDesc('updated_at')
                ->get([
                    'id',
                    'asset_code',
                    'name',
                    'mac_address',
                    'assigned_user',
                    'department',
                    'location',
                    'status',
                    'device_type',
                ])
                ->each(function (Asset $asset) use (&$index) {
                    $mac = self::normalize($asset->mac_address);
                    if ($mac === null || isset($index[$mac])) {
                        return;
                    }

                    $index[$mac] = [
                        'id' => (int) $asset->id,
                        'asset_code' => $asset->asset_code,
                        'name' => $asset->name,
                        'assigned_user' => $asset->assigned_user,
                        'department' => $asset->department,
                        'location' => $asset->location,
                        'status' => $asset->status,
                        'device_type' => $asset->device_type,
                        'url' => '/im/resource#asset-'.$asset->id,
                    ];
                });

            return $index;
        });
    }
}
