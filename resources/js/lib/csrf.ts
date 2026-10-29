/** Read Laravel CSRF / XSRF tokens for raw fetch calls. */

export function readXsrfCookie(): string | null {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
    if (!match?.[1]) return null;
    try {
        return decodeURIComponent(match[1]);
    } catch {
        return match[1];
    }
}

export function readMetaCsrfToken(): string {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
}

export function syncCsrfMeta(token: unknown): void {
    if (typeof token !== 'string' || token === '') return;
    let meta = document.querySelector('meta[name="csrf-token"]');
    if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'csrf-token');
        document.head.appendChild(meta);
    }
    meta.setAttribute('content', token);
}

/** Prefer cookie XSRF, then meta (kept in sync from Inertia props). */
export function csrfToken(): string {
    return readXsrfCookie() ?? readMetaCsrfToken();
}

export function csrfHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        'X-Requested-With': 'XMLHttpRequest',
    };
    const meta = readMetaCsrfToken();
    const xsrf = readXsrfCookie();
    if (meta !== '') {
        headers['X-CSRF-TOKEN'] = meta;
    } else if (xsrf) {
        headers['X-CSRF-TOKEN'] = xsrf;
    }
    if (xsrf) {
        headers['X-XSRF-TOKEN'] = xsrf;
    }
    return headers;
}
