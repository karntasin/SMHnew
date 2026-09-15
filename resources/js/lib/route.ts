import { resolveAppUrl } from '@/lib/asset';

type RouteHelper = typeof route;

export function configureRouteHelper(): void {
    if (typeof window === 'undefined' || typeof route === 'undefined') {
        return;
    }

    const marker = '__routeHelperConfigured';

    if ((window as typeof window & { [marker]?: boolean })[marker]) {
        return;
    }

    (window as typeof window & { [marker]?: boolean })[marker] = true;

    const originalRoute = route as RouteHelper;

    (globalThis as typeof globalThis & { route: RouteHelper }).route = ((...args: Parameters<RouteHelper>) => {
        const result = originalRoute(...args);

        return typeof result === 'string' ? resolveAppUrl(result) : result;
    }) as RouteHelper;
}
