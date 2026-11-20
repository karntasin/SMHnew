import { router } from '@inertiajs/react';
import { resolveAppUrl } from '@/lib/asset';
import { syncCsrfMeta } from '@/lib/csrf';

function patchRouterMethod(method: 'visit' | 'get' | 'post' | 'put' | 'patch' | 'delete') {
    const original = router[method].bind(router);

    if (method === 'visit') {
        router.visit = ((url, options) => {
            const resolved = typeof url === 'string' ? resolveAppUrl(url) : url;

            return original(resolved as never, options);
        }) as typeof router.visit;

        return;
    }

    router[method] = ((url: string, ...args: unknown[]) => {
        return (original as (...params: unknown[]) => unknown)(resolveAppUrl(url), ...args);
    }) as typeof router[typeof method];
}

function unlockPageAfterOverlay(): void {
    if (typeof document === 'undefined') {
        return;
    }

    document.body.style.removeProperty('pointer-events');
    document.body.style.removeProperty('overflow');
}

/**
 * Patch History.prototype.state to prevent Inertia.js from crashing with:
 * "TypeError: Cannot read properties of null (reading 'page')"
 * when scrolling before Inertia's initial state is written to history.
 */
function patchHistoryState(): void {
    if (typeof window === 'undefined' || typeof History === 'undefined') {
        return;
    }

    try {
        const descriptor = Object.getOwnPropertyDescriptor(History.prototype, 'state');
        if (descriptor && descriptor.get) {
            const originalGet = descriptor.get;
            Object.defineProperty(History.prototype, 'state', {
                get() {
                    const state = originalGet.call(this);
                    if (!state) {
                        return { page: null, scrollRegions: [], documentScrollPosition: { top: 0, left: 0 } };
                    }
                    if (typeof state === 'object' && !('page' in state)) {
                        return {
                            ...state,
                            page: null,
                            scrollRegions: (state as { scrollRegions?: unknown[] }).scrollRegions || [],
                            documentScrollPosition: (state as { documentScrollPosition?: unknown }).documentScrollPosition || { top: 0, left: 0 },
                        };
                    }
                    return state;
                },
                set: descriptor.set,
                configurable: true,
                enumerable: true,
            });
        }
    } catch {
        // Ignore environment restrictions
    }
}

export function configureInertiaBasePath(): void {
    patchHistoryState();
    patchRouterMethod('visit');
    patchRouterMethod('get');
    patchRouterMethod('post');
    patchRouterMethod('put');
    patchRouterMethod('patch');
    patchRouterMethod('delete');

    router.on('finish', unlockPageAfterOverlay);
    router.on('navigate', (event) => {
        unlockPageAfterOverlay();
        const token = (event.detail?.page?.props as { csrf_token?: string } | undefined)?.csrf_token;
        syncCsrfMeta(token);
    });
    router.on('success', (event) => {
        const token = (event.detail?.page?.props as { csrf_token?: string } | undefined)?.csrf_token;
        syncCsrfMeta(token);
    });
}
