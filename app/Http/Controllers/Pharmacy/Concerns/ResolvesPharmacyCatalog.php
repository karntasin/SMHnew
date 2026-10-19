<?php

namespace App\Http\Controllers\Pharmacy\Concerns;

use App\Models\Pharmacy\PharmacyLocation;
use Illuminate\Database\Eloquent\Builder;

trait ResolvesPharmacyCatalog
{
    protected function catalog(): string
    {
        $name = (string) request()->route()?->getName();

        return str_starts_with($name, 'pharmacy.supplies.') ? 'nondrug' : 'drug';
    }

    protected function catalogRoute(string $name): string
    {
        $prefix = $this->catalog() === 'nondrug' ? 'pharmacy.supplies.' : 'pharmacy.inventory.';

        return $prefix.$name;
    }

    protected function catalogLocations(bool $includeStocked = false): Builder
    {
        $catalog = $this->catalog();
        $query = PharmacyLocation::query()->where('is_active', true)->orderBy('sort_order');

        if (! $includeStocked) {
            return $query->where('catalog', $catalog);
        }

        return $query->where(function (Builder $inner) use ($catalog) {
            $inner->where('catalog', $catalog)
                ->orWhereHas('balances', fn (Builder $balance) => $balance
                    ->where('qty_on_hand', '>', 0)
                    ->whereHas(
                        'item',
                        fn (Builder $item) => $item->ofCatalog($catalog)
                    ));
        });
    }
};
