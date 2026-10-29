/**
 * App Icon Badging API & Dynamic Favicon Red Dot Handler
 * Shows a red badge/dot on the installed PWA app icon (Android / iOS 16.4+)
 * and dynamically renders a red notification badge on the website's favicon.
 */

let originalFaviconHref: string | null = null;

export function updateAppBadge(count: number): void {
    if (typeof window === 'undefined') return;

    // 1. Native App Icon Badge (Android Chrome & iOS 16.4+ PWA)
    if ('setAppBadge' in navigator && typeof (navigator as any).setAppBadge === 'function') {
        if (count > 0) {
            (navigator as any).setAppBadge(count).catch(() => {});
        } else {
            (navigator as any).clearAppBadge().catch(() => {});
        }
    }

    // 2. Dynamic Favicon Red Dot Badge
    updateFaviconDot(count > 0);
}

export function clearAppBadge(): void {
    updateAppBadge(0);
}

function updateFaviconDot(hasBadge: boolean): void {
    const favicon = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!favicon) return;

    if (!originalFaviconHref) {
        originalFaviconHref = favicon.href;
    }

    if (!hasBadge) {
        favicon.href = originalFaviconHref;
        return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = originalFaviconHref;

    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw original icon
        ctx.drawImage(img, 0, 0, 32, 32);

        // Draw red badge circle at top-right
        ctx.beginPath();
        ctx.arc(24, 8, 6.5, 0, 2 * Math.PI, false);
        ctx.fillStyle = '#EF4444'; // Red-500
        ctx.fill();

        // White border
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();

        favicon.href = canvas.toDataURL('image/png');
    };
}
