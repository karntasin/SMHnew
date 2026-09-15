function getAssetBase(): string {
    const fromMeta = document.querySelector('meta[name="app-base-url"]')?.getAttribute('content');

    if (fromMeta) {
        return fromMeta.replace(/\/$/, '');
    }

    const publicPathMatch = window.location.pathname.match(/^(.*\/public)(?:\/|$)/);

    if (publicPathMatch) {
        return `${window.location.origin}${publicPathMatch[1]}`;
    }

    return window.location.origin;
}

export function getAppBasePath(): string {
    const base = getAssetBase();

    try {
        return new URL(base).pathname.replace(/\/$/, '');
    } catch {
        if (base.startsWith('/')) {
            return base.replace(/\/$/, '');
        }

        return '';
    }
}

/**
 * Convert an app-relative path to a browser path under the Laravel public directory.
 * Safe to call multiple times (idempotent).
 */
export function resolveAppUrl(url: string = ''): string {
    if (!url || url === '#') {
        return url;
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
        try {
            const parsed = new URL(url);
            // Keep external origins untouched.
            if (typeof window !== 'undefined' && parsed.origin !== window.location.origin) {
                const basePath = getAppBasePath();
                const appOrigin = getAssetBase();

                try {
                    if (parsed.origin === new URL(appOrigin).origin) {
                        return resolveAppUrl(parsed.pathname + parsed.search + parsed.hash);
                    }
                } catch {
                    // fall through
                }

                // Different host (e.g. Ziggy APP_URL IP vs localhost): still fix path if it looks like this app.
                if (basePath && (parsed.pathname === basePath || parsed.pathname.startsWith(`${basePath}/`))) {
                    return parsed.pathname + parsed.search + parsed.hash;
                }

                if (basePath && parsed.pathname.startsWith('/') && !parsed.pathname.startsWith(basePath)) {
                    return `${basePath}${parsed.pathname}${parsed.search}${parsed.hash}`;
                }

                return parsed.pathname + parsed.search + parsed.hash;
            }

            return resolveAppUrl(parsed.pathname + parsed.search + parsed.hash);
        } catch {
            return url;
        }
    }

    const basePath = getAppBasePath();
    const hashIndex = url.indexOf('#');
    const hash = hashIndex >= 0 ? url.slice(hashIndex) : '';
    const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
    const [pathname, search = ''] = withoutHash.split('?');
    const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;

    if (basePath && (normalized === basePath || normalized.startsWith(`${basePath}/`))) {
        return `${normalized}${search ? `?${search}` : ''}${hash}`;
    }

    if (!basePath) {
        return `${normalized}${search ? `?${search}` : ''}${hash}`;
    }

    return `${basePath}${normalized}${search ? `?${search}` : ''}${hash}`;
}

export function assetUrl(path: string = ''): string {
    if (!path) {
        return getAssetBase();
    }

    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }

    const resolvedPath = resolveAppUrl(path);

    if (resolvedPath.startsWith('http://') || resolvedPath.startsWith('https://')) {
        return resolvedPath;
    }

    return `${window.location.origin}${resolvedPath}`;
}

export function storageUrl(path: string): string {
    return assetUrl(`storage/${path.replace(/^\//, '')}`);
}

export function normalizeAppPath(url: string): string {
    const base = getAppBasePath();
    let path = url.split('?')[0].split('#')[0];

    if (base && path.startsWith(base)) {
        path = path.slice(base.length) || '/';
    }

    return path.startsWith('/') ? path : `/${path}`;
}

export function appPath(path: string = ''): string {
    return resolveAppUrl(path);
}

export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
    return fetch(resolveAppUrl(input), {
        credentials: 'same-origin',
        ...init,
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            Accept: 'application/json',
            ...(init?.headers || {}),
        },
    });
}

export function isActivePath(currentUrl: string, menuRoute: string): boolean {
    const current = normalizeAppPath(currentUrl);
    const target = normalizeAppPath(menuRoute);

    if (target === '/' || target === '#') {
        return false;
    }

    return current === target || current.startsWith(`${target}/`);
}

function resolveFetchInput(input: RequestInfo | URL): RequestInfo | URL {
    if (typeof input === 'string') {
        return resolveAppUrl(input);
    }

    if (input instanceof URL) {
        if (input.origin !== window.location.origin) {
            return input;
        }

        return new URL(resolveAppUrl(input.pathname + input.search + input.hash), window.location.origin);
    }

    if (typeof Request !== 'undefined' && input instanceof Request) {
        try {
            const parsed = new URL(input.url, window.location.origin);

            if (parsed.origin !== window.location.origin) {
                return input;
            }

            const resolved = resolveAppUrl(parsed.pathname + parsed.search + parsed.hash);

            if (resolved === parsed.pathname + parsed.search + parsed.hash) {
                return input;
            }

            return new Request(`${parsed.origin}${resolved}`, input);
        } catch {
            return input;
        }
    }

    return input;
}

/**
 * Ensure History API URLs keep the subdirectory base path.
 * Prevents browser Back/Forward from landing on /km/... instead of /sss/my-app/public/km/...
 */
export function configureHistoryBasePath(): void {
    if (typeof window === 'undefined') {
        return;
    }

    const marker = '__appHistoryBasePathConfigured';

    if ((window as typeof window & { [marker]?: boolean })[marker]) {
        return;
    }

    (window as typeof window & { [marker]?: boolean })[marker] = true;

    const fixHistoryUrl = (url: string | URL | null | undefined): string | URL | null | undefined => {
        if (url == null || url === '') {
            return url;
        }

        if (typeof url !== 'string') {
            return url;
        }

        if (url.startsWith('http://') || url.startsWith('https://')) {
            try {
                const parsed = new URL(url);

                if (parsed.origin !== window.location.origin) {
                    return url;
                }

                const fixedPath = resolveAppUrl(parsed.pathname + parsed.search + parsed.hash);

                return `${parsed.origin}${fixedPath}`;
            } catch {
                return url;
            }
        }

        if (url.startsWith('/')) {
            return resolveAppUrl(url);
        }

        return url;
    };

    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    window.history.pushState = ((data, unused, url) => {
        return originalPushState(data, unused, fixHistoryUrl(url as string | URL | null | undefined) as string | URL | null | undefined);
    }) as typeof window.history.pushState;

    window.history.replaceState = ((data, unused, url) => {
        return originalReplaceState(data, unused, fixHistoryUrl(url as string | URL | null | undefined) as string | URL | null | undefined);
    }) as typeof window.history.replaceState;
}

export function configureClientBasePath(): void {
    if (typeof window === 'undefined') {
        return;
    }

    const marker = '__appBasePathConfigured';

    if ((window as typeof window & { [marker]?: boolean })[marker]) {
        return;
    }

    (window as typeof window & { [marker]?: boolean })[marker] = true;

    const originalFetch = window.fetch.bind(window);

    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
        return originalFetch(resolveFetchInput(input), init);
    };

    configureHistoryBasePath();
}
