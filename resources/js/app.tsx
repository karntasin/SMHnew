import '../css/app.css';
import { configureClientBasePath } from './lib/asset';
import { configureInertiaBasePath } from './lib/inertia';
import { configureRouteHelper } from './lib/route';
import './lib/axios';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { route as routeFn } from 'ziggy-js';
import { initializeTheme } from './hooks/use-appearance';

configureClientBasePath();
configureInertiaBasePath();
configureRouteHelper();

declare global {
    const route: typeof routeFn;
}

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

const appElement = document.getElementById('app');
if (appElement) {
    createInertiaApp({
        title: (title) => `${title} - ${appName}`,
        resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
        setup({ el, App, props }) {
            const root = createRoot(el);
            root.render(<App {...props} />);
        },
        progress: {
            color: '#4B5563',
        },
    });
}

initializeTheme();

window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    window.location.reload();
});

import Alpine from 'alpinejs';
window.Alpine = Alpine;
Alpine.start();
