import { router } from '@inertiajs/react';
import { resolveAppUrl } from '@/lib/asset';

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

export function configureInertiaBasePath(): void {
    patchRouterMethod('visit');
    patchRouterMethod('get');
    patchRouterMethod('post');
    patchRouterMethod('put');
    patchRouterMethod('patch');
    patchRouterMethod('delete');

    router.on('finish', unlockPageAfterOverlay);
    router.on('navigate', unlockPageAfterOverlay);
}
