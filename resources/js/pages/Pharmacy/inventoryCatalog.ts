import { router } from '@inertiajs/react';
import { getAppBasePath } from '@/lib/asset';

export type InventoryCatalog = 'drug' | 'nondrug';

let sharedCatalog: InventoryCatalog | null = null;

function readCatalog(props: unknown): InventoryCatalog | null {
    const value = (props as { inventoryCatalog?: unknown } | null)?.inventoryCatalog;

    return value === 'nondrug' || value === 'drug' ? value : null;
}

if (typeof window !== 'undefined') {
    const raw = document.getElementById('app')?.getAttribute('data-page');
    if (raw) {
        try {
            sharedCatalog = readCatalog(JSON.parse(raw).props);
        } catch {
            sharedCatalog = null;
        }
    }

    const remember = (event: { detail: { page: { props: unknown } } }) => {
        sharedCatalog = readCatalog(event.detail.page.props);
    };
    router.on('success', remember);
    router.on('navigate', remember);
}

function catalogFromPath(): InventoryCatalog | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const base = getAppBasePath();
    const path = window.location.pathname;
    const relative = base && path.startsWith(base) ? path.slice(base.length) || '/' : path;

    if (relative.startsWith('/pharmacy/supplies')) {
        return 'nondrug';
    }
    if (relative.startsWith('/pharmacy/inventory')) {
        return 'drug';
    }

    return null;
}

export function warehouseSupply(): boolean {
    return (catalogFromPath() ?? sharedCatalog) === 'nondrug';
}

export function warehouseHome(): string {
    return warehouseSupply() ? 'คลังเวชภัณฑ์มิใช่ยา' : 'คลังยา / ห้องยา';
}

export function warehouseActive(): 'pharmacy.supplies.index' | 'pharmacy.inventory.index' {
    return warehouseSupply() ? 'pharmacy.supplies.index' : 'pharmacy.inventory.index';
}

export function warehouseNoun(): string {
    return warehouseSupply() ? 'เวชภัณฑ์' : 'ยา';
}

export function wh(name: string, params?: unknown): string {
    const prefix = warehouseSupply() ? 'pharmacy.supplies.' : 'pharmacy.inventory.';

    return route(prefix + name, params as never);
}
